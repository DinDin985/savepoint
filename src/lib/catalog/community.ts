import "server-only"
import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"
import { Effect } from "effect"
import { games, libraryEntries, reviews, users } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { gameSummarySelect, toGameSummary, type GameSummary } from "@/lib/games/core"

const SNIPPET_LENGTH = 260

/** Trim a review body to a readable snippet on a word boundary. */
export function snippet(body: string, max = SNIPPET_LENGTH): string {
  const clean = body.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!?-]+$/, "")}…`
}

export type CommunityReview = {
  readonly id: string
  readonly snippet: string
  readonly recommended: boolean
  readonly containsSpoilers: boolean
  readonly hoursPlayed: number | null
  /** epoch ms (serialisable) */
  readonly createdAt: number
  /** the author's own rating of the game (1–10) */
  readonly rating: number | null
  readonly author: {
    readonly username: string
    readonly displayName: string
    readonly avatarHue: number
    readonly avatarImage: string | null
  }
  readonly game: GameSummary
}

const avatarGame = alias(games, "avatar_game")

/** Latest community reviews joined with author + game (for "Fresh reviews"). */
export const recentCommunityReviews = (limit = 6) =>
  dbQuery("community.recentReviews", (db) =>
    db
      .select({
        id: reviews.id,
        body: reviews.body,
        recommended: reviews.recommended,
        containsSpoilers: reviews.containsSpoilers,
        hoursPlayed: reviews.hoursPlayed,
        createdAt: reviews.createdAt,
        rating: libraryEntries.rating,
        username: users.username,
        displayName: users.displayName,
        avatarHue: users.avatarHue,
        avatarImage: avatarGame.coverImage,
        game: gameSummarySelect,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.userId))
      .innerJoin(games, eq(games.id, reviews.gameId))
      .leftJoin(avatarGame, eq(avatarGame.id, users.avatarGameId))
      .leftJoin(libraryEntries, and(eq(libraryEntries.userId, reviews.userId), eq(libraryEntries.gameId, reviews.gameId)))
      .where(sql`length(trim(${reviews.body})) > 0`)
      .orderBy(desc(reviews.createdAt))
      .limit(Math.max(1, Math.min(limit, 24))),
  ).pipe(
    Effect.map((rows) =>
      rows.map(
        (row): CommunityReview => ({
          id: row.id,
          snippet: snippet(row.body),
          recommended: Boolean(row.recommended),
          containsSpoilers: Boolean(row.containsSpoilers),
          hoursPlayed: row.hoursPlayed,
          createdAt: new Date(row.createdAt).getTime(),
          rating: row.rating,
          author: {
            username: row.username,
            displayName: row.displayName,
            avatarHue: row.avatarHue,
            avatarImage: row.avatarImage ?? null,
          },
          game: toGameSummary(row.game),
        }),
      ),
    ),
  )

export type SiteStats = { readonly games: number; readonly members: number; readonly ratings: number; readonly reviews: number; readonly logged: number }

/** Headline counts for the stats strip. */
export const siteStats = () =>
  dbQuery("community.siteStats", async (db) => {
    const [g, m, r, rv, l] = await Promise.all([
      db.select({ n: count() }).from(games),
      db.select({ n: count() }).from(users),
      db.select({ n: count() }).from(libraryEntries).where(isNotNull(libraryEntries.rating)),
      db.select({ n: count() }).from(reviews),
      db.select({ n: count() }).from(libraryEntries),
    ])
    const stats: SiteStats = {
      games: Number(g[0]?.n ?? 0),
      members: Number(m[0]?.n ?? 0),
      ratings: Number(r[0]?.n ?? 0),
      reviews: Number(rv[0]?.n ?? 0),
      logged: Number(l[0]?.n ?? 0),
    }
    return stats
  })

export type UserHomeSnapshot = {
  readonly played: number
  readonly playing: number
  readonly wishlisted: number
  readonly reviews: number
  readonly nowPlaying: readonly GameSummary[]
}

/** Counts + "currently playing" covers for the signed-in home hero. */
export const userHomeSnapshot = (userId: string) =>
  dbQuery("community.userHomeSnapshot", async (db) => {
    const [counts, reviewCount, nowPlaying] = await Promise.all([
      db
        .select({
          played: sql<number>`COALESCE(SUM(CASE WHEN ${libraryEntries.played} = 1 THEN 1 ELSE 0 END), 0)`,
          playing: sql<number>`COALESCE(SUM(CASE WHEN ${libraryEntries.playing} = 1 THEN 1 ELSE 0 END), 0)`,
          wishlisted: sql<number>`COALESCE(SUM(CASE WHEN ${libraryEntries.wishlisted} = 1 THEN 1 ELSE 0 END), 0)`,
        })
        .from(libraryEntries)
        .where(eq(libraryEntries.userId, userId)),
      db.select({ n: count() }).from(reviews).where(eq(reviews.userId, userId)),
      db
        .select(gameSummarySelect)
        .from(libraryEntries)
        .innerJoin(games, eq(games.id, libraryEntries.gameId))
        .where(and(eq(libraryEntries.userId, userId), eq(libraryEntries.playing, true)))
        .orderBy(desc(libraryEntries.startedPlayingAt), desc(libraryEntries.updatedAt))
        .limit(4),
    ])
    const snapshot: UserHomeSnapshot = {
      played: Number(counts[0]?.played ?? 0),
      playing: Number(counts[0]?.playing ?? 0),
      wishlisted: Number(counts[0]?.wishlisted ?? 0),
      reviews: Number(reviewCount[0]?.n ?? 0),
      nowPlaying: nowPlaying.map(toGameSummary),
    }
    return snapshot
  })
