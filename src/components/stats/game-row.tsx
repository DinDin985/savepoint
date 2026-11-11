import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { GameCard } from "@/components/game/game-card"
import type { GameSummary } from "@/lib/games/core"

/** Titled row of posters: a swipeable, snapping strip on phones; wraps into rows from `sm` up. */
export function GameRow({
  title,
  icon,
  count,
  href,
  linkLabel = "See all",
  items,
  empty,
}: {
  title: string
  icon?: ReactNode
  count?: number
  href?: string
  linkLabel?: string
  items: readonly { game: GameSummary; userRating?: number | null }[]
  empty: ReactNode
}) {
  return (
    <section className="min-w-0 space-y-3" aria-label={title}>
      <div className="flex items-end justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          {icon}
          {title}
          {count !== undefined && count > 0 && (
            <span className="font-pixel text-xs font-normal text-muted-foreground tabular-nums">{count}</span>
          )}
        </h3>
        {href && items.length > 0 && (
          <Link
            href={href}
            className="group/more flex min-h-9 shrink-0 items-center gap-1 text-sm text-muted-foreground transition-all duration-200 hover:scale-105 hover:text-primary sm:min-h-0"
          >
            {linkLabel}
            <ArrowRightIcon
              className="size-3.5 transition-transform duration-200 group-hover/more:translate-x-0.5"
              aria-hidden
            />
          </Link>
        )}
      </div>
      {items.length > 0 ? (
        // touch: swipeable single row (snaps); sm+: wraps, since a hidden-scrollbar row can't be scrolled with a mouse
        <div className="scrollbar-none -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pt-2 pb-3 sm:flex-wrap sm:gap-4 sm:overflow-visible">
          {items.map(({ game, userRating }) => (
            <GameCard key={game.id} game={game} size="sm" userRating={userRating} className="snap-start" />
          ))}
        </div>
      ) : (
        empty
      )}
    </section>
  )
}
