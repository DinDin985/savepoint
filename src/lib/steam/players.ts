import "server-only"
import { eq } from "drizzle-orm"
import { Duration, Effect, Result, Schema } from "effect"
import { games, type PlayerStatsSnapshot } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { ExternalApiError } from "@/lib/effect/errors"
import { fetchJson, fetchText } from "@/lib/effect/http"
import { hasSteamChartsData, parseSteamChartsHtml, type SteamChartsData } from "./steamcharts"
import type { PlayerHistoryPoint, PlayerMetric, SteamPlayerStats } from "./types"

/** Steam Web API current-player count is cached for 2 minutes (Next data cache). */
export const LIVE_PLAYERS_REVALIDATE = 120
/** SteamCharts peaks + monthly history are cached for an hour. */
export const STEAMCHARTS_REVALIDATE = 3600

const CurrentPlayersResponse = Schema.Struct({
  response: Schema.Struct({
    player_count: Schema.optional(Schema.Number),
    result: Schema.Number,
  }),
})

/**
 * Live concurrent players from the Steam Web API
 * (`ISteamUserStats/GetNumberOfCurrentPlayers`). Fails with `ExternalApiError`
 * when Steam is unreachable or doesn't know the app (`result !== 1`).
 */
export const fetchCurrentPlayers = Effect.fn("steam.currentPlayers")(function* (
  appId: number,
  revalidate: number = LIVE_PLAYERS_REVALIDATE,
) {
  const url = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`
  const body = yield* fetchJson(url, CurrentPlayersResponse, {
    source: "steam",
    revalidate,
    timeout: Duration.seconds(5),
  })
  const count = body.response.player_count
  if (body.response.result !== 1 || typeof count !== "number" || !Number.isFinite(count) || count < 0) {
    return yield* new ExternalApiError({ source: "steam", url, cause: `unexpected result ${body.response.result}` })
  }
  return Math.round(count)
})

/** 24-hour peak, all-time peak and monthly history scraped from SteamCharts. */
export const fetchSteamCharts = Effect.fn("steam.steamcharts")(function* (appId: number) {
  const url = `https://steamcharts.com/app/${appId}`
  const html = yield* fetchText(url, {
    source: "steamcharts",
    revalidate: STEAMCHARTS_REVALIDATE,
    timeout: Duration.seconds(6),
    init: { headers: { Accept: "text/html" } },
  })
  const data = parseSteamChartsHtml(html)
  if (!hasSteamChartsData(data)) {
    return yield* new ExternalApiError({ source: "steamcharts", url, cause: "page contained no player stats" })
  }
  return data
})

const metric = (value: number | null | undefined, source: PlayerMetric["source"], asOf: string | null): PlayerMetric =>
  value === null || value === undefined ? { value: null, source: null, asOf: null } : { value, source, asOf }

const firstMetric = (...candidates: PlayerMetric[]): PlayerMetric =>
  candidates.find((m) => m.value !== null) ?? { value: null, source: null, asOf: null }

/** A peak can never be lower than a live reading we just observed. */
const atLeast = (peak: PlayerMetric, current: PlayerMetric): PlayerMetric =>
  current.value !== null && (peak.value === null || current.value > peak.value)
    ? { value: current.value, source: current.source, asOf: current.asOf }
    : peak

const toHistory = (charts: SteamChartsData | null): PlayerHistoryPoint[] => {
  if (!charts) return []
  const points: PlayerHistoryPoint[] = charts.months.map((m) => ({
    month: m.month,
    avg: m.avgPlayers,
    peak: m.peakPlayers,
  }))
  if (charts.last30Days)
    points.push({ month: "last-30", avg: charts.last30Days.avgPlayers, peak: charts.last30Days.peakPlayers })
  return points
}

/**
 * Everything the "Player stats" card needs for a Steam game. Never fails:
 * each upstream is optional and the catalog snapshot (`games.player_stats`)
 * fills any gaps, flagged with `source: "snapshot"` + `asOf` so the UI can
 * say "as of <date>".
 */
export const getSteamPlayerStats = Effect.fn("steam.playerStats")(function* (
  appId: number,
  snapshot: PlayerStatsSnapshot | null,
) {
  const [liveResult, chartsResult] = yield* Effect.all(
    [Effect.result(fetchCurrentPlayers(appId)), Effect.result(fetchSteamCharts(appId))],
    { concurrency: "unbounded" },
  )
  if (Result.isFailure(liveResult)) yield* Effect.logWarning("steam: live player count unavailable", liveResult.failure)
  if (Result.isFailure(chartsResult)) yield* Effect.logWarning("steam: steamcharts unavailable", chartsResult.failure)

  const fetchedAt = new Date().toISOString()
  const live = Result.isSuccess(liveResult) ? liveResult.success : null
  const charts = Result.isSuccess(chartsResult) ? chartsResult.success : null
  const snapAt = snapshot?.fetchedAt ?? null

  const current = firstMetric(
    metric(live, "steam", null),
    metric(charts?.playing, "steamcharts", charts?.playingAt ?? null),
    metric(snapshot?.current, "snapshot", snapAt),
  )
  const peak24h = atLeast(
    firstMetric(metric(charts?.peak24h, "steamcharts", null), metric(snapshot?.peak24h, "snapshot", snapAt)),
    current,
  )
  const allTimePeak = atLeast(
    firstMetric(metric(charts?.allTimePeak, "steamcharts", null), metric(snapshot?.allTimePeak, "snapshot", snapAt)),
    peak24h,
  )

  const stats: SteamPlayerStats = {
    appId,
    current,
    peak24h,
    allTimePeak,
    history: toHistory(charts),
    fetchedAt,
    live: live !== null,
    stale: live === null && charts === null,
    historyAvailable: charts !== null,
    snapshotAt: snapAt,
  }
  return stats
})

/** Only proxy app ids that belong to a game in our catalog (the API route is not an open Steam proxy). */
export const isCatalogSteamApp = (appId: number) =>
  dbQuery("steam.isCatalogApp", (db) =>
    db.select({ id: games.id }).from(games).where(eq(games.steamAppId, appId)).limit(1),
  ).pipe(Effect.map((rows) => rows.length > 0))
