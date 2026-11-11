import "server-only"
import { and, desc, eq, gte, isNotNull, or, sql } from "drizzle-orm"
import { Effect } from "effect"
import { activities, gameCategories, games, libraryEntries, reviews, users, type ActivityKind } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { gameSummarySelect, toGameSummary } from "@/lib/games/core"
import { ART_STYLES, GENRES, PLATFORMS, TIERS, categoryHref, type CategoryDef } from "@/lib/taxonomy"
import { lastMonthKeys, startOfMonthUtc } from "./months"
import type { ActivityBucket, CategoryCount, DecadeCount, RatingBucket, StatsUser, UserStats } from "./types"

export type * from "./types"

const num = (v: unknown) => Number(v ?? 0) || 0
const numOrNull = (v: unknown) => (v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null)

/** Public profile basics for the stats page (username is matched lowercase). */
export const getStatsUser = (username: string) =>
  dbQuery("stats.user", (db) =>
    db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users)
      .where(eq(users.username, username.trim().toLowerCase()))
      .limit(1),
  ).pipe(Effect.map((rows): StatsUser | null => rows[0] ?? null))

/** Activity kinds → chart series */
const activitySeries = (kind: ActivityKind): keyof Omit<ActivityBucket, "month" | "total"> => {
  switch (kind) {
    case "played":
    case "rated":
    case "playing":
    case "liked":
      return "logged"
    case "reviewed":
      return "reviewed"
    case "wishlisted":
      return "wishlisted"
    case "followed":
    case "top_games":
    default:
      return "social"
  }
}

const RATING_LABELS = ["½★", "1★", "1½★", "2★", "2½★", "3★", "3½★", "4★", "4½★", "5★"] as const

const toCategoryCounts = (
  kind: "genre" | "art-style" | "tier" | "platform",
  defs: readonly CategoryDef[],
  rows: readonly { kind: string; slug: string; count: unknown; avgRating: unknown }[],
  { keepZero }: { keepZero: boolean },
): CategoryCount[] => {
  const bySlug = new Map(rows.filter((r) => r.kind === kind).map((r) => [r.slug, r]))
  const known = defs.map((def): CategoryCount => {
    const row = bySlug.get(def.slug)
    return {
      slug: def.slug,
      label: def.label,
      count: num(row?.count),
      avgRating: numOrNull(row?.avgRating),
      href: categoryHref(kind, def.slug),
    }
  })
  // categories present in the data but missing from the taxonomy (defensive)
  const extra = [...bySlug.values()]
    .filter((r) => !defs.some((d) => d.slug === r.slug))
    .map((r): CategoryCount => ({
      slug: r.slug,
      label: r.slug,
      count: num(r.count),
      avgRating: numOrNull(r.avgRating),
      href: categoryHref(kind, r.slug),
    }))
  const all = [...known, ...extra]
  return keepZero ? all : all.filter((c) => c.count > 0)
}

/**
 * Aggregates everything shown on /u/[username]/stats for one user.
 * All queries run concurrently; the catalog and a user's library are small,
 * so per-category grouping happens in SQL and shaping happens here.
 */
