import { eq } from "drizzle-orm"
import { Effect } from "effect"
import type { NextRequest } from "next/server"
import { games } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { NotFoundError } from "@/lib/effect/errors"
import { validate } from "@/lib/effect/validation"
import { jsonFromEffect, searchParamsToObject } from "@/lib/reviews/api"
import { SteamReviewsQuery } from "@/lib/reviews/params"
import { getSteamReviews } from "@/lib/reviews/steam"

/**
 * GET /api/reviews/steam?appId=1145360&filter=helpful|recent&type=all|positive|negative&cursor=*
 * → SteamReviewPage. Used by the reviews tab for filter switching and "Load more".
 * Only app ids from our catalog are served (this is not an open Steam proxy).
 */
export async function GET(request: NextRequest) {
  const params = searchParamsToObject(request.nextUrl.searchParams)
  return jsonFromEffect(
    Effect.gen(function* () {
      const query = yield* validate(SteamReviewsQuery, params)
      const known = yield* dbQuery("reviews.steam.knownApp", (db) =>
        db.select({ id: games.id }).from(games).where(eq(games.steamAppId, query.appId)).limit(1),
      )
      if (known.length === 0) {
        return yield* new NotFoundError({ message: "That game isn't in the Savepoint catalog.", entity: "game" })
      }
      return yield* getSteamReviews(query.appId, {
        sort: query.filter ?? "helpful",
        type: query.type ?? "all",
        cursor: query.cursor ?? "*",
      })
    }),
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  )
}
