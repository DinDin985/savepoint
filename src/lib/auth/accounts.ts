import "server-only"
import { randomUUID } from "node:crypto"
import { eq, or } from "drizzle-orm"
import { Effect, Schema } from "effect"
import { users } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { ConflictError, ValidationError } from "@/lib/effect/errors"
import { validate } from "@/lib/effect/validation"
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password"
import { createSession } from "./session"

const RESERVED = new Set([
  "admin", "root", "savepoint", "settings", "sign-in", "sign-up", "signin", "signup", "api", "pro", "games",
  "members", "feed", "u", "me", "support", "help", "null", "undefined",
])

export const SignUpInput = Schema.Struct({
  username: Schema.Trim.check(
    Schema.isMinLength(3, { message: "Username must be at least 3 characters" }),
    Schema.isMaxLength(20, { message: "Username must be at most 20 characters" }),
    Schema.isPattern(/^[a-zA-Z0-9_]+$/, { message: "Use only letters, numbers and underscores" }),
  ),
  email: Schema.Trim.check(
    Schema.isMaxLength(254, { message: "Email is too long" }),
    Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: "Enter a valid email address" }),
  ),
  displayName: Schema.Trim.check(Schema.isMaxLength(40, { message: "Display name must be at most 40 characters" })),
  password: Schema.String.check(
    Schema.isMinLength(8, { message: "Password must be at least 8 characters" }),
    Schema.isMaxLength(200, { message: "Password is too long" }),
  ),
})

export const SignInInput = Schema.Struct({
  identifier: Schema.Trim.check(Schema.isMinLength(1, { message: "Enter your email or username" })),
  password: Schema.String.check(Schema.isMinLength(1, { message: "Enter your password" })),
})

/** Validates, creates the account and opens a session. */
export const signUp = (raw: unknown) =>
  Effect.gen(function* () {
    const input = yield* validate(SignUpInput, raw)
    const username = input.username.toLowerCase()
    const email = input.email.toLowerCase()

    if (RESERVED.has(username)) {
      return yield* new ValidationError({
        message: "That username is reserved",
        fieldErrors: { username: "That username is reserved" },
      })
    }
    if (!/[a-zA-Z]/.test(input.password) || !/[0-9]/.test(input.password)) {
      return yield* new ValidationError({
        message: "Password must contain a letter and a number",
        fieldErrors: { password: "Password must contain a letter and a number" },
      })
    }

    const existing = yield* dbQuery("users.findDuplicate", (db) =>
      db
        .select({ username: users.username, email: users.email })
        .from(users)
        .where(or(eq(users.username, username), eq(users.email, email))),
    )
    if (existing.some((u) => u.username === username)) {
      return yield* new ConflictError({ message: "That username is already taken", field: "username" })
    }
    if (existing.some((u) => u.email === email)) {
      return yield* new ConflictError({ message: "An account with that email already exists", field: "email" })
    }

    const passwordHash = yield* hashPassword(input.password)
    const id = randomUUID()
    yield* dbQuery("users.insert", (db) =>
      db.insert(users).values({
        id,
        username,
        email,
        passwordHash,
        displayName: input.displayName || input.username,
        avatarHue: hueFor(username),
      }),
    )
    const session = yield* createSession(id)
    return { userId: id, username, ...session }
  }).pipe(
    // surface conflicts as inline field errors too
    Effect.catchTag("ConflictError", (e) =>
      Effect.fail(new ValidationError({ message: e.message, fieldErrors: e.field ? { [e.field]: e.message } : undefined })),
    ),
  )

/** Email-or-username + password → session. Same error for unknown user / wrong password. */
export const signIn = (raw: unknown) =>
  Effect.gen(function* () {
    const input = yield* validate(SignInInput, raw)
    const identifier = input.identifier.toLowerCase()
    const rows = yield* dbQuery("users.findForSignIn", (db) =>
      db
        .select({ id: users.id, username: users.username, passwordHash: users.passwordHash })
        .from(users)
        .where(or(eq(users.email, identifier), eq(users.username, identifier)))
        .limit(1),
    )
    const user = rows[0]
    const invalid = new ValidationError({
      message: "Incorrect email/username or password",
      fieldErrors: { password: "Incorrect email/username or password" },
    })
    if (!user) {
      yield* burnPasswordCheck(input.password)
      return yield* invalid
    }
    const ok = yield* verifyPassword(input.password, user.passwordHash)
    if (!ok) return yield* invalid
    const session = yield* createSession(user.id)
    return { userId: user.id, username: user.username, ...session }
  })

function hueFor(seed: string): number {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}
