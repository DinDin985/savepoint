import { Effect, Option } from "effect"
import {
  ActivityIcon,
  ChartLineIcon,
  CloudOffIcon,
  ExternalLinkIcon,
  Gamepad2Icon,
  HistoryIcon,
  TrendingUpIcon,
  TrophyIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { getCurrentUser } from "@/lib/auth/current-user"
import type { Game } from "@/lib/db/schema"
import { runEffect } from "@/lib/effect/runtime"
import { formatNumber } from "@/lib/format"
import { getGameCommunityStats } from "@/lib/stats/game-community"
import { longMonthLabel } from "@/lib/stats/months"
import { getSteamPlayerStats } from "@/lib/steam/players"
import { steamChartsUrl, steamDbChartsUrl, type PlayerMetric } from "@/lib/steam/types"
import { CommunityStrip } from "./community-strip"
import { LivePlayerCount } from "./live-player-count"
import { MetricTile } from "./metric-tile"
import { PlayerHistoryChart } from "./player-history-chart"

/** Deterministic (UTC) so the server-rendered text never depends on the host's locale/time zone. */
const formatAsOf = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })

const sourceNote = (m: PlayerMetric) => {
  if (m.value === null) return "Unavailable right now"
  if (m.source === "snapshot") return m.asOf ? `As of ${formatAsOf(m.asOf)}` : "From our last snapshot"
  if (m.source === "steam") return "Live from Steam"
  return "Via SteamCharts"
}

/** Steam games: live current players, 24h / all-time peaks and monthly history. */
export async function SteamPlayerStatsCard({ game, appId }: { game: Game; appId: number }) {
  const [stats, community, viewer] = await Promise.all([
    runEffect(getSteamPlayerStats(appId, game.playerStats)),
    runEffect(Effect.option(getGameCommunityStats(game.id))).then(Option.getOrNull),
    getCurrentUser(),
  ])

  // month the all-time peak was set (when SteamCharts history reaches back that far)
  const peakMonth =
    stats.allTimePeak.value !== null
      ? stats.history.find((p) => p.month !== "last-30" && p.peak === stats.allTimePeak.value)?.month
      : undefined
  const snapshotDate = stats.stale && stats.snapshotAt ? formatAsOf(stats.snapshotAt) : null
  // Steam games that also ship on Switch: make clear the numbers are Steam (PC) only
  const alsoOnNintendo = game.platforms.includes("nintendo")
  const signInHref = viewer ? null : `/sign-in?next=${encodeURIComponent(`/games/${game.slug}`)}`

  return (
    <Card className="@container" aria-labelledby={`player-stats-${game.id}`}>
      <CardHeader>
        <CardTitle id={`player-stats-${game.id}`} className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <ActivityIcon className="size-4 text-primary" aria-hidden />
          Player stats
        </CardTitle>
        <CardDescription>
          Concurrent players on Steam{alsoOnNintendo ? " (PC)" : ""}
          {snapshotDate ? ` · as of ${snapshotDate}` : ""}
        </CardDescription>
        <CardAction>
          <Badge variant="outline" className="font-pixel text-[10px] tracking-wider text-steam-blue">
            STEAM
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-6">
        {stats.stale && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
          >
            {stats.snapshotAt ? (
              <>
                <HistoryIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  Steam and SteamCharts aren&apos;t answering right now, so these are the numbers from our last snapshot
                  {snapshotDate ? ` (${snapshotDate})` : ""}.
                </span>
              </>
            ) : (
              <>
                <CloudOffIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  Steam and SteamCharts aren&apos;t answering right now. We&apos;ll keep retrying the live count while
                  this page is open.
                </span>
              </>
            )}
          </p>
        )}

        <div className="grid gap-2 @md:grid-cols-3 @md:gap-3">
          <LivePlayerCount
            appId={appId}
            initial={{
              value: stats.current.value,
              source: stats.current.source,
              asOf: stats.current.asOf,
              fetchedAt: stats.fetchedAt,
              live: stats.live,
            }}
          />
          <MetricTile
            icon={<TrendingUpIcon className="size-3.5" />}
            label="24-hour peak"
            value={formatNumber(stats.peak24h.value)}
            footer={sourceNote(stats.peak24h)}
            tooltip="The most people playing at the same time on Steam during the last 24 hours."
          />
          <MetricTile
            icon={<TrophyIcon className="size-3.5" />}
            label="All-time peak"
            value={formatNumber(stats.allTimePeak.value)}
            valueClassName="text-star group-hover/tile:text-star"
            footer={peakMonth ? `Set in ${longMonthLabel(peakMonth)}` : sourceNote(stats.allTimePeak)}
            tooltip="The highest number of people ever playing at once on Steam since SteamCharts started tracking it."
          />
        </div>

        {alsoOnNintendo && (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Gamepad2Icon className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            <span>
              Also on Nintendo Switch — Nintendo doesn&apos;t publish player counts, so Switch players aren&apos;t
              included in these Steam numbers.
            </span>
          </p>
        )}

        {stats.history.length > 1 ? (
          <PlayerHistoryChart history={stats.history} title={game.title} />
        ) : (
          <Empty className="border border-dashed py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">{stats.historyAvailable ? <ChartLineIcon /> : <CloudOffIcon />}</EmptyMedia>
              <EmptyTitle>{stats.historyAvailable ? "No monthly history yet" : "History unavailable right now"}</EmptyTitle>
              <EmptyDescription>
                {stats.historyAvailable
                  ? `SteamCharts hasn't published a month of data for ${game.title} yet. The full picture lives on `
                  : "SteamCharts didn't answer, so the monthly chart can't be drawn. Try again later, or see the full picture on "}
                <a href={steamDbChartsUrl(appId)} target="_blank" rel="noopener noreferrer">
                  SteamDB
                </a>
                .
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {community && <CommunityStrip stats={community} signInHref={signInHref} />}
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-3 @lg:flex-row @lg:items-center @lg:justify-between">
        <p className="text-xs text-muted-foreground">
          Live player count from the Steam Web API · peaks &amp; history via SteamCharts
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="max-sm:h-9 hover:border-primary/50 hover:text-primary"
          >
            <a href={steamDbChartsUrl(appId)} target="_blank" rel="noopener noreferrer">
              <ChartLineIcon data-icon="inline-start" />
              Full charts on SteamDB
              <ExternalLinkIcon className="size-3 opacity-70" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
          <Button asChild size="sm" variant="ghost" className="max-sm:h-9 hover:text-primary">
            <a href={steamChartsUrl(appId)} target="_blank" rel="noopener noreferrer">
              SteamCharts
              <ExternalLinkIcon className="size-3 opacity-70" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
