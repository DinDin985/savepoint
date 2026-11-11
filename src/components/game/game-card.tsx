import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { GameSummary } from "@/lib/games/core"
import { RatingStars } from "./rating-stars"

type Size = "xs" | "sm" | "md" | "lg"

const sizes: Record<Size, string> = {
  xs: "w-16",
  sm: "w-24 sm:w-28",
  md: "w-32 sm:w-40",
  lg: "w-40 sm:w-52",
}

const imageSizes: Record<Size, string> = {
  xs: "64px",
  sm: "112px",
  md: "160px",
  lg: "208px",
}

/**
 * Letterboxd-style portrait poster. On hover the cover art cross-fades to a
 * screenshot of the same game, the card lifts and grows, and an info overlay
 * slides up. Pure CSS — works in Server Components.
 *
 * Pass `fluid` to fill the parent's width (for grids) instead of a fixed size.
 */
export function GameCard({
  game,
  size = "md",
  fluid = false,
  showMeta = true,
  rank,
  userRating,
  badge,
  className,
  priority = false,
}: {
  game: GameSummary
  size?: Size
  fluid?: boolean
  /** Show title / year / community rating overlay on hover */
  showMeta?: boolean
  /** Big rank number in the corner (Top 10 lists) */
  rank?: number
  /** A specific user's rating to show under the poster (1–10) */
  userRating?: number | null
  /** Small element pinned top-right (e.g. status icon) */
  badge?: ReactNode
  className?: string
  priority?: boolean
}) {
  // games without screenshots/hero art just zoom their cover on hover
  const swap = game.hoverImage !== game.coverImage
  return (
    <div className={cn("group/card relative shrink-0", fluid ? "w-full" : sizes[size], className)}>
      <Link
        href={`/games/${game.slug}`}
        aria-label={game.title}
        className={cn(
          "relative block aspect-[2/3] overflow-hidden rounded-md bg-muted ring-1 ring-white/10",
          "transition-all duration-300 ease-out will-change-transform",
          "group-hover/card:-translate-y-1 group-hover/card:scale-[1.04] group-hover/card:shadow-2xl group-hover/card:shadow-black/60",
          "group-hover/card:ring-2 group-hover/card:ring-primary/80 focus-visible:ring-2 focus-visible:ring-primary",
        )}
      >
        {/* Blurred fill + contained cover: portrait art fits exactly, square
            eShop-style icons (some Nintendo games) aren't cropped. */}
        <span
          className={cn(
            "absolute inset-0 transition-all duration-500 ease-out",
            swap ? "group-hover/card:opacity-0" : "group-hover/card:scale-110",
          )}
        >
          <Image
            src={game.coverImage}
            alt=""
            fill
            sizes="64px"
            className="scale-125 object-cover opacity-70 blur-xl"
            aria-hidden
          />
          <Image
            src={game.coverImage}
            alt=""
            fill
            sizes={fluid ? "(max-width: 640px) 33vw, 200px" : imageSizes[size]}
            priority={priority}
            className="object-contain"
          />
        </span>
        {swap && (
          <Image
            src={game.hoverImage}
            alt=""
            fill
            sizes={fluid ? "(max-width: 640px) 33vw, 200px" : imageSizes[size]}
            className="scale-110 object-cover opacity-0 transition-all duration-700 ease-out group-hover/card:scale-100 group-hover/card:opacity-100"
          />
        )}

        {rank !== undefined && (
          <span className="absolute top-1 left-1.5 font-pixel text-2xl leading-none text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
            {rank}
          </span>
        )}
        {badge && <span className="absolute top-1.5 right-1.5">{badge}</span>}

        {showMeta && size !== "xs" && (
          <span
            className={cn(
              "absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/95 via-black/75 to-transparent p-2 pt-8",
              "transition-transform duration-300 ease-out group-hover/card:translate-y-0",
            )}
          >
            <span className="line-clamp-2 text-xs leading-tight font-semibold text-white">{game.title}</span>
            <span className="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-white/70">
              <span>{game.releaseYear ?? "TBA"}</span>
              {game.avgRating !== null && <RatingStars rating={game.avgRating} size="xs" />}
            </span>
          </span>
        )}
      </Link>
      {userRating !== undefined && userRating !== null && (
        <div className="mt-1 flex justify-center">
          <RatingStars rating={userRating} size="xs" />
        </div>
      )}
    </div>
  )
}

/** Responsive poster grid. */
export function GameGrid({ games, className }: { games: readonly GameSummary[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 sm:gap-4", className)}>
      {games.map((g) => (
        <GameCard key={g.id} game={g} fluid />
      ))}
    </div>
  )
}
