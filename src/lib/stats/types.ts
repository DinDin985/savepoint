import type { GameSummary } from "@/lib/games/core"

/** Serialisable stats view-models (safe to pass to client chart components). */

export type StatsUser = {
  readonly id: string
  readonly username: string
  readonly displayName: string
}

export type CategoryCount = {
  readonly slug: string
  readonly label: string
  readonly count: number
  /** this user's average rating (1–10) for games in the category, null when none rated */
  readonly avgRating: number | null
  readonly href: string
}

export type RatingBucket = {
  /** 1–10 half-star value */
  readonly rating: number
  /** "½★", "1★", "1½★" … "5★" */
  readonly label: string
  readonly count: number
}

export type ActivityBucket = {
  /** yyyy-mm */
  readonly month: string
  /** played / rated / playing / liked events */
  readonly logged: number
  readonly reviewed: number
  readonly wishlisted: number
  /** follows + Top 10 edits */
  readonly social: number
  readonly total: number
}

export type DecadeCount = {
  readonly decade: number
  readonly label: string
  readonly count: number
}

export type UserStatsTotals = {
  readonly logged: number
  readonly played: number
  readonly playing: number
  readonly wishlisted: number
  readonly liked: number
  readonly ratings: number
  /** 1–10 half-star scale */
  readonly averageRating: number | null
  /** avg(user rating − other members' average) on the same games, 1–10 scale */
  readonly communityDelta: number | null
  readonly reviews: number
  readonly recommended: number
  readonly notRecommended: number
  /** Sum of `reviews.hoursPlayed` (hours), null when no review recorded hours */
  readonly totalHours: number | null
  readonly hoursReviews: number
}

export type UserStats = {
  readonly totals: UserStatsTotals
  readonly ratingDistribution: readonly RatingBucket[]
  /** top 8 genres among played / rated games */
  readonly genres: readonly CategoryCount[]
  readonly artStyles: readonly CategoryCount[]
  /** AAA, AA, Indie — fixed order, zero counts kept */
  readonly tiers: readonly CategoryCount[]
  /** PC, Nintendo, PlayStation, Xbox — fixed order, zero counts kept */
  readonly platforms: readonly CategoryCount[]
  /** last 12 months, oldest → newest */
  readonly activity: readonly ActivityBucket[]
  readonly decades: readonly DecadeCount[]
  readonly highestRated: readonly { readonly game: GameSummary; readonly rating: number }[]
  readonly wishlist: readonly GameSummary[]
}
