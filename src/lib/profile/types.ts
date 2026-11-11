/**
 * Serialisable profile types + constants. Safe to import from client components
 * (type-only imports of server modules are erased at build time).
 */
import type { PlatformFamily } from "@/lib/db/schema"
import type { GameSummary } from "@/lib/games/core"

export const PROFILE_LIMITS = { displayName: 40, bio: 300, location: 60 } as const
export const TOP_GAMES_MAX = 10

/** The minimum needed to render a user (compatible with `UserAvatar`). */
export type PublicUser = {
  readonly id: string
  readonly username: string
  readonly displayName: string
  readonly avatarHue: number
  /** cover art URL when the user picked a game as avatar */
  readonly avatarImage: string | null
}

export type ProfileStats = {
  /** logged = played, playing, liked or rated */
  readonly games: number
  /** played games logged / updated since Jan 1st */
  readonly thisYear: number
  readonly played: number
  readonly playing: number
  readonly wishlist: number
  readonly liked: number
  readonly rated: number
  readonly reviews: number
  readonly followers: number
  readonly following: number
}

export type ProfileBanner = {
  readonly image: string
  readonly title: string
  readonly slug: string
  /** true when the user picked it, false when it falls back to their #1 game */
  readonly chosen: boolean
}

export type Profile = PublicUser & {
  readonly bio: string
  readonly location: string | null
  readonly avatarGameId: number | null
  readonly bannerGameId: number | null
  readonly banner: ProfileBanner | null
  /** epoch ms */
  readonly joinedAt: number
  readonly stats: ProfileStats
}

export const LIBRARY_FILTERS = ["all", "played", "playing", "liked", "rated"] as const
export type LibraryFilter = (typeof LIBRARY_FILTERS)[number]
export type LibraryStatus = LibraryFilter | "wishlisted"

export const LIBRARY_SORTS = ["recent", "rating", "title"] as const
export type LibrarySort = (typeof LIBRARY_SORTS)[number]

export type LibraryItem = {
  readonly game: GameSummary
  readonly rating: number | null
  readonly played: boolean
  readonly playing: boolean
  readonly wishlisted: boolean
  readonly liked: boolean
  readonly hasReview: boolean
  /** epoch ms */
  readonly updatedAt: number
  readonly startedPlayingAt: number | null
}

export type TopGame = { readonly position: number; readonly game: GameSummary }

export type UserReview = {
  readonly id: string
  readonly body: string
  readonly recommended: boolean
  readonly hoursPlayed: number | null
  readonly containsSpoilers: boolean
  readonly createdAt: number
  readonly updatedAt: number
  /** the author's star rating for the game (1–10) */
  readonly rating: number | null
  readonly game: GameSummary
}

export type RatingHistogram = {
  /** index 0 → rating 1 (½★) … index 9 → rating 10 (★★★★★) */
  readonly buckets: readonly number[]
  readonly total: number
  /** 1–10 scale */
  readonly average: number | null
}

/** Light-weight game option used by the avatar / backdrop pickers and the Top 10 editor. */
export type PickerGame = {
  readonly id: number
  readonly slug: string
  readonly title: string
  readonly coverImage: string
  /** wide art for backdrops: hero → header → first screenshot → cover */
  readonly heroImage: string
  readonly releaseYear: number | null
  readonly platforms: readonly PlatformFamily[]
}

/** useActionState state for the profile settings form. */
export type ProfileFormState = {
  readonly ok?: boolean
  readonly error?: string
  readonly message?: string
  readonly fieldErrors?: Readonly<Record<string, string>>
  readonly username?: string
  /** changes on every submit so the client can react to repeated identical results */
  readonly submittedAt?: number
}

export const isLibraryFilter = (v: unknown): v is LibraryFilter =>
  typeof v === "string" && (LIBRARY_FILTERS as readonly string[]).includes(v)

export const isLibrarySort = (v: unknown): v is LibrarySort =>
  typeof v === "string" && (LIBRARY_SORTS as readonly string[]).includes(v)
