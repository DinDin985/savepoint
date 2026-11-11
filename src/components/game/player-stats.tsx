import type { Game } from "@/lib/db/schema"

/**
 * STUB — implemented by the "player-stats" feature.
 * For Steam games: current players (live), 24-hour peak and all-time peak.
 * Renders nothing for games that aren't on Steam.
 */
export async function PlayerStats({ game }: { game: Game }) {
  if (!game.steamAppId) return null
  return <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Player stats coming soon.</div>
}
