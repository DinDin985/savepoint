import "server-only"
import { eq, inArray } from "drizzle-orm"
import { Effect, Schema } from "effect"
import { logActivity } from "@/lib/activity"
import { games, topGames, users } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { NotFoundError, ValidationError } from "@/lib/effect/errors"
import { NonEmptyTrimmed, validate } from "@/lib/effect/validation"
import { PROFILE_LIMITS, TOP_GAMES_MAX } from "./types"

const OptionalId = Schema.optional(
  Schema.Trim.check(Schema.isPattern(/^\d{0,10}$/, { message: "Pick a game from the list" })),
)

export const ProfileInput = Schema.Struct({
  displayName: NonEmptyTrimmed("Display name", PROFILE_LIMITS.displayName),
  bio: Schema.optional(
    Schema.Trim.check(
      Schema.isMaxLength(PROFILE_LIMITS.bio, { message: `Bio must be at most ${PROFILE_LIMITS.bio} characters` }),
    ),
  ),
  location: Schema.optional(
    Schema.Trim.check(
      Schema.isMaxLength(PROFILE_LIMITS.location, {
        message: `Location must be at most ${PROFILE_LIMITS.location} characters`,
      }),
    ),
  ),
  avatarGameId: OptionalId,
  bannerGameId: OptionalId,
  avatarHue: Schema.optional(
    Schema.Trim.check(Schema.isPattern(/^\d{0,3}$/, { message: "Pick a colour from the list" })),
  ),
})

const toId = (value: string | undefined): number | null => {
  if (!value) return null
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** Updates the signed-in user's own profile. Returns their username. */
export const updateProfile = (userId: string, raw: unknown) =>
  Effect.gen(function* () {
    const input = yield* validate(ProfileInput, raw)
    const avatarGameId = toId(input.avatarGameId)
    const bannerGameId = toId(input.bannerGameId)

    let avatarHue: number | undefined
    if (input.avatarHue) {
      const hue = Number(input.avatarHue)
      if (!Number.isInteger(hue) || hue < 0 || hue > 359) {
        return yield* new ValidationError({
          message: "Pick a colour from the list",
          fieldErrors: { avatarHue: "Pick a colour from the list" },
        })
      }
      avatarHue = hue
    }

    const ids = [avatarGameId, bannerGameId].filter((id): id is number => id !== null)
    if (ids.length) {
      const found = yield* dbQuery("profile.validateGames", (db) =>
        db.select({ id: games.id }).from(games).where(inArray(games.id, ids)),
      )
      const known = new Set(found.map((g) => g.id))
      const fieldErrors: Record<string, string> = {}
      if (avatarGameId !== null && !known.has(avatarGameId)) fieldErrors.avatarGameId = "That game no longer exists"
      if (bannerGameId !== null && !known.has(bannerGameId)) fieldErrors.bannerGameId = "That game no longer exists"
      if (Object.keys(fieldErrors).length) {
        return yield* new ValidationError({ message: Object.values(fieldErrors)[0]!, fieldErrors })
      }
    }

    const updated = yield* dbQuery("profile.update", (db) =>
      db
        .update(users)
        .set({
          displayName: input.displayName,
          bio: input.bio ?? "",
          location: input.location ? input.location : null,
          avatarGameId,
          bannerGameId,
          ...(avatarHue === undefined ? {} : { avatarHue }),
        })
        .where(eq(users.id, userId))
        .returning({ username: users.username }),
    )
    const row = updated[0]
    if (!row) return yield* new NotFoundError({ message: "Your account could not be found", entity: "user" })
    return { username: row.username }
  })

export const TopGamesInput = Schema.Struct({
  gameIds: Schema.Array(
    Schema.Number.check(Schema.isInt({ message: "Invalid game" }), Schema.isGreaterThanOrEqualTo(1, { message: "Invalid game" })),
  ).check(
    Schema.isMaxLength(TOP_GAMES_MAX, { message: `Your Top 10 can hold at most ${TOP_GAMES_MAX} games` }),
    Schema.isUnique({ message: "Each game can only appear once in your Top 10" }),
  ),
})

/**
 * Atomically replaces the user's Top 10 (delete + inserts in one batch).
 * Positions follow the array order (1-based).
 */
export const replaceTopGames = (userId: string, raw: unknown) =>
  Effect.gen(function* () {
    const { gameIds } = yield* validate(TopGamesInput, raw)
    if (gameIds.length) {
      const found = yield* dbQuery("topGames.validate", (db) =>
        db.select({ id: games.id }).from(games).where(inArray(games.id, [...gameIds])),
      )
      if (found.length !== gameIds.length) {
        return yield* new ValidationError({
          message: "Some of those games no longer exist. Refresh and try again.",
          fieldErrors: { gameIds: "Some of those games no longer exist" },
        })
      }
    }
    yield* dbQuery("topGames.replace", async (db) => {
      const clear = db.delete(topGames).where(eq(topGames.userId, userId))
      if (gameIds.length === 0) {
        await clear
        return
      }
      await db.batch([
        clear,
        db.insert(topGames).values(gameIds.map((gameId, i) => ({ userId, gameId, position: i + 1 }))),
      ])
    })
    if (gameIds.length) yield* logActivity({ userId, kind: "top_games" })
    return { count: gameIds.length }
  })
