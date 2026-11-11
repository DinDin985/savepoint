import Image from "next/image"
import Link from "next/link"
import { ClockIcon, EyeOffIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"
import { RatingStars } from "@/components/game/rating-stars"
import { formatDate } from "@/lib/format"
import type { UserReview } from "@/lib/profile/types"
import { cn } from "@/lib/utils"
import { CoverArt } from "./cover-art"

const hoursLabel = (h: number) => `${h.toLocaleString("en-US", { maximumFractionDigits: 1 })} hrs`

/**
 * Compact review card linking to the game's #reviews section. Spoiler reviews
 * are blurred until hovered / focused.
 */
export function ReviewCard({ review, lines = 4 }: { review: UserReview; lines?: 2 | 3 | 4 | 6 }) {
  const clamp = { 2: "line-clamp-2", 3: "line-clamp-3", 4: "line-clamp-4", 6: "line-clamp-6" }[lines]
  const swap = review.game.hoverImage !== review.game.coverImage
  return (
    <article className="group/review relative flex gap-3 rounded-xl border border-border bg-card/50 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-lg hover:shadow-black/30 sm:gap-4 sm:p-4">
      <span className="relative aspect-[2/3] w-14 shrink-0 self-start overflow-hidden rounded-md bg-muted ring-1 ring-white/10 transition-all duration-300 group-hover/review:ring-primary/70 sm:w-16">
        <CoverArt
          src={review.game.coverImage}
          sizes="64px"
          className={cn(
            "transition-all duration-500",
            swap ? "group-hover/review:opacity-0" : "group-hover/review:scale-110",
          )}
        />
        {/* cross-fade to a screenshot of the game on hover */}
        {swap && (
          <Image
            src={review.game.hoverImage}
            alt=""
            fill
            sizes="64px"
            className="scale-125 object-cover opacity-0 transition-all duration-500 group-hover/review:scale-100 group-hover/review:opacity-100"
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
          <Link
            href={`/games/${review.game.slug}#reviews`}
            className="truncate transition-colors after:absolute after:inset-0 after:content-[''] group-hover/review:text-primary"
          >
            {review.game.title}
          </Link>
          {review.game.releaseYear && (
            <span className="text-xs font-normal text-muted-foreground">{review.game.releaseYear}</span>
          )}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {review.recommended ? (
            <span className="inline-flex items-center gap-1 font-medium text-steam-blue">
              <ThumbsUpIcon className="size-3.5" /> Recommended
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-destructive">
              <ThumbsDownIcon className="size-3.5" /> Not recommended
            </span>
          )}
          {review.rating !== null && <RatingStars rating={review.rating} size="xs" />}
          {review.hoursPlayed !== null && review.hoursPlayed > 0 && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <ClockIcon className="size-3" /> {hoursLabel(review.hoursPlayed)}
            </span>
          )}
          {review.containsSpoilers && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <EyeOffIcon className="size-3" /> Spoilers
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-2 text-sm leading-relaxed whitespace-pre-line text-foreground/85",
            clamp,
            review.containsSpoilers &&
              "blur-[4px] transition-[filter] duration-300 group-focus-within/review:blur-none group-hover/review:blur-none",
          )}
        >
          {review.body}
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {formatDate(review.createdAt)}
          {review.updatedAt - review.createdAt > 60_000 && " · edited"}
        </p>
      </div>
    </article>
  )
}
