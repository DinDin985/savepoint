"use server"

import { Effect } from "effect"
import { revalidatePath } from "next/cache"
import { runAuthedAction } from "@/lib/auth/current-user"
import type { ActionResult } from "@/lib/effect/runtime"
import { validate } from "@/lib/effect/validation"
import { voteOnReview } from "@/lib/reviews/community"
import { VoteInput } from "@/lib/reviews/params"
import type { ReviewVoteCounts, ReviewVoteKind, ViewerVote } from "@/lib/reviews/types"

export type VoteReviewResult = {
  readonly counts: ReviewVoteCounts
  readonly viewerVote: ViewerVote
}

/**
 * "Was this review helpful?" — Yes / No / Funny with toggle semantics.
 * Requires a signed-in user who isn't the review's author. Returns the new
 * vote counts and the caller's resulting vote.
 */
export async function voteReview(reviewId: string, kind: ReviewVoteKind): Promise<ActionResult<VoteReviewResult>> {
  const result = await runAuthedAction((user) =>
    Effect.gen(function* () {
      const input = yield* validate(VoteInput, { reviewId, kind })
      return yield* voteOnReview(user.id, input.reviewId, input.kind)
    }),
  )
  if (!result.ok) return result

  const { gameSlug, authorUsername, counts, viewerVote } = result.data
  revalidatePath(`/games/${gameSlug}`)
  revalidatePath(`/u/${authorUsername}`)
  revalidatePath(`/u/${authorUsername}/reviews`)
  return { ok: true, data: { counts, viewerVote } }
}
