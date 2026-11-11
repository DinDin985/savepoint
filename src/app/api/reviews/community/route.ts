import { Effect } from "effect"
import type { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth/current-user"
import { validate } from "@/lib/effect/validation"
import { jsonFromEffect, searchParamsToObject } from "@/lib/reviews/api"
import { listCommunityReviews } from "@/lib/reviews/community"
import { CommunityReviewsQuery } from "@/lib/reviews/params"

/**
 * GET /api/reviews/community?gameId=12&filter=helpful|recent&type=all|positive|negative&offset=0
 * → CommunityReviewPage (includes the signed-in viewer's own votes, so never cached publicly).
 */
export async function GET(request: NextRequest) {
  const params = searchParamsToObject(request.nextUrl.searchParams)
  const viewer = await getCurrentUser()
  return jsonFromEffect(
    Effect.gen(function* () {
      const query = yield* validate(CommunityReviewsQuery, params)
      return yield* listCommunityReviews({
        gameId: query.gameId,
        viewerId: viewer?.id ?? null,
        sort: query.filter ?? "helpful",
        type: query.type ?? "all",
        offset: query.offset ?? 0,
      })
    }),
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
