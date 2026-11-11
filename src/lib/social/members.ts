import "server-only"
import { and, asc, desc, eq, inArray, lte, ne, notExists, or, sql } from "drizzle-orm"
import { Effect } from "effect"
import { follows, libraryEntries, topGames, users } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { getGameSummariesByIds, type GameSummary } from "@/lib/games/core"
import {
  avatarGames,
  escapeLike,
  followersCountSql,
  gamesCountSql,
  loggedCondition,
  publicUserSelect,
  reviewsCountSql,
  toPublicUser,
  viewerFollowsSql,
} from "./sql"
import type { MemberSummary } from "./types"

/** Select shape for member cards / rows (requires `users` + `avatarGames` in the query). */
export const memberRowSelect = (viewerId: string | null) =>
  ({
    ...publicUserSelect,
    bio: users.bio,
    gamesCount: gamesCountSql,
    reviewsCount: reviewsCountSql,
    followersCount: followersCountSql,
    viewerFollows: viewerFollowsSql(viewerId),
  }) as const

type MemberRowRaw = {
  id: string
  username: string
  displayName: string
  avatarHue: number
  avatarImage: string | null
  bio: string
  gamesCount: number
  reviewsCount: number
  followersCount: number
  viewerFollows: number | boolean
}

export type MemberWithoutCovers = Omit<MemberSummary, "covers">

export const toMemberSummary = (r: MemberRowRaw, viewerId: string | null): MemberWithoutCovers => ({
  ...toPublicUser(r),
  bio: r.bio,
  gamesCount: Number(r.gamesCount),
  reviewsCount: Number(r.reviewsCount),
  followersCount: Number(r.followersCount),
  viewerFollows: Boolean(Number(r.viewerFollows)),
  isViewer: viewerId === r.id,
})

/**
 * Ordered game ids of each user's Top 10 (positions ≤ `maxPosition`).
 */
export const topGameIdsForUsers = (userIds: readonly string[], maxPosition = 10) =>
  userIds.length === 0
    ? Effect.succeed(new Map<string, number[]>())
    : dbQuery("social.topGameIdsForUsers", (db) =>
        db
          .select({ userId: topGames.userId, gameId: topGames.gameId })
          .from(topGames)
          .where(and(inArray(topGames.userId, [...new Set(userIds)]), lte(topGames.position, maxPosition)))
          .orderBy(asc(topGames.userId), asc(topGames.position)),
      ).pipe(
        Effect.map((rows) => {
          const map = new Map<string, number[]>()
          for (const r of rows) map.set(r.userId, [...(map.get(r.userId) ?? []), r.gameId])
          return map
        }),
      )

/**
 * Up to `perUser` showcase covers per user: their Top 10 first, then their
 * highest-rated (then most recent) logged games.
 */
export const coversForUsers = (userIds: readonly string[], perUser = 3) =>
  Effect.gen(function* () {
    const ids = [...new Set(userIds)]
    const result = new Map<string, GameSummary[]>()
    if (ids.length === 0) return result

    const picks = yield* topGameIdsForUsers(ids, perUser)
    const needs = ids.filter((id) => (picks.get(id)?.length ?? 0) < perUser)
    if (needs.length) {
      const ranked = yield* dbQuery("social.coverFallbacks", (db) => {
        const sub = db
          .select({
            userId: libraryEntries.userId,
            gameId: libraryEntries.gameId,
            rn: sql<number>`row_number() over (partition by ${libraryEntries.userId} order by ${libraryEntries.rating} IS NULL, ${libraryEntries.rating} DESC, ${libraryEntries.updatedAt} DESC)`.as(
              "rn",
            ),
          })
          .from(libraryEntries)
          .where(and(inArray(libraryEntries.userId, needs), loggedCondition))
          .as("ranked")
        return db
          .select({ userId: sub.userId, gameId: sub.gameId })
          .from(sub)
          .where(lte(sub.rn, perUser * 2))
          .orderBy(asc(sub.userId), asc(sub.rn))
      })
      for (const r of ranked) {
        const list = picks.get(r.userId) ?? []
        if (list.length < perUser && !list.includes(r.gameId)) picks.set(r.userId, [...list, r.gameId])
      }
    }

    const allIds = [...new Set([...picks.values()].flat())]
    const summaries = yield* getGameSummariesByIds(allIds)
    const byId = new Map(summaries.map((g) => [g.id, g]))
    for (const id of ids) {
      result.set(
        id,
        (picks.get(id) ?? []).flatMap((gid) => {
          const g = byId.get(gid)
          return g ? [g] : []
        }),
      )
    }
    return result
  })

