import { Schema } from "effect"
import { formatNumber } from "@/lib/format"
import { HOURS_PLAYED_MAX, LIBRARY_FLAGS, REVIEW_BODY_MAX, REVIEW_BODY_MIN } from "./types"

/** Effect Schemas for every library input (used by `entries.ts` and `src/actions/library.ts`). */

export const GameIdSchema = Schema.Int.annotate({ message: "Unknown game" }).check(
  Schema.isGreaterThan(0, { message: "Unknown game" }),
)

export const RatingSchema = Schema.NullOr(
  Schema.Int.annotate({ message: "Ratings go in half-star steps" }).check(
    Schema.isBetween({ minimum: 1, maximum: 10 }, { message: "Ratings go from ½ to 5 stars" }),
  ),
)

export const LibraryFlagSchema = Schema.Literals(LIBRARY_FLAGS).annotate({ message: "Unknown library status" })

export const ReviewDraftSchema = Schema.Struct({
  body: Schema.Trim.check(
    Schema.isMinLength(REVIEW_BODY_MIN, { message: `Write at least ${REVIEW_BODY_MIN} characters` }),
    Schema.isMaxLength(REVIEW_BODY_MAX, { message: `Keep it under ${formatNumber(REVIEW_BODY_MAX)} characters` }),
  ),
  recommended: Schema.Boolean.annotate({ message: "Do you recommend it? Pick thumbs up or thumbs down" }).pipe(
    Schema.annotateKey({ messageMissingKey: "Do you recommend it? Pick thumbs up or thumbs down" }),
  ),
  hoursPlayed: Schema.optional(
    Schema.NullOr(
      Schema.Finite.annotate({ message: "Hours played must be a number" }).check(
        Schema.isBetween(
          { minimum: 0, maximum: HOURS_PLAYED_MAX },
          { message: `Hours played must be between 0 and ${formatNumber(HOURS_PLAYED_MAX)}` },
        ),
      ),
    ),
  ),
  containsSpoilers: Schema.Boolean.annotate({ message: "Spoiler flag must be on or off" }),
})

/* ── Server Action inputs ─────────────────────────────────────────────── */

export const SetRatingInput = Schema.Struct({ gameId: GameIdSchema, rating: RatingSchema })

export const SetFlagInput = Schema.Struct({
  gameId: GameIdSchema,
  flag: LibraryFlagSchema,
  value: Schema.Boolean.annotate({ message: "Expected on or off" }),
  finished: Schema.optional(Schema.Boolean),
})

export const GameRefInput = Schema.Struct({ gameId: GameIdSchema })
