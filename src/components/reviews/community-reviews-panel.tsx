"use client"

import { LogInIcon, MessagesSquareIcon, PenLineIcon, ShoppingBagIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { CommunityOverview, CommunityReviewPage } from "@/lib/reviews/types"
import { ReviewCard } from "./review-card"
import { ReviewFilterBar } from "./review-filters"
import { ReviewHistogramChart } from "./review-histogram"
import { LoadMore, ReviewListSkeleton, StoreLinkButton, StoreNotice } from "./review-states"
import { ProportionBar, ScoreRow } from "./review-summary"
import { getJson, REVIEW_FORM_IDS, scrollToReviewForm } from "./review-utils"
import { useReviewList, type ReviewFilters, type ReviewPageFetcher } from "./use-review-list"

const DEFAULT_FILTERS: ReviewFilters = { sort: "helpful", type: "all" }

/** Where a Savepoint-only game is sold without public player reviews (e.g. Nintendo eShop). */
export type StoreWithoutReviews = { readonly name: string; readonly url: string }

/** Savepoint tab: community summary + chart, filters and paginated, votable reviews. */
export function CommunityReviewsPanel({
  gameId,
  gameTitle,
  overview,
  initialPage,
  initialError,
  signedIn,
  signInHref,
  storeWithoutReviews,
}: {
  gameId: number
  gameTitle: string
  overview: CommunityOverview | null
  initialPage: CommunityReviewPage | null
  initialError: string | null
  signedIn: boolean
  signInHref: string
  storeWithoutReviews: StoreWithoutReviews | null
}) {
  const fetchPage = useCallback<ReviewPageFetcher<number>>(
    async (filters, next, signal) => {
      const params = new URLSearchParams({
        gameId: String(gameId),
        filter: filters.sort,
        type: filters.type,
        offset: String(next ?? 0),
      })
      const page = await getJson<CommunityReviewPage>(`/api/reviews/community?${params}`, signal)
      return { reviews: page.reviews, next: page.nextOffset }
    },
    [gameId],
  )

  const router = useRouter()
  const [refreshing, startRefresh] = useTransition()
  const hasReviews = (overview?.overall.total ?? 0) > 0
  const list = useReviewList<number>({
    // nothing to fetch when there are no reviews at all
    initial: initialPage
      ? { reviews: initialPage.reviews, next: initialPage.nextOffset }
      : hasReviews
        ? null
        : { reviews: [], next: null },
    initialError,
    initialFilters: DEFAULT_FILTERS,
    fetchPage,
  })

  const storeNote = storeWithoutReviews ? <StoreWithoutReviewsNote store={storeWithoutReviews} gameTitle={gameTitle} /> : null

  if (!overview) {
    return (
      <StoreNotice
        title="Savepoint reviews couldn't be loaded"
        description={refreshing ? "Retrying…" : (initialError ?? "Please try again in a moment.")}
        onRetry={() => startRefresh(() => router.refresh())}
      />
    )
  }

  if (!hasReviews) {
    return (
      <div className="space-y-4">
        <Empty className="border border-dashed border-white/10 bg-steam-panel py-10 text-steam-text">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-12 rounded-md bg-steam-blue/15 text-steam-blue">
              <MessagesSquareIcon className="size-6" aria-hidden />
            </EmptyMedia>
            <EmptyTitle className="text-base text-steam-text">No Savepoint reviews yet</EmptyTitle>
            <EmptyDescription className="text-steam-muted">
              Be the first to tell other players whether {gameTitle} is worth their time.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ReviewCta signedIn={signedIn} signInHref={signInHref} label="Be the first to review" />
          </EmptyContent>
        </Empty>
        {storeNote}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-5 rounded-md bg-steam-panel p-4 ring-1 ring-white/5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <dl className="space-y-2">
            <ScoreRow label="Overall reviews" summary={overview.overall} />
            <ScoreRow
              label="Recent reviews"
              summary={overview.recent.total > 0 ? overview.recent : null}
              emptyText="No reviews in the last 30 days"
              hint={overview.recent.total > 0 ? "last 30 days" : undefined}
            />
          </dl>
          <ProportionBar summary={overview.overall} />
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 rounded-sm bg-black/20 p-3">
            <p className="text-xs text-steam-muted">
              {signedIn ? "Played it? Add your voice." : "Sign in to write a review and vote on others."}
            </p>
            <ReviewCta signedIn={signedIn} signInHref={signInHref} label="Write a review" size="sm" />
          </div>
        </div>
        <ReviewHistogramChart histogram={overview.histogram} title="Savepoint review history" />
      </div>

      {storeNote}

      <ReviewFilterBar
        filters={list.filters}
        onChange={list.setFilters}
        trailing={`${overview.overall.total.toLocaleString("en-US")} Savepoint ${overview.overall.total === 1 ? "review" : "reviews"}`}
      />

      {list.phase === "loading" ? (
        <ReviewListSkeleton count={Math.min(3, overview.overall.total)} />
      ) : list.phase === "error" ? (
        <StoreNotice title="Couldn't load Savepoint reviews" description={list.error} onRetry={list.retry} />
      ) : list.reviews.length === 0 ? (
        <Empty className="border border-dashed border-white/10 bg-steam-panel py-8 text-steam-text">
          <EmptyHeader>
            <EmptyTitle className="text-steam-text">
              {list.filters.type === "all" ? "No reviews yet" : `No ${list.filters.type} reviews yet`}
            </EmptyTitle>
            <EmptyDescription className="text-steam-muted">Try a different filter.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              size="sm"
              variant="outline"
              className="h-9 border-white/10 bg-steam-panel-2 text-steam-text hover:bg-steam-blue hover:text-steam-panel sm:h-7"
              onClick={() => list.setFilters({ ...list.filters, type: "all" })}
            >
              Show all reviews
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          {list.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} signedIn={signedIn} signInHref={signInHref} />
          ))}
          <LoadMore
            count={list.reviews.length}
            hasMore={list.hasMore}
            loading={list.loadingMore}
            error={list.moreError}
            onLoadMore={list.loadMore}
          />
        </div>
      )}
    </div>
  )
}

