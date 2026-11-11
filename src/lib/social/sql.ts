import "server-only"
import { sql } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"
import { follows, games, libraryEntries, reviews, users } from "@/lib/db/schema"
import type { PublicUser } from "@/lib/profile/types"

/**
 * Shared SQL building blocks for user-centric queries.
 *
 * The counters are correlated subqueries against the *unaliased* `users` table,
 * so only use them in queries that select `from(users)` (or join it unaliased).
 */

/** Game used as a user's avatar (left join on users.avatarGameId). */
export const avatarGames = alias(games, "avatar_games")

export const publicUserSelect = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  avatarHue: users.avatarHue,
  avatarImage: avatarGames.coverImage,
} as const

export const toPublicUser = (row: {
  id: string
  username: string
  displayName: string
  avatarHue: number
  avatarImage: string | null
}): PublicUser => ({
  id: row.id,
  username: row.username,
  displayName: row.displayName,
  avatarHue: row.avatarHue,
  avatarImage: row.avatarImage ?? null,
})

/** played OR playing OR liked OR rated (i.e. not wishlist-only) */
export const loggedCondition = sql`(${libraryEntries.played} = 1 OR ${libraryEntries.playing} = 1 OR ${libraryEntries.liked} = 1 OR ${libraryEntries.rating} IS NOT NULL)`

export const gamesCountSql = sql<number>`(SELECT COUNT(*) FROM ${libraryEntries} WHERE ${libraryEntries.userId} = ${users.id} AND ${loggedCondition})`
export const reviewsCountSql = sql<number>`(SELECT COUNT(*) FROM ${reviews} WHERE ${reviews.userId} = ${users.id})`
export const followersCountSql = sql<number>`(SELECT COUNT(*) FROM ${follows} WHERE ${follows.followingId} = ${users.id})`
export const followingCountSql = sql<number>`(SELECT COUNT(*) FROM ${follows} WHERE ${follows.followerId} = ${users.id})`

/** 1 when `viewerId` follows the row's user, else 0. */
export const viewerFollowsSql = (viewerId: string | null) =>
  viewerId
    ? sql<number>`(EXISTS (SELECT 1 FROM ${follows} WHERE ${follows.followerId} = ${viewerId} AND ${follows.followingId} = ${users.id}))`
    : sql<number>`0`

/** Escape LIKE wildcards; use with `ESCAPE '\'`. */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, (ch) => `\\${ch}`)

/** Wide art for backdrops: hero → header → first screenshot → cover. */
export const wideImageOf = (g: {
  heroImage: string | null
  headerImage: string | null
  screenshots: string[] | null
  coverImage: string
}) => g.heroImage ?? g.headerImage ?? g.screenshots?.[0] ?? g.coverImage
