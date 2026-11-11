import "server-only"
import { eq, inArray, sql } from "drizzle-orm"
import { Effect } from "effect"
import { games, libraryEntries, type Game } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"

/** Minimal shape every poster card needs. Serialisable (safe to pass to client components). */
export type GameSummary = {
  readonly id: number
  readonly slug: string
  readonly title: string
  readonly coverImage: string
  /** Image the card cross-fades to on hover (first screenshot → hero → cover). */
  readonly hoverImage: string
  readonly releaseYear: number | null
  readonly tier: Game["tier"]
  readonly developer: string | null
  /** Community average on the 1–10 half-star scale (null = no ratings yet) */
  readonly avgRating: number | null
  readonly ratingCount: number
}

/** SQL fragments for community rating aggregates (correlated subqueries on library_entries). */
export const avgRatingSql = sql<number | null>`(SELECT AVG(${libraryEntries.rating}) FROM ${libraryEntries} WHERE ${libraryEntries.gameId} = ${games.id} AND ${libraryEntries.rating} IS NOT NULL)`
export const ratingCountSql = sql<number>`(SELECT COUNT(*) FROM ${libraryEntries} WHERE ${libraryEntries.gameId} = ${games.id} AND ${libraryEntries.rating} IS NOT NULL)`

/** Columns to select for a GameSummary; pair with `toGameSummary`. */
export const gameSummarySelect = {
  id: games.id,
  slug: games.slug,
  title: games.title,
  coverImage: games.coverImage,
  heroImage: games.heroImage,
  screenshots: games.screenshots,
  releaseYear: games.releaseYear,
  tier: games.tier,
  developers: games.developers,
  avgRating: avgRatingSql,
  ratingCount: ratingCountSql,
} as const

type SummaryRow = {
  id: number
  slug: string
  title: string
  coverImage: string
  heroImage: string | null
  screenshots: string[]
  releaseYear: number | null
  tier: Game["tier"]
  developers: string[]
  avgRating: number | null
  ratingCount: number
}

export const toGameSummary = (row: SummaryRow): GameSummary => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  coverImage: row.coverImage,
  hoverImage: row.screenshots[0] ?? row.heroImage ?? row.coverImage,
  releaseYear: row.releaseYear,
  tier: row.tier,
  developer: row.developers[0] ?? null,
  avgRating: row.avgRating === null ? null : Number(row.avgRating),
  ratingCount: Number(row.ratingCount ?? 0),
})

/** Full game row by slug (null when missing — call notFound() outside the Effect). */
export const getGameBySlug = (slug: string) =>
  dbQuery("games.bySlug", (db) => db.select().from(games).where(eq(games.slug, slug)).limit(1)).pipe(
    Effect.map((rows) => rows[0] ?? null),
  )

export const getGameById = (id: number) =>
  dbQuery("games.byId", (db) => db.select().from(games).where(eq(games.id, id)).limit(1)).pipe(
    Effect.map((rows) => rows[0] ?? null),
  )

/** Summaries for the given ids, preserving the order of `ids`. */
export const getGameSummariesByIds = (ids: readonly number[]) =>
  ids.length === 0
    ? Effect.succeed([] as GameSummary[])
    : dbQuery("games.summariesByIds", (db) =>
        db.select(gameSummarySelect).from(games).where(inArray(games.id, [...ids])),
      ).pipe(
        Effect.map((rows) => {
          const byId = new Map(rows.map((r) => [r.id, toGameSummary(r)]))
          return ids.flatMap((id) => {
            const g = byId.get(id)
            return g ? [g] : []
          })
        }),
      )

/** All games as summaries (small catalog — fine to load fully). */
export const getAllGameSummaries = () =>
  dbQuery("games.allSummaries", (db) => db.select(gameSummarySelect).from(games).orderBy(games.title)).pipe(
    Effect.map((rows) => rows.map(toGameSummary)),
  )
