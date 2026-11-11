import "server-only"
import { and, asc, desc, eq, isNotNull, sql, type SQL } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"
import { Effect } from "effect"
import { games, libraryEntries, reviews, topGames, users } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { gameSummarySelect, toGameSummary } from "@/lib/games/core"
import {
  avatarGames,
  followersCountSql,
  followingCountSql,
  gamesCountSql,
  loggedCondition,
  reviewsCountSql,
  wideImageOf,
} from "@/lib/social/sql"
import type {
  LibraryItem,
  LibrarySort,
  LibraryStatus,
  PickerGame,
  Profile,
  RatingHistogram,
  TopGame,
  UserReview,
} from "./types"

const bannerGames = alias(games, "banner_games")

const startOfYear = () => new Date(new Date().getFullYear(), 0, 1).getTime()

const countWhere = (condition: SQL) =>
  sql<number>`(SELECT COUNT(*) FROM ${libraryEntries} WHERE ${libraryEntries.userId} = ${users.id} AND ${condition})`

/**
 * Public profile by username (case-insensitive) with all header counters,
 * avatar cover and backdrop art. `null` when the user doesn't exist.
 */
export const getProfileByUsername = (username: string) =>
  Effect.gen(function* () {
    const uname = username.trim().toLowerCase()
    if (!uname) return null
    const yearStart = startOfYear()
    const rows = yield* dbQuery("profile.byUsername", (db) =>
      db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          bio: users.bio,
          location: users.location,
          avatarHue: users.avatarHue,
          avatarGameId: users.avatarGameId,
          bannerGameId: users.bannerGameId,
          createdAt: users.createdAt,
          avatarImage: avatarGames.coverImage,
          bannerTitle: bannerGames.title,
          bannerSlug: bannerGames.slug,
          bannerHero: bannerGames.heroImage,
          bannerHeader: bannerGames.headerImage,
          bannerScreens: bannerGames.screenshots,
          bannerCover: bannerGames.coverImage,
          games: gamesCountSql,
          thisYear: countWhere(
            sql`${libraryEntries.played} = 1 AND ${libraryEntries.updatedAt} >= ${yearStart}`,
          ),
          played: countWhere(sql`${libraryEntries.played} = 1`),
          playing: countWhere(sql`${libraryEntries.playing} = 1`),
          wishlist: countWhere(sql`${libraryEntries.wishlisted} = 1`),
          liked: countWhere(sql`${libraryEntries.liked} = 1`),
          rated: countWhere(sql`${libraryEntries.rating} IS NOT NULL`),
          reviews: reviewsCountSql,
          followers: followersCountSql,
          following: followingCountSql,
        })
        .from(users)
        .leftJoin(avatarGames, eq(avatarGames.id, users.avatarGameId))
        .leftJoin(bannerGames, eq(bannerGames.id, users.bannerGameId))
        .where(eq(users.username, uname))
        .limit(1),
    )
    const row = rows[0]
    if (!row) return null

    let banner: Profile["banner"] = null
    if (row.bannerSlug && row.bannerTitle && row.bannerCover) {
      banner = {
        image: wideImageOf({
          heroImage: row.bannerHero,
          headerImage: row.bannerHeader,
          screenshots: row.bannerScreens,
          coverImage: row.bannerCover,
        }),
        title: row.bannerTitle,
        slug: row.bannerSlug,
        chosen: true,
      }
    } else {
      // fall back to the hero art of their #1 game so profiles never look bare
      const top = yield* dbQuery("profile.bannerFallback", (db) =>
        db
          .select({
            title: games.title,
            slug: games.slug,
            heroImage: games.heroImage,
            headerImage: games.headerImage,
            screenshots: games.screenshots,
            coverImage: games.coverImage,
          })
          .from(topGames)
          .innerJoin(games, eq(games.id, topGames.gameId))
          .where(eq(topGames.userId, row.id))
          .orderBy(asc(topGames.position))
          .limit(1),
      )
      if (top[0]) banner = { image: wideImageOf(top[0]), title: top[0].title, slug: top[0].slug, chosen: false }
    }

    const profile: Profile = {
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      avatarHue: row.avatarHue,
      avatarImage: row.avatarImage ?? null,
      bio: row.bio,
      location: row.location,
      avatarGameId: row.avatarGameId,
      bannerGameId: row.bannerGameId,
      banner,
      joinedAt: row.createdAt.getTime(),
      stats: {
        games: Number(row.games),
        thisYear: Number(row.thisYear),
        played: Number(row.played),
        playing: Number(row.playing),
        wishlist: Number(row.wishlist),
        liked: Number(row.liked),
        rated: Number(row.rated),
        reviews: Number(row.reviews),
        followers: Number(row.followers),
        following: Number(row.following),
      },
    }
    return profile
  })

