import type { Metadata } from "next"
import { Effect } from "effect"
import { TopGamesEditor } from "@/components/profile/top-games-editor"
import { requireUser } from "@/lib/auth/current-user"
import { runEffect } from "@/lib/effect/runtime"
import { getPickerGames, getTopGames } from "@/lib/profile/queries"

export const metadata: Metadata = { title: "Top 10 games" }

export default async function SettingsTopGamesPage() {
  const user = await requireUser("/settings/top-games")
  const { games, top } = await runEffect(
    Effect.all({ games: getPickerGames(), top: getTopGames(user.id) }, { concurrency: "unbounded" }),
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Top 10 games</h2>
        <p className="text-sm text-muted-foreground">
          Your all-time favourites, ranked. They headline your profile and show up on your member card.
        </p>
      </div>
      <TopGamesEditor username={user.username} games={games} initialIds={top.map((t) => t.game.id)} />
    </div>
  )
}
