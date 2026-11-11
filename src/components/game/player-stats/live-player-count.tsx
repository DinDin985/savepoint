"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { RefreshCwIcon, UsersIcon } from "lucide-react"
import { formatNumber } from "@/lib/format"
import type { LivePlayersResponse, PlayerMetricSource } from "@/lib/steam/types"
import { cn } from "@/lib/utils"
import { MetricTile } from "./metric-tile"
import { useCountUp } from "./use-count-up"

const POLL_MS = 60_000
const CHECK_MS = 5_000

type LiveState = {
  readonly value: number | null
  readonly fetchedAt: string
  readonly live: boolean
  readonly source: PlayerMetricSource | null
  readonly asOf: string | null
  readonly error: boolean
  readonly delta: number | null
  readonly deltaKey: number
}

/** Deterministic (UTC) date so server and client render the same string. */
const formatAsOf = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })

const ago = (seconds: number) => {
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

function LiveDot({ live }: { live: boolean }) {
  return (
    <span className="relative flex size-2 shrink-0" aria-hidden>
      {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />}
      <span
        className={cn("relative inline-flex size-2 rounded-full", live ? "bg-primary" : "bg-muted-foreground/60")}
      />
    </span>
  )
}

/**
 * "Current players" tile. Polls GET /api/players/:appId every 60s while the tab
 * is visible (and immediately when it becomes visible again after being stale),
 * counting up/down to each new value and showing how fresh the number is.
 */
export function LivePlayerCount({
  appId,
  initial,
}: {
  appId: number
  initial: {
    readonly value: number | null
    readonly source: PlayerMetricSource | null
    readonly asOf: string | null
    readonly fetchedAt: string
    readonly live: boolean
  }
}) {
  const [state, setState] = useState<LiveState>({
    value: initial.value,
    fetchedAt: initial.fetchedAt,
    live: initial.live,
    source: initial.source,
    asOf: initial.asOf,
    error: false,
    delta: null,
    deltaKey: 0,
  })
  // "updated Xs ago" is measured on the client clock only (immune to server/client clock skew):
  // `updatedAt` is when this browser last received a number from the API. It stays null for the
  // server-rendered number, whose real age is unknown (it may come from Next's 2-minute fetch cache),
  // so we never claim "updated just now" for it.
  const [now, setNow] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [refreshing, startTransition] = useTransition()
  // time of the last poll attempt; 0 = never (the first visible check then refreshes immediately)
  const lastAttemptRef = useRef(0)
  const initialLive = initial.live
  const inFlightRef = useRef<AbortController | null>(null)
  const display = useCountUp(state.value)

  const refresh = useCallback(() => {
    inFlightRef.current?.abort()
    const controller = new AbortController()
    inFlightRef.current = controller
    lastAttemptRef.current = Date.now()
    startTransition(async () => {
      try {
        const res = await fetch(`/api/players/${appId}`, { cache: "no-store", signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = (await res.json()) as LivePlayersResponse
        if (typeof body.current !== "number") throw new Error("Malformed response")
        setState((prev) => ({
          value: body.current,
          fetchedAt: body.fetchedAt,
          live: true,
          source: "steam",
          asOf: null,
          error: false,
          delta: prev.value === null || prev.value === body.current ? null : body.current - prev.value,
          deltaKey: prev.deltaKey + 1,
        }))
        const received = Date.now()
        setUpdatedAt(received)
        setNow(received)
      } catch {
        if (controller.signal.aborted) return
        setState((prev) => ({ ...prev, error: true }))
      }
    })
  }, [appId])

  useEffect(() => {
    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return
      if (Date.now() - lastAttemptRef.current >= POLL_MS) refresh()
    }
    const ticker = window.setInterval(() => setNow(Date.now()), 1000)
    const poller = window.setInterval(maybeRefresh, CHECK_MS)
    const kick = window.setTimeout(() => {
      const mounted = Date.now()
      // a server-rendered live number is at most a couple of minutes old: confirm it after ~30s,
      // then poll every 60s. Anything else (snapshot / SteamCharts) refreshes straight away.
      if (initialLive && lastAttemptRef.current === 0) lastAttemptRef.current = mounted - POLL_MS / 2
      setNow(mounted)
      maybeRefresh()
    }, 0)
    document.addEventListener("visibilitychange", maybeRefresh)
    return () => {
      window.clearInterval(ticker)
      window.clearInterval(poller)
      window.clearTimeout(kick)
      document.removeEventListener("visibilitychange", maybeRefresh)
      inFlightRef.current?.abort()
    }
  }, [refresh, initialLive])

  const seconds = updatedAt === null ? null : Math.max(0, Math.round((now - updatedAt) / 1000))

  let freshness: string
  if (state.live) freshness = seconds === null ? "Live · Steam Web API" : `Live · updated ${ago(seconds)}`
  else if (state.source === "steamcharts")
    freshness = state.asOf ? `SteamCharts sample · ${formatAsOf(state.asOf)}` : "SteamCharts sample"
  else if (state.asOf) freshness = `As of ${formatAsOf(state.asOf)}`
  else freshness = "Unavailable right now"

  return (
    <MetricTile
      icon={<UsersIcon className="size-3.5" />}
      label="Current players"
      tooltip={
        <>
          People in-game on Steam right now, straight from the Steam Web API. Refreshes every minute while this tab is
          open.
        </>
      }
      value={
        <span className="inline-flex items-center gap-2">
          {/* the animated number is visual only; screen readers get the settled value, once per update */}
          <span aria-hidden>{formatNumber(display)}</span>
          <span className="sr-only" aria-live="polite" aria-atomic>
            {state.value === null ? "Unavailable" : `${formatNumber(state.value)} players`}
          </span>
          {state.delta !== null && (
            <span
              key={state.deltaKey}
              aria-hidden
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums animate-in fade-in slide-in-from-bottom-1 duration-500",
                state.delta > 0 ? "bg-primary/15 text-primary" : "bg-liked/15 text-liked",
              )}
            >
              {state.delta > 0 ? "+" : "−"}
              {formatNumber(Math.abs(state.delta))}
            </span>
          )}
        </span>
      }
      footer={
        <span className="flex items-center gap-1.5">
          <LiveDot live={state.live && !state.error} />
          <span className="truncate">
            {state.error && state.live
              ? seconds === null
                ? "Couldn't refresh · retrying"
                : `Couldn't refresh · updated ${ago(seconds)}`
              : freshness}
          </span>
          <RefreshCwIcon
            className={cn("size-3 shrink-0 transition-opacity", refreshing ? "animate-spin opacity-80" : "opacity-0")}
            aria-hidden
          />
        </span>
      }
    />
  )
}
