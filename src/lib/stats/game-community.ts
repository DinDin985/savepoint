import "server-only"
import { and, eq, gte, sql } from "drizzle-orm"
import { Effect } from "effect"
import { activities, libraryEntries, reviews } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { lastMonthKeys, startOfMonthUtc } from "./months"

export type GameCommunityStats = {
  readonly playing: number
  readonly played: number
  readonly wishlisted: number
  readonly liked: number
  readonly ratings: number
  /** 1–10 half-star scale */
  readonly avgRating: number | null
  readonly reviews: number
  readonly recommended: number
  /** Savepoint log activity for this game per month (last 12 months, oldest → newest). */
  readonly monthly: readonly { readonly month: string; readonly count: number }[]
}

const num = (v: unknown) => Number(v ?? 0) || 0

/**
 * How the Savepoint community is playing a game. Used by the game page's
 * "Player stats" card — the only player numbers we have for Nintendo and
 * Epic-only games (neither store publishes concurrent player counts).
 */
export const getGameCommunityStats = (gameId: number) =>
  Effect.gen(function* () {
    const since = startOfMonthUtc(11)
    const monthExpr = sql<string>`strftime('%Y-%m', ${activities.createdAt} / 1000, 'unixepoch')`

    const [library, reviewRows, monthRows] = yield* Effect.all(
      [
        dbQuery("stats.gameCommunity.library", (db) =>
          db
            .select({
              playing: sql<number>`coalesce(sum(${libraryEntries.playing}), 0)`,
              played: sql<number>`coalesce(sum(${libraryEntries.played}), 0)`,
              wishlisted: sql<number>`coalesce(sum(${libraryEntries.wishlisted}), 0)`,
              liked: sql<number>`coalesce(sum(${libraryEntries.liked}), 0)`,
              ratings: sql<number>`count(${libraryEntries.rating})`,
              avgRating: sql<number | null>`avg(${libraryEntries.rating})`,
            })
            .from(libraryEntries)
            .where(eq(libraryEntries.gameId, gameId)),
        ),
        dbQuery("stats.gameCommunity.reviews", (db) =>
          db
            .select({
              reviews: sql<number>`count(*)`,
              recommended: sql<number>`coalesce(sum(${reviews.recommended}), 0)`,
            })
            .from(reviews)
            .where(eq(reviews.gameId, gameId)),
        ),
        dbQuery("stats.gameCommunity.monthly", (db) =>
          db
            .select({ month: monthExpr, count: sql<number>`count(*)` })
            .from(activities)
            .where(and(eq(activities.gameId, gameId), gte(activities.createdAt, since)))
            .groupBy(monthExpr),
        ),
      ],
      { concurrency: "unbounded" },
    )

    const lib = library[0]
    const rev = reviewRows[0]
    const counts = new Map(monthRows.map((r) => [r.month, num(r.count)]))
    const stats: GameCommunityStats = {
      playing: num(lib?.playing),
      played: num(lib?.played),
      wishlisted: num(lib?.wishlisted),
      liked: num(lib?.liked),
      ratings: num(lib?.ratings),
      avgRating: lib?.avgRating === null || lib?.avgRating === undefined ? null : Number(lib.avgRating),
      reviews: num(rev?.reviews),
      recommended: num(rev?.recommended),
      monthly: lastMonthKeys(12).map((month) => ({ month, count: counts.get(month) ?? 0 })),
    }
    return stats
  })
