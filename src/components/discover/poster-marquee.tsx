import Link from "next/link"
import type { GameSummary } from "@/lib/games/core"
import { cn } from "@/lib/utils"
import { CoverArt } from "./cover-art"

const KEYFRAMES = `
@keyframes sp-marquee { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(-50%, 0, 0); } }
`

/** Split games round-robin into `rowCount` rows so every row mixes popular and niche picks. */
export function toMarqueeRows(games: readonly GameSummary[], rowCount = 3): GameSummary[][] {
  const rows: GameSummary[][] = Array.from({ length: rowCount }, () => [])
  games.forEach((game, i) => rows[i % rowCount]!.push(game))
  return rows.filter((row) => row.length > 0)
}

/**
 * Endless rows of cover art drifting in alternating directions (pure CSS).
 * Each row pauses while hovered and individual covers pop on hover.
 * Respects `prefers-reduced-motion`.
 */
export function PosterMarquee({ rows, className }: { rows: readonly (readonly GameSummary[])[]; className?: string }) {
  if (rows.length === 0) return null
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        className,
      )}
    >
      <style href="sp-discover-marquee" precedence="default">
        {KEYFRAMES}
      </style>
      <div className="flex flex-col gap-1 sm:gap-2">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="group/track overflow-hidden py-3">
            <div
              className="flex w-max animate-[sp-marquee_80s_linear_infinite] will-change-transform group-hover/track:[animation-play-state:paused] motion-reduce:animate-none"
              // inline so the `animation` shorthand from the class can't reset them
              style={{
                animationDuration: `${60 + rowIndex * 18}s`,
                animationDirection: rowIndex % 2 === 1 ? "reverse" : "normal",
              }}
            >
              {[...row, ...row].map((game, i) => {
                const duplicate = i >= row.length
                return (
                  <Link
                    key={`${game.id}-${i}`}
                    href={`/games/${game.slug}`}
                    aria-hidden={duplicate || undefined}
                    tabIndex={duplicate ? -1 : undefined}
                    aria-label={duplicate ? undefined : game.title}
                    title={game.title}
                    className="group/cover relative block shrink-0 pr-2 sm:pr-3"
                  >
                    <span
                      className={cn(
                        "relative block aspect-[2/3] w-20 overflow-hidden rounded-md bg-muted ring-1 ring-white/10 sm:w-28 lg:w-32",
                        "transition-all duration-300 ease-out group-hover/cover:z-10 group-hover/cover:scale-110 group-hover/cover:shadow-2xl group-hover/cover:shadow-black/60 group-hover/cover:ring-2 group-hover/cover:ring-primary",
                      )}
                    >
                      <CoverArt
                        src={game.coverImage}
                        sizes="128px"
                        preload={rowIndex === 0 && i < 6}
                        className="brightness-90 transition-all duration-300 group-hover/cover:brightness-110"
                      />
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
