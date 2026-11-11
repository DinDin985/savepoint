import { Suspense } from "react"
import type { Game } from "@/lib/db/schema"
import { CommunityPlayerStatsCard } from "./player-stats/community-player-stats"
import { PlayerStatsBoundary } from "./player-stats/player-stats-boundary"
import { PlayerStatsSkeleton } from "./player-stats/player-stats-skeleton"
import { SteamPlayerStatsCard } from "./player-stats/steam-player-stats"

export { PlayerStatsSkeleton } from "./player-stats/player-stats-skeleton"

/**
 * "Player stats" card for the game page (SteamDB-style).
 *
 * - Steam games: live current players (polled every 60s while the tab is
 *   visible), 24-hour & all-time peaks and a monthly history chart, with the
 *   catalog snapshot as fallback when Steam / SteamCharts are down.
 * - Nintendo & Epic-only games (no public player-count API): the Savepoint
 *   community's numbers — playing now, played, wishlisted, rating and monthly
 *   logging activity — with links to the Nintendo eShop / Epic store.
 *
 * Streams in behind its own Suspense boundary so slow upstreams never block
 * the rest of the game page.
 */
export async function PlayerStats({ game }: { game: Game }) {
  return (
    <PlayerStatsBoundary>
      <Suspense fallback={<PlayerStatsSkeleton />}>
        {game.steamAppId ? (
          <SteamPlayerStatsCard game={game} appId={game.steamAppId} />
        ) : (
          <CommunityPlayerStatsCard game={game} />
        )}
      </Suspense>
    </PlayerStatsBoundary>
  )
}
