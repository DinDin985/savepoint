import "server-only"
import { createHash, randomBytes } from "node:crypto"
import { and, eq, gt, lt } from "drizzle-orm"
import { Effect } from "effect"
import { cookies } from "next/headers"
import { games, sessions, users } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"

export const SESSION_COOKIE = "savepoint_session"
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** Public, serialisable view of the signed-in user. */
export type SessionUser = {
  readonly id: string
  readonly username: string
  readonly displayName: string
  readonly email: string
  readonly avatarHue: number
  /** cover art URL when the user picked a game as avatar */
  readonly avatarImage: string | null
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

/** Creates a DB session and returns the raw token (only ever stored in the cookie). */
export const createSession = (userId: string) =>
  Effect.gen(function* () {
    const token = randomBytes(32).toString("base64url")
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
    yield* dbQuery("sessions.create", async (db) => {
      // opportunistic cleanup of this user's expired sessions
      await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())))
      await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt })
    })
    return { token, expiresAt }
  })

export const deleteSession = (token: string) =>
  dbQuery("sessions.delete", (db) => db.delete(sessions).where(eq(sessions.id, hashToken(token))))

/** Looks up a session token → user (null when missing/expired). */
export const validateSessionToken = (token: string) =>
  Effect.gen(function* () {
    const rows = yield* dbQuery("sessions.validate", (db) =>
      db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
          avatarHue: users.avatarHue,
          avatarImage: games.coverImage,
        })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .leftJoin(games, eq(games.id, users.avatarGameId))
        .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
        .limit(1),
    )
    const row = rows[0]
    if (!row) return null
    const user: SessionUser = {
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      email: row.email,
      avatarHue: row.avatarHue,
      avatarImage: row.avatarImage ?? null,
    }
    return user
  })

/* ── Cookie helpers (only callable from Server Actions / Route Handlers) ── */

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function readSessionCookie(): Promise<string | undefined> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value
}
