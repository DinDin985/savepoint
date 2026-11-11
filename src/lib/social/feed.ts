import "server-only"
import { and, desc, eq, exists, inArray, isNotNull, lt, ne, or, type SQL } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"
import { Effect, Schema } from "effect"
import { activities, follows, games, reviews, users } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { validate } from "@/lib/effect/validation"
import { getGameSummariesByIds } from "@/lib/games/core"
import { timeAgo } from "@/lib/format"
import { topGameIdsForUsers } from "./members"
import { avatarGames } from "./sql"
import { dayKeyOf, dayLabelOf } from "./time"
import type { FeedCursor, FeedItem, FeedPage } from "./types"

const targetUsers = alias(users, "target_users")
const targetAvatarGames = alias(games, "target_avatar_games")
/** `follows` again, for the "is this follow still active?" check (distinct from the actor filter). */
const activeFollows = alias(follows, "active_follows")

export const FEED_PAGE_SIZE = 30

export const FeedCursorInput = Schema.Struct({
  beforeId: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
  beforeTime: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  includeOwn: Schema.Boolean,
})

const snippet = (body: string, max = 240) => {
  const clean = body.replace(/\s+/g, " ").trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

/** Kinds that only make sense with a game attached. */
const GAME_KINDS = ["rated", "reviewed", "played", "playing", "wishlisted", "liked"] as const

/**
 * Friends activity: events from people `viewerId` follows (optionally plus their
 * own), newest first, keyset-paginated by (createdAt, id).
 *
 * Ordered by time rather than id because `logActivity` refreshes the timestamp of
 * a repeated event instead of inserting a new one. Events that can no longer be
 * rendered are filtered in SQL (so pages are always full):
 *  - review events whose review was deleted,
 *  - follow events for follows that have since been undone,
 *  - game events without a game.
 */
export const getFeed = (
  viewerId: string,
  options: { includeOwn?: boolean; before?: FeedCursor | null; limit?: number } = {},
) =>
  Effect.gen(function* () {
    const limit = Math.min(Math.max(options.limit ?? FEED_PAGE_SIZE, 1), 100)
    const before = options.before ?? null
    const rows = yield* dbQuery("social.feed", (db) => {
      const followed = db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, viewerId))
      const actors: SQL = options.includeOwn
        ? or(inArray(activities.userId, followed), eq(activities.userId, viewerId))!
        : inArray(activities.userId, followed)
      const stillFollowing = exists(
        db
          .select({ one: activeFollows.followerId })
          .from(activeFollows)
          .where(
            and(eq(activeFollows.followerId, activities.userId), eq(activeFollows.followingId, activities.targetUserId)),
          ),
      )
      const renderable = and(
        or(ne(activities.kind, "reviewed"), isNotNull(reviews.id)),
        or(ne(activities.kind, "followed"), and(isNotNull(targetUsers.id), stillFollowing)),
        or(inArray(activities.kind, ["followed", "top_games"]), isNotNull(activities.gameId)),
      )
      const page = before
        ? or(
            lt(activities.createdAt, new Date(before.beforeTime)),
            and(eq(activities.createdAt, new Date(before.beforeTime)), lt(activities.id, before.beforeId)),
          )
        : undefined
      return db
        .select({
          id: activities.id,
          kind: activities.kind,
          gameId: activities.gameId,
          rating: activities.rating,
          createdAt: activities.createdAt,
          actorId: users.id,
          actorUsername: users.username,
          actorDisplayName: users.displayName,
          actorHue: users.avatarHue,
          actorAvatar: avatarGames.coverImage,
          targetId: targetUsers.id,
          targetUsername: targetUsers.username,
          targetDisplayName: targetUsers.displayName,
          targetHue: targetUsers.avatarHue,
          targetAvatar: targetAvatarGames.coverImage,
          reviewBody: reviews.body,
          reviewRecommended: reviews.recommended,
          reviewSpoilers: reviews.containsSpoilers,
        })
        .from(activities)
        .innerJoin(users, eq(users.id, activities.userId))
        .leftJoin(avatarGames, eq(avatarGames.id, users.avatarGameId))
        .leftJoin(targetUsers, eq(targetUsers.id, activities.targetUserId))
        .leftJoin(targetAvatarGames, eq(targetAvatarGames.id, targetUsers.avatarGameId))
        .leftJoin(
          reviews,
          and(
            eq(activities.kind, "reviewed"),
            eq(reviews.userId, activities.userId),
            eq(reviews.gameId, activities.gameId),
          ),
        )
        .where(and(actors, renderable, page))
        .orderBy(desc(activities.createdAt), desc(activities.id))
        .limit(limit + 1)
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows

    const gameIds = [...new Set(page.flatMap((r) => (r.gameId ? [r.gameId] : [])))]
    const topActors = [...new Set(page.filter((r) => r.kind === "top_games").map((r) => r.actorId))]
    const topIds = yield* topGameIdsForUsers(topActors, 5)
    const allGameIds = [...new Set([...gameIds, ...[...topIds.values()].flat()])]
    const summaries = yield* getGameSummariesByIds(allGameIds)
    const byId = new Map(summaries.map((g) => [g.id, g]))

    const now = new Date()
    const items = page.flatMap((r): FeedItem[] => {
      const game = r.gameId ? (byId.get(r.gameId) ?? null) : null
      // defensive: the FK cascade normally removes events whose game is gone
      if ((GAME_KINDS as readonly string[]).includes(r.kind) && !game) return []
      const created = r.createdAt
      return [
        {
          id: r.id,
          kind: r.kind,
          createdAt: created.getTime(),
          timeLabel: timeAgo(created),
          dayKey: dayKeyOf(created),
          dayLabel: dayLabelOf(created, now),
          actor: {
            id: r.actorId,
            username: r.actorUsername,
            displayName: r.actorDisplayName,
            avatarHue: r.actorHue,
            avatarImage: r.actorAvatar ?? null,
          },
          target:
            r.targetId && r.targetUsername && r.targetDisplayName !== null && r.targetHue !== null
              ? {
                  id: r.targetId,
                  username: r.targetUsername,
                  displayName: r.targetDisplayName,
                  avatarHue: r.targetHue,
                  avatarImage: r.targetAvatar ?? null,
                }
              : null,
          game,
          rating: r.rating,
          review:
            r.kind === "reviewed" && r.reviewBody !== null
              ? {
                  snippet: snippet(r.reviewBody),
                  recommended: Boolean(r.reviewRecommended),
                  containsSpoilers: Boolean(r.reviewSpoilers),
                }
              : null,
          topGames:
            r.kind === "top_games"
              ? (topIds.get(r.actorId) ?? []).flatMap((id) => {
                  const g = byId.get(id)
                  return g ? [g] : []
                })
              : [],
        },
      ]
    })

    const last = page[page.length - 1]
    const result: FeedPage = {
      items,
      nextCursor: hasMore && last ? { beforeId: last.id, beforeTime: last.createdAt.getTime() } : null,
    }
    return result
  })

/** Validated "load more" entry point for the server action. */
export const getFeedPage = (viewerId: string, raw: unknown) =>
  Effect.gen(function* () {
    const input = yield* validate(FeedCursorInput, raw)
    return yield* getFeed(viewerId, {
      includeOwn: input.includeOwn,
      before: { beforeId: input.beforeId, beforeTime: input.beforeTime },
    })
  })
