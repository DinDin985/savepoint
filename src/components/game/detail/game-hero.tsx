import Image from "next/image"
import { CalendarIcon, SparklesIcon } from "lucide-react"
import { RatingStars } from "@/components/game/rating-stars"
import type { Game } from "@/lib/db/schema"
import { formatCompact, formatNumber, formatReleaseDate, steamScoreLabel } from "@/lib/format"
import type { CommunityStats } from "@/lib/library/types"
import { TIERS } from "@/lib/taxonomy"
import { cn } from "@/lib/utils"
import { CategoryChips } from "./category-chips"
import { StoreLinks } from "./store-links"

/** Landscape art for the full-bleed backdrop: hero → first screenshot → cover. */
export const backdropImage = (game: Pick<Game, "heroImage" | "screenshots" | "coverImage">) =>
  game.heroImage ?? game.screenshots[0] ?? game.coverImage

/** What the portrait cover cross-fades to on hover (null when there's nothing different to show). */
const coverHoverImage = (game: Pick<Game, "heroImage" | "screenshots" | "coverImage">) =>
  game.screenshots.find((s) => s !== game.coverImage) ?? (game.heroImage !== game.coverImage ? game.heroImage : null)

/** Unreleased (no date yet, or a date in the future). Server-rendered per request. */
const isUpcoming = (releaseDate: string | null) => {
  if (!releaseDate) return true
  const time = Date.parse(`${releaseDate}T00:00:00Z`)
  return Number.isFinite(time) && time > Date.now()
}

const listNames = (names: readonly string[]) => {
  const clean = names.map((n) => n.replace(/,?\s+(Inc|Ltd|LLC|Co)\.?$/i, "").trim()).filter(Boolean)
  const unique = [...new Set(clean)]
  if (unique.length <= 2) return unique.join(" & ")
  return `${unique.slice(0, 2).join(", ")} & ${unique.length - 2} more`
}

const steamTone = {
  positive: "text-steam-blue",
  mixed: "text-steam-mixed",
  negative: "text-steam-negative",
} as const

/**
 * Full-bleed header of the game page: blurred-in hero backdrop that slowly
 * zooms on hover, portrait cover that cross-fades to a screenshot, title,
 * credits, release date, category chips, ratings and store buttons.
 */
