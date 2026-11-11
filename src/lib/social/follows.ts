import "server-only"
import { and, count, desc, eq } from "drizzle-orm"
import { Effect, Schema } from "effect"
import { logActivity } from "@/lib/activity"
import { follows, users } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { NotFoundError, ValidationError } from "@/lib/effect/errors"
import { validate } from "@/lib/effect/validation"
import { attachCovers, memberRowSelect, toMemberSummary } from "./members"
import { avatarGames } from "./sql"
import type { FollowResult } from "./types"

export const FollowInput = Schema.Struct({
  userId: Schema.Trim.check(
    Schema.isMinLength(1, { message: "Missing user" }),
    Schema.isMaxLength(64, { message: "Invalid user" }),
  ),
})

/** Does `viewerId` follow `userId`? */
export const isFollowing = (viewerId: string, userId: string) =>
  dbQuery("social.isFollowing", (db) =>
    db
      .select({ one: follows.followerId })
      .from(follows)
      .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, userId)))
      .limit(1),
  ).pipe(Effect.map((rows) => rows.length > 0))

export const countFollowers = (userId: string) =>
  dbQuery("social.countFollowers", (db) =>
    db.select({ n: count() }).from(follows).where(eq(follows.followingId, userId)),
  ).pipe(Effect.map((rows) => Number(rows[0]?.n ?? 0)))

export const countFollowing = (userId: string) =>
  dbQuery("social.countFollowing", (db) =>
    db.select({ n: count() }).from(follows).where(eq(follows.followerId, userId)),
  ).pipe(Effect.map((rows) => Number(rows[0]?.n ?? 0)))

const findTarget = (userId: string) =>
  dbQuery("social.findTarget", (db) =>
    db.select({ id: users.id, username: users.username }).from(users).where(eq(users.id, userId)).limit(1),
  ).pipe(
    Effect.flatMap((rows) =>
      rows[0]
        ? Effect.succeed(rows[0])
        : Effect.fail(new NotFoundError({ message: "That player no longer exists", entity: "user" })),
    ),
  )

/** Follow a user. Idempotent; you can't follow yourself. Logs a "followed" activity once. */
export const followUser = (followerId: string, raw: unknown) =>
  Effect.gen(function* () {
    const { userId } = yield* validate(FollowInput, raw)
    if (userId === followerId) {
      return yield* new ValidationError({ message: "You can't follow yourself" })
    }
    const target = yield* findTarget(userId)
    const inserted = yield* dbQuery("social.follow", (db) =>
      db
        .insert(follows)
        .values({ followerId, followingId: target.id })
        .onConflictDoNothing()
        .returning({ id: follows.followingId }),
    )
    if (inserted.length > 0) {
      yield* logActivity({ userId: followerId, kind: "followed", targetUserId: target.id })
    }
    const followers = yield* countFollowers(target.id)
    const result: FollowResult = { following: true, followers, username: target.username }
    return result
  })

/** Unfollow a user. Idempotent. */
export const unfollowUser = (followerId: string, raw: unknown) =>
  Effect.gen(function* () {
    const { userId } = yield* validate(FollowInput, raw)
    if (userId === followerId) {
      return yield* new ValidationError({ message: "You can't unfollow yourself" })
    }
    const target = yield* findTarget(userId)
    yield* dbQuery("social.unfollow", (db) =>
      db.delete(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, target.id))),
    )
    const followers = yield* countFollowers(target.id)
    const result: FollowResult = { following: false, followers, username: target.username }
    return result
  })

/** People who follow `userId` (newest first) with the viewer's follow state. */
export const listFollowers = (userId: string, viewerId: string | null, limit = 200) =>
  dbQuery("social.followers", (db) =>
    db
      .select(memberRowSelect(viewerId))
      .from(follows)
      .innerJoin(users, eq(users.id, follows.followerId))
      .leftJoin(avatarGames, eq(avatarGames.id, users.avatarGameId))
      .where(eq(follows.followingId, userId))
      .orderBy(desc(follows.createdAt))
      .limit(limit),
  ).pipe(
    Effect.map((rows) => rows.map((r) => toMemberSummary(r, viewerId))),
    Effect.flatMap(attachCovers),
  )

/** People `userId` follows (newest first) with the viewer's follow state. */
export const listFollowing = (userId: string, viewerId: string | null, limit = 200) =>
  dbQuery("social.following", (db) =>
    db
      .select(memberRowSelect(viewerId))
      .from(follows)
      .innerJoin(users, eq(users.id, follows.followingId))
      .leftJoin(avatarGames, eq(avatarGames.id, users.avatarGameId))
      .where(eq(follows.followerId, userId))
      .orderBy(desc(follows.createdAt))
      .limit(limit),
  ).pipe(
    Effect.map((rows) => rows.map((r) => toMemberSummary(r, viewerId))),
    Effect.flatMap(attachCovers),
  )