/** "Write a review" → the game page's log form (#log), or sign in first. */
function ReviewCta({
  signedIn,
  signInHref,
  label,
  size = "default",
}: {
  signedIn: boolean
  signInHref: string
  label: string
  size?: "sm" | "default"
}) {
  // ≥ 36px tap target on phones; compact on larger screens for the small variant
  const sizeClass = size === "sm" ? "h-9 sm:h-7" : "h-9 px-4"
  if (!signedIn) {
    return (
      <Button asChild size={size} className={sizeClass}>
        <Link href={signInHref}>
          <LogInIcon data-icon="inline-start" aria-hidden />
          Sign in to review
        </Link>
      </Button>
    )
  }
  return (
    <Button asChild size={size} className={sizeClass}>
      <a
        href={`#${REVIEW_FORM_IDS[REVIEW_FORM_IDS.length - 1]}`}
        onClick={(event) => {
          if (scrollToReviewForm()) event.preventDefault()
        }}
      >
        <PenLineIcon data-icon="inline-start" aria-hidden />
        {label}
      </a>
    </Button>
  )
}

function StoreWithoutReviewsNote({ store, gameTitle }: { store: StoreWithoutReviews; gameTitle: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-white/5 bg-steam-panel p-4 text-steam-text sm:flex-row sm:items-center">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-black/30 text-steam-mixed">
        <ShoppingBagIcon className="size-5" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 text-xs text-steam-muted">
        <span className="font-semibold text-steam-text">{store.name} doesn&apos;t publish player reviews.</span> Savepoint
        reviews are where {gameTitle} players share their verdict.
      </p>
      <StoreLinkButton href={store.url}>View on {store.name}</StoreLinkButton>
    </div>
  )
}
