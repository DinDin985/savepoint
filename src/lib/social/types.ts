/**
 * Serialisable social types. Safe to import from client components.
 */
import type { ActivityKind } from "@/lib/db/schema"
import type { GameSummary } from "@/lib/games/core"
import type { PublicUser } from "@/lib/profile/types"

export type MemberSummary = PublicUser & {
  readonly bio: string
  readonly gamesCount: number
  readonly reviewsCount: number
  readonly followersCount: number
  /** up to 3 covers: their Top 10 first, then their highest rated games */
  readonly covers: readonly GameSummary[]
  /** does the signed-in viewer follow this member? */
  readonly viewerFollows: boolean
  /** is this member the signed-in viewer? */
  readonly isViewer: boolean
}

export type FeedReviewSnippet = {
  readonly snippet: string
  readonly recommended: boolean
  readonly containsSpoilers: boolean
}

export type FeedItem = {
  readonly id: number
  readonly kind: ActivityKind
  /** epoch ms */
  readonly createdAt: number
  /**
   * "3 hours ago" — computed on the server so hydration is stable; the feed
   * list re-computes labels in the viewer's time zone once hydrated.
   */
  readonly timeLabel: string
  /** grouping key (yyyy-m-d) + heading ("Today", "Yesterday", "Monday", "Mar 3, 2025") */
  readonly dayKey: string
  readonly dayLabel: string
  readonly actor: PublicUser
  readonly target: PublicUser | null
  readonly game: GameSummary | null
  readonly rating: number | null
  readonly review: FeedReviewSnippet | null
  /** for "top_games": the first few games of the actor's current Top 10 */
  readonly topGames: readonly GameSummary[]
}

/**
 * Keyset cursor for "Load more": the last activity's id plus its timestamp
 * (the feed is ordered by time, the id breaks ties and keeps pages stable).
 */
export type FeedCursor = {
  readonly beforeId: number
  /** epoch ms of that activity */
  readonly beforeTime: number
}

export type FeedPage = {
  readonly items: readonly FeedItem[]
  /** pass back to load the next page; null when there is nothing more */
  readonly nextCursor: FeedCursor | null
}

export type FollowResult = {
  readonly following: boolean
  readonly followers: number
  readonly username: string
}
