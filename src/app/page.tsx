import { GameGrid } from "@/components/game/game-card"
import { runEffect } from "@/lib/effect/runtime"
import { getAllGameSummaries } from "@/lib/games/core"

// STUB home page — replaced by the "discover" feature.
export default async function HomePage() {
  const games = await runEffect(getAllGameSummaries())
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold">Savepoint</h1>
      <GameGrid games={games} />
    </div>
  )
}