export const getUserStats = (userId: string) =>
  Effect.gen(function* () {
    const playedOrRated = or(eq(libraryEntries.played, true), isNotNull(libraryEntries.rating))
    const monthExpr = sql<string>`strftime('%Y-%m', ${activities.createdAt} / 1000, 'unixepoch')`
    const decadeExpr = sql<number>`(${games.releaseYear} / 10) * 10`
    const since = startOfMonthUtc(11)

    const [totalsRows, reviewRows, ratingRows, categoryRows, activityRows, decadeRows, highestRows, wishlistRows] =
      yield* Effect.all(
        [
          dbQuery("stats.user.totals", (db) =>
            db
              .select({
                logged: sql<number>`count(*)`,
                played: sql<number>`coalesce(sum(${libraryEntries.played}), 0)`,
                playing: sql<number>`coalesce(sum(${libraryEntries.playing}), 0)`,
                wishlisted: sql<number>`coalesce(sum(${libraryEntries.wishlisted}), 0)`,
                liked: sql<number>`coalesce(sum(${libraryEntries.liked}), 0)`,
                ratings: sql<number>`count(${libraryEntries.rating})`,
                averageRating: sql<number | null>`avg(${libraryEntries.rating})`,
                // how this user's ratings compare with every *other* member's average for the same games.
                // (outer columns are written fully qualified: drizzle renders single-table columns unqualified,
                // which would resolve to `le2` inside the subquery)
                communityDelta: sql<
                  number | null
                >`avg(library_entries.rating - (SELECT AVG(le2.rating) FROM library_entries le2 WHERE le2.game_id = library_entries.game_id AND le2.rating IS NOT NULL AND le2.user_id <> library_entries.user_id))`,
              })
              .from(libraryEntries)
              .where(eq(libraryEntries.userId, userId)),
          ),
          dbQuery("stats.user.reviews", (db) =>
            db
              .select({
                reviews: sql<number>`count(*)`,
                recommended: sql<number>`coalesce(sum(${reviews.recommended}), 0)`,
                hours: sql<number | null>`sum(${reviews.hoursPlayed})`,
                hoursReviews: sql<number>`count(${reviews.hoursPlayed})`,
              })
              .from(reviews)
              .where(eq(reviews.userId, userId)),
          ),
          dbQuery("stats.user.ratings", (db) =>
            db
              .select({ rating: libraryEntries.rating, count: sql<number>`count(*)` })
              .from(libraryEntries)
              .where(and(eq(libraryEntries.userId, userId), isNotNull(libraryEntries.rating)))
              .groupBy(libraryEntries.rating),
          ),
          dbQuery("stats.user.categories", (db) =>
            db
              .select({
                kind: gameCategories.kind,
                slug: gameCategories.slug,
                count: sql<number>`count(*)`,
                avgRating: sql<number | null>`avg(${libraryEntries.rating})`,
              })
              .from(libraryEntries)
              .innerJoin(gameCategories, eq(gameCategories.gameId, libraryEntries.gameId))
              .where(and(eq(libraryEntries.userId, userId), playedOrRated))
              .groupBy(gameCategories.kind, gameCategories.slug),
          ),
          dbQuery("stats.user.activity", (db) =>
            db
              .select({ month: monthExpr, kind: activities.kind, count: sql<number>`count(*)` })
              .from(activities)
              .where(and(eq(activities.userId, userId), gte(activities.createdAt, since)))
              .groupBy(monthExpr, activities.kind),
          ),
          dbQuery("stats.user.decades", (db) =>
            db
              .select({ decade: decadeExpr, count: sql<number>`count(*)` })
              .from(libraryEntries)
              .innerJoin(games, eq(games.id, libraryEntries.gameId))
              .where(and(eq(libraryEntries.userId, userId), playedOrRated, isNotNull(games.releaseYear)))
              .groupBy(decadeExpr),
          ),
          dbQuery("stats.user.highestRated", (db) =>
            db
              .select({ ...gameSummarySelect, userRating: libraryEntries.rating })
              .from(libraryEntries)
              .innerJoin(games, eq(games.id, libraryEntries.gameId))
              .where(and(eq(libraryEntries.userId, userId), isNotNull(libraryEntries.rating)))
              .orderBy(desc(libraryEntries.rating), desc(libraryEntries.updatedAt))
              .limit(12),
          ),
          dbQuery("stats.user.wishlist", (db) =>
            db
              .select(gameSummarySelect)
              .from(libraryEntries)
              .innerJoin(games, eq(games.id, libraryEntries.gameId))
              .where(and(eq(libraryEntries.userId, userId), eq(libraryEntries.wishlisted, true)))
              .orderBy(desc(libraryEntries.updatedAt))
              .limit(12),
          ),
        ],
        { concurrency: "unbounded" },
      )

    /* ── totals ─────────────────────────────────────────────────────────── */
    const t = totalsRows[0]
    const r = reviewRows[0]
    const reviewCount = num(r?.reviews)
    const recommended = num(r?.recommended)
    const hoursReviews = num(r?.hoursReviews)

    /* ── rating distribution (always all ten half-star buckets) ────────── */
    const ratingCounts = new Map(ratingRows.map((row) => [num(row.rating), num(row.count)]))
    const ratingDistribution: RatingBucket[] = RATING_LABELS.map((label, i) => ({
      rating: i + 1,
      label,
      count: ratingCounts.get(i + 1) ?? 0,
    }))

    /* ── categories ─────────────────────────────────────────────────────── */
    const genres = toCategoryCounts("genre", GENRES, categoryRows, { keepZero: false })
      .sort((a, b) => b.count - a.count || (b.avgRating ?? 0) - (a.avgRating ?? 0) || a.label.localeCompare(b.label))
      .slice(0, 8)
    const artStyles = toCategoryCounts("art-style", ART_STYLES, categoryRows, { keepZero: false }).sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    )
    // fixed order so colours follow the entity, not its rank
    const tiers = toCategoryCounts("tier", TIERS, categoryRows, { keepZero: true })
    const platforms = toCategoryCounts("platform", PLATFORMS, categoryRows, { keepZero: true })

    /* ── monthly activity (last 12 months, zero-filled) ───────────────── */
    const buckets = new Map<string, ActivityBucket>(
      lastMonthKeys(12).map((month) => [month, { month, logged: 0, reviewed: 0, wishlisted: 0, social: 0, total: 0 }]),
    )
    for (const row of activityRows) {
      const bucket = buckets.get(row.month)
      if (!bucket) continue
      const series = activitySeries(row.kind)
      const n = num(row.count)
      buckets.set(row.month, { ...bucket, [series]: bucket[series] + n, total: bucket.total + n })
    }
    const activity = [...buckets.values()]

    /* ── release decades (gap-filled between the oldest and newest) ─────── */
    const decadeCounts = new Map(decadeRows.map((row) => [num(row.decade), num(row.count)]))
    const decadeKeys = [...decadeCounts.keys()].filter((d) => d > 1900)
    const decades: DecadeCount[] = []
    if (decadeKeys.length > 0) {
      for (let d = Math.min(...decadeKeys); d <= Math.max(...decadeKeys); d += 10) {
        decades.push({ decade: d, label: `${d}s`, count: decadeCounts.get(d) ?? 0 })
      }
    }

    const stats: UserStats = {
      totals: {
        logged: num(t?.logged),
        played: num(t?.played),
        playing: num(t?.playing),
        wishlisted: num(t?.wishlisted),
        liked: num(t?.liked),
        ratings: num(t?.ratings),
        averageRating: numOrNull(t?.averageRating),
        communityDelta: numOrNull(t?.communityDelta),
        reviews: reviewCount,
        recommended,
        notRecommended: Math.max(0, reviewCount - recommended),
        totalHours: hoursReviews > 0 ? num(r?.hours) : null,
        hoursReviews,
      },
      ratingDistribution,
      genres,
      artStyles,
      tiers,
      platforms,
      activity,
      decades,
      highestRated: highestRows.map((row) => ({ game: toGameSummary(row), rating: num(row.userRating) })),
      wishlist: wishlistRows.map(toGameSummary),
    }
    return stats
  })
