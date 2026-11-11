/**
 * Client-safe types + constants for a user's library (no server imports).
 * Server code lives in `entries.ts` / `community.ts`; client components import
 * from here and from `rules.ts`.
 */

export const LIBRARY_FLAGS = ["played", "playing", "wishlisted", "liked"] as const
export type LibraryFlag = (typeof LIBRARY_FLAGS)[number]

/**
 * Anchors on the game page: `#library-panel` scrolls to the viewer's log;
 * an `<a href="#write-review">` anywhere on the page opens the review editor.
 */
export const LIBRARY_PANEL_ID = "library-panel"
export const WRITE_REVIEW_HASH = "#write-review"

export const REVIEW_BODY_MIN = 10
export const REVIEW_BODY_MAX = 8000
export const HOURS_PLAYED_MAX = 100_000

/** The viewer's relationship with one game (serialisable; timestamps are epoch ms). */
export type LibraryEntryState = {
  readonly played: boolean
  readonly playing: boolean
  readonly wishlisted: boolean
  readonly liked: boolean
  /** half-star scale: 1 = ½★ … 10 = ★★★★★ ; null = unrated */
  readonly rating: number | null
  readonly startedPlayingAt: number | null
  readonly updatedAt: number | null
}

/** The viewer's own review of a game. */
export type OwnReview = {
  readonly id: string
  readonly body: string
  readonly recommended: boolean
  readonly hoursPlayed: number | null
  readonly containsSpoilers: boolean
  readonly createdAt: number
  readonly updatedAt: number
}

/** Everything the library panel needs; returned by every library action so the client can reconcile. */
export type LibraryState = {
  readonly gameId: number
  readonly slug: string
  readonly entry: LibraryEntryState
  readonly review: OwnReview | null
}

/**
 * Review editor payload (validated server-side by `ReviewDraftSchema`).
 * `recommended: null` = not chosen yet, which validation rejects with a field error.
 */
export type ReviewDraft = {
  readonly body: string
  readonly recommended: boolean | null
  readonly hoursPlayed?: number | null
  readonly containsSpoilers: boolean
}

export const EMPTY_ENTRY: LibraryEntryState = {
  played: false,
  playing: false,
  wishlisted: false,
  liked: false,
  rating: null,
  startedPlayingAt: null,
  updatedAt: null,
}

/** Community aggregates for one game. */
export type CommunityStats = {
  /** average on the 1–10 half-star scale (null = no ratings yet) */
  readonly avgRating: number | null
  readonly ratingCount: number
  /** counts per rating: index 0 = ½★ (rating 1) … index 9 = ★★★★★ (rating 10) */
  readonly histogram: readonly number[]
  readonly played: number
  readonly playing: number
  readonly wishlisted: number
  readonly liked: number
  readonly reviews: number
  /** reviews with a thumbs-up */
  readonly recommended: number
}

/** Someone the viewer follows who has this game in their library. */
export type FriendLog = {
  readonly username: string
  readonly displayName: string
  readonly avatarHue: number
  readonly avatarImage: string | null
  readonly rating: number | null
  readonly played: boolean
  readonly playing: boolean
  readonly wishlisted: boolean
  readonly liked: boolean
  readonly reviewed: boolean
  readonly recommended: boolean | null
  readonly updatedAt: number
}
