/**
 * Shared, serialisable types for the reviews feature. Safe to import from
 * client components (no server-only code here).
 */

export const REVIEW_SORTS = ["helpful", "recent"] as const
/** "Most helpful" | "Recent" */
export type ReviewSort = (typeof REVIEW_SORTS)[number]

export const REVIEW_TYPES = ["all", "positive", "negative"] as const
export type ReviewTypeFilter = (typeof REVIEW_TYPES)[number]

export const REVIEW_VOTE_KINDS = ["helpful", "unhelpful", "funny"] as const
export type ReviewVoteKind = (typeof REVIEW_VOTE_KINDS)[number]

/** Community reviews loaded per page (initial render and "Load more"). */
export const COMMUNITY_PAGE_SIZE = 10
/** Steam reviews loaded per page. */
export const STEAM_PAGE_SIZE = 10

/** One bar of the positive/negative histogram. `date` = start of the bucket (UTC ms). */
export type HistogramPoint = {
  readonly date: number
  readonly up: number
  readonly down: number
}

export type HistogramUnit = "month" | "week" | "day"

export type ReviewHistogram = {
  /** Whole lifetime, bucketed by `overallUnit`. */
  readonly overall: readonly HistogramPoint[]
  readonly overallUnit: HistogramUnit
  /** Last ~30 days, one bar per day. */
  readonly recent: readonly HistogramPoint[]
}

export type ReviewSummary = {
  readonly positive: number
  readonly negative: number
  readonly total: number
}

/** A piece of review text; spoiler segments are blurred until clicked. */
export type ReviewBodySegment = {
  readonly text: string
  readonly spoiler: boolean
}

export type ReviewAuthorAvatar =
  | { readonly kind: "image"; readonly url: string | null }
  | {
      readonly kind: "savepoint"
      readonly username: string
      readonly displayName: string
      readonly avatarHue: number
      readonly avatarImage: string | null
    }

export type ReviewAuthor = {
  readonly name: string
  /** Profile link (internal `/u/<username>` or an external Steam profile). */
  readonly profileUrl: string | null
  readonly external: boolean
  readonly avatar: ReviewAuthorAvatar
  /** Steam: products in account. Savepoint: games logged. */
  readonly productsOwned: number | null
  readonly reviewCount: number | null
}

export type ReviewVoteCounts = {
  readonly helpful: number
  readonly unhelpful: number
  readonly funny: number
}

export type ViewerVote = {
  /** 1 = helpful, -1 = not helpful, null = no helpfulness vote */
  readonly helpful: 1 | -1 | null
  readonly funny: boolean
}

/** Normalised review shape rendered by the Steam-style ReviewCard (all sources). */
export type ReviewCardData = {
  readonly id: string
  readonly source: "community" | "steam"
  readonly author: ReviewAuthor
  readonly recommended: boolean
  readonly body: readonly ReviewBodySegment[]
  /** UTC ms */
  readonly createdAt: number
  /** UTC ms; only set when the review was edited after posting */
  readonly updatedAt: number | null
  readonly playtimeMinutes: number | null
  readonly playtimeAtReviewMinutes: number | null
  readonly steamDeck: boolean
  readonly earlyAccess: boolean
  readonly receivedForFree: boolean
  /** Whole review is marked as containing spoilers (community reviews). */
  readonly containsSpoilers: boolean
  /** The author's Savepoint star rating for the game (1–10 half-stars). */
  readonly authorRating: number | null
  readonly votes: ReviewVoteCounts
  /** The signed-in viewer's vote (community only; null when signed out). */
  readonly viewerVote: ViewerVote | null
  readonly isOwn: boolean
  /** "View on Steam" link for store reviews. */
  readonly externalUrl: string | null
}

export type SteamReviewPage = {
  readonly reviews: readonly ReviewCardData[]
  /** Pass back to load the next page (null when there are no more). */
  readonly cursor: string | null
}

export type CommunityReviewPage = {
  readonly reviews: readonly ReviewCardData[]
  /** Offset of the next page (null when there are no more). */
  readonly nextOffset: number | null
}

export type SteamOverview = {
  readonly appId: number
  readonly overall: ReviewSummary | null
  /** Last 30 days (sum of the daily histogram). */
  readonly recent: ReviewSummary | null
  readonly histogram: ReviewHistogram | null
  /** false when the live summary failed and the catalog snapshot is shown */
  readonly live: boolean
}

export type CommunityOverview = {
  readonly overall: ReviewSummary
  readonly recent: ReviewSummary
  readonly histogram: ReviewHistogram
  /** Changes whenever a review is added/edited/removed (used to reset client state). */
  readonly version: string
}

export type EpicPollResult = {
  readonly id: string
  /** e.g. "Great Boss Battles" */
  readonly title: string
  /** e.g. "This game has" */
  readonly text: string
  /** emoji image URL */
  readonly emoji: string | null
  readonly votes: number
}

export type EpicRatings = {
  /** 0–5 */
  readonly averageRating: number | null
  readonly polls: readonly EpicPollResult[]
  readonly url: string
  /** false when the live call failed and the catalog snapshot is shown */
  readonly live: boolean
}

/** Error payload returned by the reviews API routes. */
export type ReviewsApiError = { readonly error: string }
