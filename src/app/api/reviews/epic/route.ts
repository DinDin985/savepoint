import { Effect } from "effect"
import type { NextRequest } from "next/server"
import { NotFoundError } from "@/lib/effect/errors"
import { validate } from "@/lib/effect/validation"
import { getGameById } from "@/lib/games/core"
import { jsonFromEffect, searchParamsToObject } from "@/lib/reviews/api"
import { getEpicRatings } from "@/lib/reviews/epic"
import { EpicRatingsQuery } from "@/lib/reviews/params"

/**
 * GET /api/reviews/epic?gameId=12 → EpicRatings (player rating + poll results).
 * The Epic namespace is looked up from our DB, never taken from the client.
 */
export async function GET(request: NextRequest) {
  const params = searchParamsToObject(request.nextUrl.searchParams)
  return jsonFromEffect(
    Effect.gen(function* () {
      const query = yield* validate(EpicRatingsQuery, params)
      const game = yield* getGameById(query.gameId)
      if (!game?.epic) {
        return yield* new NotFoundError({ message: "This game isn't on the Epic Games Store.", entity: "game" })
      }
      return yield* getEpicRatings(game.epic)
    }),
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } },
  )
}
