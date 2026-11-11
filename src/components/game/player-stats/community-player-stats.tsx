import Link from "next/link"
import { Effect, Result } from "effect"
import {
  ActivityIcon,
  BookmarkIcon,
  CircleCheckIcon,
  ExternalLinkIcon,
  Gamepad2Icon,
  LogInIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react"
import { RatingStars } from "@/components/game/rating-stars"
import { MonthlyCountChart } from "@/components/stats/charts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { getCurrentUser } from "@/lib/auth/current-user"
import type { Game } from "@/lib/db/schema"
import { runEffect } from "@/lib/effect/runtime"
import { formatNumber } from "@/lib/format"
import { getGameCommunityStats } from "@/lib/stats/game-community"
import { MetricTile } from "./metric-tile"

type Store = { readonly name: string; readonly url: string | null }

/** Catalog store links are trusted data, but only ever render plain http(s) URLs as links. */
const httpUrl = (url: string | null | undefined): string | null => {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null
  } catch {
    return null
  }
}

/**
 * Which storefronts this game lives on that don't publish player counts.
 * Nintendo (Switch / Switch 2) and the Epic Games Store keep concurrent players private.
 */
function closedStores(game: Game): Store[] {
  const stores: Store[] = []
  if (game.storeLinks.nintendo || game.platforms.includes("nintendo")) {
    stores.push({ name: "Nintendo eShop", url: httpUrl(game.storeLinks.nintendo) })
  }
  if (game.storeLinks.epic || game.epic)
    stores.push({ name: "Epic Games Store", url: httpUrl(game.storeLinks.epic ?? game.epic?.url) })
  return stores
}

/** "Switch 2" for Switch 2 eShop listings, "Switch" otherwise. */
const nintendoConsole = (game: Game) => (game.storeLinks.nintendo?.includes("switch-2") ? "Switch 2" : "Switch")

function explainer(game: Game, stores: Store[]): string {
  const nintendo = stores.some((s) => s.name === "Nintendo eShop")
  const epic = stores.some((s) => s.name === "Epic Games Store")
  if (nintendo && epic) {
    return `${game.title} isn't on Steam, and neither Nintendo nor Epic publish live player counts — so here's how the Savepoint community is playing it.`
  }
  if (nintendo) {
    const platform = nintendoConsole(game)
    return game.platforms.length === 1
      ? `${game.title} is a Nintendo ${platform} exclusive, and Nintendo doesn't publish player counts — so here's how the Savepoint community is playing it.`
      : `${game.title} isn't on Steam, and Nintendo doesn't publish player counts for ${platform} games — so here's how the Savepoint community is playing it.`
  }
  if (epic)
    return `The Epic Games Store doesn't publish live player counts, so here's how the Savepoint community is playing ${game.title}.`
  return `${game.title} isn't on Steam, so there are no public concurrent-player numbers — here's the Savepoint community instead.`
}

/**
 * Nintendo / Epic-only games: there's no public concurrent-player API, so the
 * card shows Savepoint's own community numbers (playing now, played,
 * wishlisted, rating) plus monthly logging activity, and links to the store.
 */