export function GameHero({ game, community }: { game: Game; community: CommunityStats }) {
  const backdrop = backdropImage(game)
  const upcoming = isUpcoming(game.releaseDate)
  const developers = listNames(game.developers)
  const publishers = listNames(game.publishers)
  const tierLabel = TIERS.find((t) => t.slug === game.tier)?.label ?? game.tier
  const steam = game.steamReviews && game.steamReviews.total > 0 ? game.steamReviews : null
  const steamScore = steam ? steamScoreLabel(steam.positive, steam.total) : null

  return (
    <section className="group/hero relative isolate" aria-labelledby="game-title">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[300px] overflow-hidden sm:h-[420px] lg:h-[500px]">
        <Image
          src={backdrop}
          alt=""
          fill
          priority
          sizes="100vw"
          className={cn(
            "object-cover object-[center_25%] transition-transform duration-[9000ms] ease-out group-hover/hero:scale-110 motion-reduce:transition-none",
            // portrait box art (games without landscape art, e.g. some Nintendo titles) → soft blurred wash
            !game.heroImage && game.screenshots.length === 0 ? "scale-105 opacity-50 blur-2xl saturate-150" : "opacity-75",
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/55 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/10 to-background/50" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-28 pb-8 sm:px-6 sm:pt-44 lg:pt-56">
        <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-x-8">
          <GameCover game={game} className="self-start sm:row-span-2" />

          <div className="min-w-0 self-end">
            <p className="flex flex-wrap items-center gap-2 font-pixel text-[10px] tracking-widest text-primary">
              <span>{tierLabel.toUpperCase()}</span>
              {upcoming && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-wishlist/20 px-1.5 py-0.5 text-wishlist">
                  <SparklesIcon className="size-3" /> UPCOMING
                </span>
              )}
            </p>
            <h1
              id="game-title"
              className="mt-1 text-2xl leading-tight font-bold tracking-tight text-balance drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:text-4xl lg:text-5xl"
            >
              {game.title}
              {game.releaseYear && (
                <span className="ml-2 align-middle text-base font-semibold text-muted-foreground sm:text-xl lg:text-2xl">
                  {game.releaseYear}
                </span>
              )}
            </h1>
            {(developers || publishers) && (
              <p className="mt-2 text-sm text-muted-foreground">
                {developers && (
                  <>
                    Developed by <span className="font-medium text-foreground">{developers}</span>
                  </>
                )}
                {developers && publishers && <span aria-hidden> · </span>}
                {publishers && (
                  <>
                    Published by <span className="font-medium text-foreground">{publishers}</span>
                  </>
                )}
              </p>
            )}
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarIcon className="size-3.5" />
              {upcoming ? "Releases" : "Released"}{" "}
              <time dateTime={game.releaseDate ?? undefined} className="font-medium text-foreground/90">
                {formatReleaseDate(game.releaseDate)}
              </time>
            </p>
          </div>

          <div className="col-span-2 min-w-0 space-y-4 sm:col-span-1 sm:col-start-2">
            {game.source === "steam" && game.shortDescription && (
              <p className="line-clamp-3 max-w-2xl text-sm/relaxed text-foreground/80">{game.shortDescription}</p>
            )}

            <CategoryChips game={game} />

            <div className="flex flex-wrap items-center gap-2.5">
              {community.avgRating !== null && (
                <a
                  href="#community"
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-black/30 px-3 py-1.5 text-xs ring-1 ring-white/10 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:ring-star/60"
                >
                  <RatingStars rating={community.avgRating} size="sm" />
                  <span className="font-semibold text-foreground tabular-nums">{(community.avgRating / 2).toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    {formatCompact(community.ratingCount)} rating{community.ratingCount === 1 ? "" : "s"}
                  </span>
                </a>
              )}
              {game.metacritic !== null && <MetacriticBadge score={game.metacritic} />}
              {steam && steamScore && (
                <a
                  href="#reviews"
                  className="inline-flex min-h-9 flex-wrap items-center gap-x-1.5 rounded-lg bg-steam-bg/85 px-3 py-1.5 text-xs text-steam-muted ring-1 ring-steam-blue/20 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:ring-steam-blue/60"
                  title={`${formatNumber(steam.positive)} positive · ${formatNumber(steam.negative)} negative`}
                >
                  <span>Steam:</span>
                  <span className={cn("font-semibold", steamTone[steamScore.tone])}>{steam.desc || steamScore.label}</span>
                  <span className="tabular-nums">
                    ({Math.round((steam.positive / steam.total) * 100)}% of {formatCompact(steam.total)})
                  </span>
                </a>
              )}
              {game.epic?.averageRating ? (
                <a
                  href="#reviews"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-black/30 px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-white/10 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:text-foreground hover:ring-white/40"
                >
                  Epic: <span className="font-semibold text-foreground">{game.epic.averageRating.toFixed(1)}</span> / 5
                </a>
              ) : null}
            </div>

            <StoreLinks game={game} />
          </div>
        </div>
      </div>
    </section>
  )
}

export function GameCover({
  game,
  className,
}: {
  game: Pick<Game, "title" | "coverImage" | "heroImage" | "screenshots">
  className?: string
}) {
  const hover = coverHoverImage(game)
  const sizes = "(min-width: 1024px) 224px, (min-width: 640px) 176px, 112px"
  return (
    <div
      className={cn(
        "group/cover relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted shadow-2xl shadow-black/60 ring-1 ring-white/15",
        "transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-black/80 hover:ring-2 hover:ring-primary/70",
        className,
      )}
    >
      {/* Blurred fill + contained cover (like GameCard): portrait box art fits
          exactly, square Nintendo eShop icons are letterboxed instead of cropped. */}
      <span
        className={cn(
          "absolute inset-0 transition-all duration-500 ease-out",
          hover ? "group-hover/cover:opacity-0" : "group-hover/cover:scale-105",
        )}
      >
        <Image
          src={game.coverImage}
          alt=""
          aria-hidden
          fill
          sizes="64px"
          className="scale-125 object-cover opacity-70 blur-xl"
        />
        <Image
          src={game.coverImage}
          alt={`${game.title} cover art`}
          fill
          priority
          sizes={sizes}
          className="object-contain"
        />
      </span>
      {hover && (
        <Image
          src={hover}
          alt=""
          fill
          sizes={sizes}
          className="scale-110 object-cover opacity-0 transition-all duration-700 ease-out group-hover/cover:scale-100 group-hover/cover:opacity-100"
        />
      )}
    </div>
  )
}

function MetacriticBadge({ score }: { score: number }) {
  const tone =
    score >= 75 ? "bg-primary text-primary-foreground" : score >= 50 ? "bg-star text-background" : "bg-destructive text-white"
  return (
    <span
      className="inline-flex items-center gap-2 rounded-lg bg-black/30 py-1 pr-3 pl-1 ring-1 ring-white/10 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:ring-white/30"
      title={`Metacritic score: ${score}`}
    >
      <span className={cn("grid size-7 place-items-center rounded-md text-sm font-bold tabular-nums", tone)}>{score}</span>
      <span className="text-[10px] leading-tight text-muted-foreground uppercase">
        Meta
        <br />
        score
      </span>
    </span>
  )
}
