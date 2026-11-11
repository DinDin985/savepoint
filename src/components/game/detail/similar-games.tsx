import Link from "next/link"
import { CompassIcon } from "lucide-react"
import { GameCard } from "@/components/game/game-card"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { GameSummary } from "@/lib/games/core"

/** "More like this": a horizontally scrolling row of small posters. */
export function SimilarGames({
  games,
  browseHref,
  browseLabel,
}: {
  games: readonly GameSummary[]
  browseHref: string
  browseLabel: string
}) {
  if (games.length === 0) {
    return (
      <Empty className="border border-dashed bg-card/40">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CompassIcon />
          </EmptyMedia>
          <EmptyTitle>Nothing quite like it (yet)</EmptyTitle>
          <EmptyDescription>We couldn&apos;t find games that share enough with this one.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="lg" variant="outline">
            <Link href={browseHref}>Browse {browseLabel}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }
  return (
    <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pt-2 pb-4 scrollbar-none sm:-mx-6 sm:gap-4 sm:px-6">
      {games.map((g) => (
        <li key={g.id} className="snap-start">
          <GameCard game={g} size="sm" />
        </li>
      ))}
    </ul>
  )
}
