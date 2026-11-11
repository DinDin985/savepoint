import "server-only"
import { and, desc, eq, isNotNull, ne, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"
import { Effect } from "effect"
import { follows, gameCategories, games, libraryEntries, reviews, users } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { getGameSummariesByIds } from "@/lib/games/core"
import type { CommunityStats, FriendLog } from "./types"

/* ── Community stats ────────────────────────────────────────────────────── */

const count = (value: unknown) => Number(value ?? 0) || 0

/** Average rating, rating histogram and status counts for one game (single round-trip). */
export const getCommunityStats = (gameId: number) =>
  dbQuery("library.communityStats", (db) =>
    db.batch([
      db
        .select({
          avg: sql<number | null>`AVG(${libraryEntries.rating})`,
          ratingCount: sql<number>`COUNT(${libraryEntries.rating})`,
          played: sql<number>`COALESCE(SUM(${libraryEntries.played}), 0)`,
          playing: sql<number>`COALESCE(SUM(${libraryEntries.playing}), 0)`,
          wishlisted: sql<number>`COALESCE(SUM(${libraryEntries.wishlisted}), 0)`,
          liked: sql<number>`COALESCE(SUM(${libraryEntries.liked}), 0)`,
        })
        .from(libraryEntries)
        .where(eq(libraryEntries.gameId, gameId)),
      db
        .select({ rating: libraryEntries.rating, count: sql<number>`COUNT(*)` })
        .from(libraryEntries)
        .where(and(eq(libraryEntries.gameId, gameId), isNotNull(libraryEntries.rating)))
        .groupBy(libraryEntries.rating),
      db
        .select({
          total: sql<number>`COUNT(*)`,
          recommended: sql<number>`COALESCE(SUM(${reviews.recommended}), 0)`,
        })
        .from(reviews)
        .where(eq(reviews.gameId, gameId)),
    ]),
  ).pipe(
    Effect.map(([aggRows, histRows, reviewRows]): CommunityStats => {
      const agg = aggRows[0]
      const histogram = Array.from({ length: 10 }, () => 0)
      for (const row of histRows) {
        const r = Number(row.rating)
        if (r >= 1 && r <= 10) histogram[r - 1] = count(row.count)
      }
      const ratingCount = count(agg?.ratingCount)
      return {
        avgRating: ratingCount > 0 && agg?.avg !== null && agg?.avg !== undefined ? Number(agg.avg) : null,
        ratingCount,
        histogram,
        played: count(agg?.played),
        playing: count(agg?.playing),
        wishlisted: count(agg?.wishlisted),
        liked: count(agg?.liked),
        reviews: count(reviewRows[0]?.total),
        recommended: count(reviewRows[0]?.recommended),
      }
    }),
  )

/* ── Friends who logged it ──────────────────────────────────────────────── */

const avatarGame = alias(games, "avatar_game")

/** People the viewer follows who have this game in their library (most recently active first). */
export const getFriendsWhoLogged = (viewerId: string, gameId: number, limit = 48) =>
  dbQuery("library.friendsWhoLogged", (db) =>
    db
      .select({
        username: users.username,
        displayName: users.displayName,
        avatarHue: users.avatarHue,
        avatarImage: avatarGame.coverImage,
        rating: libraryEntries.rating,
        played: libraryEntries.played,
        playing: libraryEntries.playing,
        wishlisted: libraryEntries.wishlisted,
        liked: libraryEntries.liked,
        updatedAt: libraryEntries.updatedAt,
        reviewId: reviews.id,
        recommended: reviews.recommended,
      })
      .from(follows)
      .innerJoin(users, eq(users.id, follows.followingId))
      .innerJoin(libraryEntries, and(eq(libraryEntries.userId, follows.followingId), eq(libraryEntries.gameId, gameId)))
      .leftJoin(avatarGame, eq(avatarGame.id, users.avatarGameId))
      .leftJoin(reviews, and(eq(reviews.userId, follows.followingId), eq(reviews.gameId, gameId)))
      .where(eq(follows.followerId, viewerId))
      .orderBy(desc(libraryEntries.updatedAt))
      .limit(limit),
  ).pipe(
    Effect.map((rows) =>
      rows.map(
        (row): FriendLog => ({
          username: row.username,
          displayName: row.displayName,
          avatarHue: row.avatarHue,
          avatarImage: row.avatarImage ?? null,
          rating: row.rating ?? null,
          played: Boolean(row.played),
          playing: Boolean(row.playing),
          wishlisted: Boolean(row.wishlisted),
          liked: Boolean(row.liked),
          reviewed: row.reviewId !== null,
          recommended: row.recommended === null ? null : Boolean(row.recommended),
          updatedAt: row.updatedAt.getTime(),
        }),
      ),
    ),
  )

/* ── More like this ─────────────────────────────────────────────────────── */

const other = alias(gameCategories, "other_category")

/**
 * Shared genres count most, then art style and studio size. Platforms barely
 * count — except console families (e.g. two Nintendo games) which say more
 * about a game than "it's on PC".
 */
const similarityScore = sql<number>`SUM(CASE ${other.kind} WHEN 'genre' THEN 3 WHEN 'art-style' THEN 2 WHEN 'tier' THEN 1 ELSE (CASE ${other.slug} WHEN 'pc' THEN 0.25 ELSE 0.75 END) END)`

/** How many players logged a game: breaks ties between equally similar games (popular first). */
const popularity = sql<number>`(SELECT COUNT(*) FROM ${libraryEntries} WHERE ${libraryEntries.gameId} = ${other.gameId})`

/** Up to `limit` games sharing the most categories with this one (genre / art style weighted). */
export const getSimilarGames = (gameId: number, limit = 12) =>
  dbQuery("library.similarGames", (db) =>
    db
      .select({ gameId: other.gameId, score: similarityScore })
      .from(gameCategories)
      .innerJoin(
        other,
        and(eq(other.kind, gameCategories.kind), eq(other.slug, gameCategories.slug), ne(other.gameId, gameCategories.gameId)),
      )
      .where(eq(gameCategories.gameId, gameId))
      .groupBy(other.gameId)
      // at least one genre / art style in common, or studio size + platform
      .having(sql`${similarityScore} >= 1.5`)
      .orderBy(desc(similarityScore), desc(popularity), other.gameId)
      .limit(limit),
  ).pipe(Effect.flatMap((rows) => getGameSummariesByIds(rows.map((r) => r.gameId))))