export async function CommunityPlayerStatsCard({ game }: { game: Game }) {
  const [result, viewer] = await Promise.all([
    runEffect(Effect.result(getGameCommunityStats(game.id))),
    getCurrentUser(),
  ])
  const stores = closedStores(game)
  const isNintendo = stores.some((s) => s.name === "Nintendo eShop")
  const signInHref = `/sign-in?next=${encodeURIComponent(`/games/${game.slug}`)}`

  const header = (
    <CardHeader>
      <CardTitle id={`player-stats-${game.id}`} className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <ActivityIcon className="size-4 text-primary" aria-hidden />
        Player stats
      </CardTitle>
      <CardDescription className="text-pretty">{explainer(game, stores)}</CardDescription>
      <CardAction>
        <Badge variant="outline" className="font-pixel text-[10px] tracking-wider text-primary">
          {isNintendo ? "NINTENDO" : "COMMUNITY"}
        </Badge>
      </CardAction>
    </CardHeader>
  )

  const storeButtons = stores.filter((s): s is Store & { url: string } => s.url !== null)

  if (Result.isFailure(result)) {
    console.error("[player-stats] community stats failed", result.failure)
    return (
      <Card className="@container" aria-labelledby={`player-stats-${game.id}`}>
        {header}
        <CardContent>
          <p
            role="status"
            className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <TriangleAlertIcon className="size-4 shrink-0" aria-hidden />
            Couldn&apos;t load community stats right now. Refresh to try again.
          </p>
        </CardContent>
      </Card>
    )
  }

  const stats = result.success
  const hasAny = stats.playing + stats.played + stats.wishlisted + stats.ratings + stats.reviews > 0
  const monthlyTotal = stats.monthly.reduce((s, m) => s + m.count, 0)

  return (
    <Card className="@container" aria-labelledby={`player-stats-${game.id}`}>
      {header}

      <CardContent className="space-y-6">
        {hasAny ? (
          <>
            <div className="grid gap-2 @md:grid-cols-3 @md:gap-3">
              <MetricTile
                icon={<Gamepad2Icon className="size-3.5 text-playing" />}
                label="Playing now"
                value={formatNumber(stats.playing)}
                footer={
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex size-2" aria-hidden>
                      {stats.playing > 0 && (
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-playing opacity-75" />
                      )}
                      <span className="relative inline-flex size-2 rounded-full bg-playing" />
                    </span>
                    Savepoint members
                  </span>
                }
                tooltip="Members who've marked this game as currently playing on Savepoint."
              />
              <MetricTile
                icon={<CircleCheckIcon className="size-3.5 text-played" />}
                label="Played"
                value={formatNumber(stats.played)}
                footer={
                  stats.avgRating !== null ? (
                    <span className="flex items-center gap-1.5">
                      <RatingStars rating={stats.avgRating} size="xs" /> avg of {formatNumber(stats.ratings)}
                    </span>
                  ) : (
                    "No ratings yet"
                  )
                }
                tooltip="Members who've logged this game as played, and their average rating."
              />
              <MetricTile
                icon={<BookmarkIcon className="size-3.5 text-wishlist" />}
                label="Wishlisted"
                value={formatNumber(stats.wishlisted)}
                footer={
                  stats.reviews > 0
                    ? `${formatNumber(stats.recommended)} of ${formatNumber(stats.reviews)} reviews recommend`
                    : "Want to play it next"
                }
                tooltip="Members who want to play it next."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">Logged on Savepoint</h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatNumber(monthlyTotal)} in the last 12 months
                </span>
              </div>
              <MonthlyCountChart data={stats.monthly} seriesLabel="Logs" color="var(--chart-1)" />
            </div>
          </>
        ) : (
          <Empty className="border border-dashed py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>No one has logged {game.title} yet</EmptyTitle>
              <EmptyDescription>
                {viewer
                  ? "Be the first — mark it as played, playing or wishlisted with the buttons above and the community numbers start here."
                  : "Sign in to be the first to log it — your plays feed these community numbers."}
              </EmptyDescription>
            </EmptyHeader>
            {!viewer && (
              <EmptyContent>
                <Button asChild size="sm" className="max-sm:h-9">
                  <Link href={signInHref}>
                    <LogInIcon data-icon="inline-start" />
                    Sign in to log it
                  </Link>
                </Button>
              </EmptyContent>
            )}
          </Empty>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-3 @lg:flex-row @lg:items-center @lg:justify-between">
        <p className="text-xs text-muted-foreground">
          {hasAny && !viewer ? (
            <>
              Playing it too?{" "}
              <Link
                href={signInHref}
                className="font-medium text-primary underline-offset-4 transition-colors hover:underline"
              >
                Sign in
              </Link>{" "}
              to add your log.
            </>
          ) : (
            "Community numbers from Savepoint members · updated as people log"
          )}
        </p>
        {storeButtons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {storeButtons.map((s) => (
              <Button
                key={s.name}
                asChild
                size="sm"
                variant="outline"
                className="max-sm:h-9 hover:border-primary/50 hover:text-primary"
              >
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.name}
                  <ExternalLinkIcon className="size-3 opacity-70" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </Button>
            ))}
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