/** Hydrates member rows with their showcase covers. */
export const attachCovers = (members: readonly MemberWithoutCovers[]) =>
  coversForUsers(members.map((m) => m.id)).pipe(
    Effect.map((covers): MemberSummary[] => members.map((m) => ({ ...m, covers: covers.get(m.id) ?? [] }))),
  )

/** Most-followed (then most active) members. */
export const popularMembers = (viewerId: string | null, limit = 12) =>
  dbQuery("social.popularMembers", (db) =>
    db
      .select(memberRowSelect(viewerId))
      .from(users)
      .leftJoin(avatarGames, eq(avatarGames.id, users.avatarGameId))
      .orderBy(desc(followersCountSql), desc(gamesCountSql), desc(users.createdAt))
      .limit(limit),
  ).pipe(
    Effect.map((rows) => rows.map((r) => toMemberSummary(r, viewerId))),
    Effect.flatMap(attachCovers),
  )

/** Newest sign-ups. */
export const recentMembers = (viewerId: string | null, limit = 12) =>
  dbQuery("social.recentMembers", (db) =>
    db
      .select(memberRowSelect(viewerId))
      .from(users)
      .leftJoin(avatarGames, eq(avatarGames.id, users.avatarGameId))
      .orderBy(desc(users.createdAt))
      .limit(limit),
  ).pipe(
    Effect.map((rows) => rows.map((r) => toMemberSummary(r, viewerId))),
    Effect.flatMap(attachCovers),
  )

/** Popular members the viewer doesn't follow yet (excludes the viewer). */
export const suggestedMembers = (viewerId: string, limit = 6) =>
  dbQuery("social.suggestedMembers", (db) =>
    db
      .select(memberRowSelect(viewerId))
      .from(users)
      .leftJoin(avatarGames, eq(avatarGames.id, users.avatarGameId))
      .where(
        and(
          ne(users.id, viewerId),
          notExists(
            db
              .select({ one: follows.followerId })
              .from(follows)
              .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, users.id))),
          ),
        ),
      )
      .orderBy(desc(followersCountSql), desc(gamesCountSql), desc(users.createdAt))
      .limit(limit),
  ).pipe(
    Effect.map((rows) => rows.map((r) => toMemberSummary(r, viewerId))),
    Effect.flatMap(attachCovers),
  )

/** Case-insensitive username / display name search (LIKE wildcards escaped). */
export const searchMembers = (query: string, viewerId: string | null, limit = 48) => {
  // people often type handles with the "@" prefix shown on profiles
  const q = query.trim().replace(/^@+/, "").trim().toLowerCase().slice(0, 50)
  if (!q) return Effect.succeed([] as MemberSummary[])
  const pattern = `%${escapeLike(q)}%`
  const prefix = `${escapeLike(q)}%`
  return dbQuery("social.searchMembers", (db) =>
    db
      .select(memberRowSelect(viewerId))
      .from(users)
      .leftJoin(avatarGames, eq(avatarGames.id, users.avatarGameId))
      .where(
        or(
          sql`lower(${users.username}) LIKE ${pattern} ESCAPE '\\'`,
          sql`lower(${users.displayName}) LIKE ${pattern} ESCAPE '\\'`,
        ),
      )
      .orderBy(
        // exact & prefix matches first, then popularity
        sql`CASE WHEN ${users.username} = ${q} THEN 0 WHEN lower(${users.username}) LIKE ${prefix} ESCAPE '\\' OR lower(${users.displayName}) LIKE ${prefix} ESCAPE '\\' THEN 1 ELSE 2 END`,
        desc(followersCountSql),
        asc(users.username),
      )
      .limit(limit),
  ).pipe(
    Effect.map((rows) => rows.map((r) => toMemberSummary(r, viewerId))),
    Effect.flatMap(attachCovers),
  )
}
