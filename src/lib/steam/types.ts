/**
 * Serialisable view-model types for Steam player statistics.
 * Safe to import from client components (no server code here).
 */

/** Where a number came from: the live Steam Web API, SteamCharts, or the catalog snapshot. */
export type PlayerMetricSource = "steam" | "steamcharts" | "snapshot"

export type PlayerMetric = {
  readonly value: number | null
  readonly source: PlayerMetricSource | null
  /** ISO timestamp the value was observed at (snapshot / SteamCharts sample time). */
  readonly asOf: string | null
}

export type PlayerHistoryPoint = {
  /** yyyy-mm, or "last-30" for SteamCharts' rolling "Last 30 Days" row */
  readonly month: string
  readonly avg: number
  readonly peak: number
}

export type SteamPlayerStats = {
  readonly appId: number
  readonly current: PlayerMetric
  readonly peak24h: PlayerMetric
  readonly allTimePeak: PlayerMetric
  /** Monthly averages / peaks, oldest → newest (may end with the "last-30" point). */
  readonly history: readonly PlayerHistoryPoint[]
  /** Server time the stats were assembled. */
  readonly fetchedAt: string
  /** true when the live Steam API answered (the client island can trust `current`). */
  readonly live: boolean
  /** true when both upstreams failed (numbers come from the catalog snapshot, if there is one). */
  readonly stale: boolean
  /** true when SteamCharts answered (an empty `history` then really means "no monthly data yet"). */
  readonly historyAvailable: boolean
  /** ISO time of the catalog snapshot used as fallback, null when the game has none. */
  readonly snapshotAt: string | null
}

/** Response body of GET /api/players/[appId]. */
export type LivePlayersResponse = {
  readonly appId: number
  readonly current: number
  readonly fetchedAt: string
}

export const steamDbChartsUrl = (appId: number) => `https://steamdb.info/app/${appId}/charts/`
export const steamChartsUrl = (appId: number) => `https://steamcharts.com/app/${appId}`
export const steamStoreUrl = (appId: number) => `https://store.steampowered.com/app/${appId}/`
