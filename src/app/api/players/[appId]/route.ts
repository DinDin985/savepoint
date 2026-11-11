import { Effect, Result, Schema } from "effect"
import { NotFoundError } from "@/lib/effect/errors"
import { runEffect } from "@/lib/effect/runtime"
import { validate } from "@/lib/effect/validation"
import { fetchCurrentPlayers, isCatalogSteamApp } from "@/lib/steam/players"
import type { LivePlayersResponse } from "@/lib/steam/types"

/** Upstream cache for the polled endpoint (the client polls every 60s). */
const POLL_REVALIDATE = 60

const Params = Schema.Struct({
  appId: Schema.String.check(Schema.isPattern(/^[1-9]\d{0,9}$/, { message: "appId must be a positive integer" })),
})

/**
 * GET /api/players/:appId → { appId, current, fetchedAt }
 * Live concurrent players for a Steam game in our catalog (polled by the
 * game page's "Current players" tile while the tab is visible).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ appId: string }> }) {
  const raw = await params

  const result = await runEffect(
    Effect.result(
      Effect.gen(function* () {
        const { appId: appIdText } = yield* validate(Params, raw)
        const appId = Number(appIdText)
        if (!Number.isSafeInteger(appId)) {
          return yield* new NotFoundError({ message: "Unknown Steam app", entity: "game" })
        }
        const known = yield* isCatalogSteamApp(appId)
        if (!known) return yield* new NotFoundError({ message: "Unknown Steam app", entity: "game" })
        const current = yield* fetchCurrentPlayers(appId, POLL_REVALIDATE)
        const body: LivePlayersResponse = { appId, current, fetchedAt: new Date().toISOString() }
        return body
      }),
    ),
  )

  if (Result.isSuccess(result)) {
    return Response.json(result.success, {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=60" },
    })
  }

  const error = result.failure
  switch (error._tag) {
    case "ValidationError":
      return Response.json({ error: error.message }, { status: 400 })
    case "NotFoundError":
      return Response.json({ error: error.message }, { status: 404 })
    case "ExternalApiError":
      return Response.json(
        { error: "Steam didn't answer. Try again in a minute." },
        { status: 502, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
      )
    case "DbError":
      console.error("[api/players] db error", error)
      return Response.json({ error: "Something went wrong." }, { status: 500 })
  }
}