/** The user's ranked Top 10 (ordered by position). */
export const getTopGames = (userId: string) =>
  dbQuery("profile.topGames", (db) =>
    db
      .select({ position: topGames.position, game: gameSummarySelect })
      .from(topGames)
      .innerJoin(games, eq(games.id, topGames.gameId))
      .where(eq(topGames.userId, userId))
      .orderBy(asc(topGames.position)),
  ).pipe(Effect.map((rows): TopGame[] => rows.map((r) => ({ position: r.position, game: toGameSummary(r.game) }))))

const statusCondition = (status: LibraryStatus): SQL => {
  switch (status) {
    case "all":
      return loggedCondition
    case "played":
      return sql`${libraryEntries.played} = 1`
    case "playing":
      return sql`${libraryEntries.playing} = 1`
    case "liked":
      return sql`${libraryEntries.liked} = 1`
    case "rated":
      return sql`${libraryEntries.rating} IS NOT NULL`
    case "wishlisted":
      return sql`${libraryEntries.wishlisted} = 1`
  }
}

const hasReviewSql = sql<number>`(EXISTS (SELECT 1 FROM ${reviews} WHERE ${reviews.userId} = ${libraryEntries.userId} AND ${reviews.gameId} = ${libraryEntries.gameId}))`

const librarySelect = {
  game: gameSummarySelect,
  rating: libraryEntries.rating,
  played: libraryEntries.played,
  playing: libraryEntries.playing,
  wishlisted: libraryEntries.wishlisted,
  liked: libraryEntries.liked,
  hasReview: hasReviewSql,
  updatedAt: libraryEntries.updatedAt,
  startedPlayingAt: libraryEntries.startedPlayingAt,
} as const

type LibraryRow = {
  game: Parameters<typeof toGameSummary>[0]
  rating: number | null
  played: boolean
  playing: boolean
  wishlisted: boolean
  liked: boolean
  hasReview: number | boolean
  updatedAt: Date
  startedPlayingAt: Date | null
}

const toLibraryItem = (r: LibraryRow): LibraryItem => ({
  game: toGameSummary(r.game),
  rating: r.rating,
  played: r.played,
  playing: r.playing,
  wishlisted: r.wishlisted,
  liked: r.liked,
  hasReview: Boolean(Number(r.hasReview)),
  updatedAt: r.updatedAt.getTime(),
  startedPlayingAt: r.startedPlayingAt ? r.startedPlayingAt.getTime() : null,
})

/**
 * A user's library filtered by status, with their own rating.
 * Sorts: recent (last touched), rating (highest first, unrated last), title (A→Z).
 */
export const listLibrary = (
  userId: string,
  options: { status?: LibraryStatus; sort?: LibrarySort; limit?: number } = {},
) => {
  const status = options.status ?? "all"
  const sort = options.sort ?? "recent"
  const orderBy: SQL[] =
    sort === "title"
      ? [asc(games.title)]
      : sort === "rating"
        ? [sql`${libraryEntries.rating} IS NULL`, desc(libraryEntries.rating), desc(libraryEntries.updatedAt)]
        : status === "playing"
          ? [sql`${libraryEntries.startedPlayingAt} IS NULL`, desc(libraryEntries.startedPlayingAt), desc(libraryEntries.updatedAt)]
          : [desc(libraryEntries.updatedAt), asc(games.title)]
  return dbQuery(`profile.library.${status}`, (db) =>
    db
      .select(librarySelect)
      .from(libraryEntries)
      .innerJoin(games, eq(games.id, libraryEntries.gameId))
      .where(and(eq(libraryEntries.userId, userId), statusCondition(status)))
      .orderBy(...orderBy)
      .limit(options.limit ?? 500),
  ).pipe(Effect.map((rows) => rows.map(toLibraryItem)))
}

