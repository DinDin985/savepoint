import { Schema } from "effect"
import { REVIEW_SORTS, REVIEW_TYPES, REVIEW_VOTE_KINDS } from "./types"

/** Query-string integer ("42" → 42) with a range check. */
const IntParam = (label: string, minimum: number, maximum: number) =>
  Schema.FiniteFromString.check(
    Schema.isInt({ message: `${label} must be a whole number` }),
    Schema.isBetween({ minimum, maximum }, { message: `${label} must be between ${minimum} and ${maximum}` }),
  )

const SortParam = Schema.Literals(REVIEW_SORTS).annotate({ message: "filter must be helpful or recent" })
const TypeParam = Schema.Literals(REVIEW_TYPES).annotate({ message: "type must be all, positive or negative" })

/** GET /api/reviews/steam?appId=&filter=helpful|recent&type=all|positive|negative&cursor= */
export const SteamReviewsQuery = Schema.Struct({
  appId: IntParam("appId", 1, 2_147_483_647),
  filter: Schema.optional(SortParam),
  type: Schema.optional(TypeParam),
  cursor: Schema.optional(Schema.String.check(Schema.isMaxLength(512, { message: "cursor is too long" }))),
})

/** GET /api/reviews/community?gameId=&filter=&type=&offset= */
export const CommunityReviewsQuery = Schema.Struct({
  gameId: IntParam("gameId", 1, 2_147_483_647),
  filter: Schema.optional(SortParam),
  type: Schema.optional(TypeParam),
  offset: Schema.optional(IntParam("offset", 0, 10_000)),
})

/** GET /api/reviews/epic?gameId= */
export const EpicRatingsQuery = Schema.Struct({
  gameId: IntParam("gameId", 1, 2_147_483_647),
})

/** voteReview(reviewId, kind) server action input */
export const VoteInput = Schema.Struct({
  reviewId: Schema.String.check(
    Schema.isMinLength(1, { message: "Missing review" }),
    Schema.isMaxLength(64, { message: "Invalid review" }),
  ),
  kind: Schema.Literals(REVIEW_VOTE_KINDS).annotate({ message: "Invalid vote" }),
})
