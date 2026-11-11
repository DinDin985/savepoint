import Link from "next/link"
import { ClockIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"
import { RatingStars } from "@/components/game/rating-stars"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/user/user-avatar"
import type { CommunityReview } from "@/lib/catalog/community"
import { timeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CoverArt } from "./cover-art"

/** Grid of the latest community reviews. */
export function FreshReviews({ reviews }: { reviews: readonly CommunityReview[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: CommunityReview }) {
  const { author, game } = review
  const Thumb = review.recommended ? ThumbsUpIcon : ThumbsDownIcon
  return (
    <article className="group/review hover-lift relative flex gap-3 rounded-xl border border-white/5 bg-card/70 p-3 transition-all duration-300 hover:border-white/15 hover:bg-card sm:p-4">
      <Link
        href={`/games/${game.slug}`}
        aria-label={game.title}
        className="relative aspect-[2/3] w-16 shrink-0 self-start overflow-hidden rounded-md bg-muted ring-1 ring-white/10 transition-all duration-300 hover:ring-2 hover:ring-primary sm:w-20"
      >
        <span className="absolute inset-0 transition-transform duration-500 group-hover/review:scale-110">
          <CoverArt src={game.coverImage} sizes="80px" />
        </span>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/u/${author.username}`}
            className="group/author -my-1.5 flex min-w-0 items-center gap-2 rounded-full py-1.5 transition-all duration-200 hover:scale-[1.03]"
          >
            <UserAvatar user={author} size="xs" />
            <span className="truncate text-xs font-semibold transition-colors group-hover/author:text-primary">
              {author.displayName}
            </span>
          </Link>
          <span
            className={cn(
              "ml-auto flex size-6 shrink-0 items-center justify-center rounded-md",
              review.recommended ? "bg-steam-positive/15 text-steam-positive" : "bg-steam-negative/20 text-steam-negative",
            )}
            title={review.recommended ? "Recommended" : "Not recommended"}
          >
            <Thumb className="size-3.5" />
            <span className="sr-only">{review.recommended ? "Recommended" : "Not recommended"}</span>
          </span>
        </div>

        <Link
          href={`/games/${game.slug}`}
          className="-mb-1.5 block truncate py-1.5 text-sm font-semibold tracking-tight transition-colors hover:text-primary"
        >
          {game.title}
          {game.releaseYear && <span className="ml-1 font-normal text-muted-foreground">{game.releaseYear}</span>}
        </Link>

        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          {review.rating !== null && <RatingStars rating={review.rating} size="xs" />}
          {review.hoursPlayed !== null && (
            <span className="inline-flex items-center gap-0.5">
              <ClockIcon className="size-3" />
              {review.hoursPlayed.toLocaleString("en-US", { maximumFractionDigits: 1 })} h
            </span>
          )}
          <span>{timeAgo(review.createdAt)}</span>
        </div>

        {review.containsSpoilers ? (
          <p className="mt-2 text-xs text-muted-foreground italic">
            This review contains spoilers —{" "}
            <Link href={`/games/${game.slug}`} className="text-foreground not-italic underline-offset-4 hover:text-primary hover:underline">
              read it on the game page
            </Link>
            .
          </p>
        ) : (
          <p className="mt-2 line-clamp-3 text-sm/relaxed text-foreground/85">{review.snippet}</p>
        )}
      </div>
    </article>
  )
}

export function FreshReviewsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-white/5 bg-card/70 p-4">
          <Skeleton className="aspect-[2/3] w-20 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  )
}