/** Diary: the most recently touched library entries (any status). */
export const recentActivity = (userId: string, limit = 8) =>
  dbQuery("profile.recentActivity", (db) =>
    db
      .select(librarySelect)
      .from(libraryEntries)
      .innerJoin(games, eq(games.id, libraryEntries.gameId))
      .where(eq(libraryEntries.userId, userId))
      .orderBy(desc(libraryEntries.updatedAt))
      .limit(limit),
  ).pipe(Effect.map((rows) => rows.map(toLibraryItem)))

/** The user's reviews (newest first) with their star rating for each game. */
export const userReviews = (userId: string, limit = 100) =>
  dbQuery("profile.reviews", (db) =>
    db
      .select({
        id: reviews.id,
        body: reviews.body,
        recommended: reviews.recommended,
        hoursPlayed: reviews.hoursPlayed,
        containsSpoilers: reviews.containsSpoilers,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        rating: libraryEntries.rating,
        game: gameSummarySelect,
      })
      .from(reviews)
      .innerJoin(games, eq(games.id, reviews.gameId))
      .leftJoin(libraryEntries, and(eq(libraryEntries.userId, reviews.userId), eq(libraryEntries.gameId, reviews.gameId)))
      .where(eq(reviews.userId, userId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit),
  ).pipe(
    Effect.map((rows) =>
      rows.map(
        (r): UserReview => ({
          id: r.id,
          body: r.body,
          recommended: r.recommended,
          hoursPlayed: r.hoursPlayed,
          containsSpoilers: r.containsSpoilers,
          createdAt: r.createdAt.getTime(),
          updatedAt: r.updatedAt.getTime(),
          rating: r.rating ?? null,
          game: toGameSummary(r.game),
        }),
      ),
    ),
  )

/** Distribution of the user's ratings over the 10 half-star buckets. */
export const ratingHistogram = (userId: string) =>
  dbQuery("profile.ratingHistogram", (db) =>
    db
      .select({ rating: libraryEntries.rating, count: sql<number>`COUNT(*)` })
      .from(libraryEntries)
      .where(and(eq(libraryEntries.userId, userId), isNotNull(libraryEntries.rating)))
      .groupBy(libraryEntries.rating),
  ).pipe(
    Effect.map((rows): RatingHistogram => {
      const buckets = Array.from({ length: 10 }, () => 0)
      let total = 0
      let sum = 0
      for (const r of rows) {
        if (r.rating === null || r.rating < 1 || r.rating > 10) continue
        const n = Number(r.count)
        buckets[r.rating - 1] += n
        total += n
        sum += r.rating * n
      }
      return { buckets, total, average: total ? sum / total : null }
    }),
  )

/** Every catalog game (Steam, Epic-only and Nintendo alike) for pickers, A→Z. */
export const getPickerGames = () =>
  dbQuery("profile.pickerGames", (db) =>
    db
      .select({
        id: games.id,
        slug: games.slug,
        title: games.title,
        coverImage: games.coverImage,
        heroImage: games.heroImage,
        headerImage: games.headerImage,
        screenshots: games.screenshots,
        releaseYear: games.releaseYear,
        platforms: games.platforms,
      })
      .from(games)
      .orderBy(asc(games.title)),
  ).pipe(
    Effect.map((rows) =>
      rows.map(
        (g): PickerGame => ({
          id: g.id,
          slug: g.slug,
          title: g.title,
          coverImage: g.coverImage,
          heroImage: wideImageOf(g),
          releaseYear: g.releaseYear,
          platforms: g.platforms ?? [],
        }),
      ),
    ),
  )
