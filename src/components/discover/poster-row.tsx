import type { ReactNode } from "react"
import { GameCard } from "@/components/game/game-card"
import { Skeleton } from "@/components/ui/skeleton"
import type { GameSummary } from "@/lib/games/core"
import { cn } from "@/lib/utils"
import { ScrollRow } from "./scroll-row"
import { SectionHeader } from "./section-header"

/** A titled, horizontally scrolling row of posters with a "See all →" link. */
export function PosterRow({
  kicker,
  title,
  description,
  href,
  games,
  badgeFor,
  icon,
  className,
}: {
  kicker?: string
  title: string
  description?: ReactNode
  href?: string
  games: readonly GameSummary[]
  /** Optional small badge rendered on a poster (e.g. "Soon", "Exclusive"). */
  badgeFor?: (game: GameSummary) => ReactNode
  icon?: ReactNode
  className?: string
}) {
  if (games.length === 0) return null
  return (
    <section className={cn("min-w-0", className)} aria-label={title}>
      <SectionHeader kicker={kicker} title={title} description={description} href={href} icon={icon} />
      <ScrollRow label={title}>
        {games.map((game) => (
          <GameCard key={game.id} game={game} size="md" badge={badgeFor?.(game)} />
        ))}
      </ScrollRow>
    </section>
  )
}

/** Small pill used as a GameCard badge. */
export function PosterBadge({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "playing" | "liked" | "star" }) {
  const tones = {
    primary: "bg-primary text-primary-foreground",
    playing: "bg-playing text-background",
    liked: "bg-liked text-white",
    star: "bg-star text-background",
  } as const
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 font-pixel text-[9px] leading-none tracking-wider uppercase shadow-md shadow-black/50",
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

export function PosterRowSkeleton({ count = 8, withHeader = true }: { count?: number; withHeader?: boolean }) {
  return (
    <div className="min-w-0" aria-hidden>
      {withHeader && (
        <div className="mb-4 flex items-end justify-between">
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      )}
      <div className="flex gap-3 overflow-hidden py-3 sm:gap-4">
        {Array.from({ length: count }, (_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-32 shrink-0 rounded-md sm:w-40" />
        ))}
      </div>
    </div>
  )
}
