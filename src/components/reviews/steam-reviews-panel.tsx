"use client"

import { InfoIcon, MessageSquareTextIcon } from "lucide-react"
import { useCallback } from "react"
import type { SteamOverview, SteamReviewPage } from "@/lib/reviews/types"
import { ReviewCard } from "./review-card"
import { ReviewFilterBar } from "./review-filters"
import { ReviewHistogramChart } from "./review-histogram"
import { LoadMore, ReviewListSkeleton, StoreLinkButton, StoreNotice } from "./review-states"
import { ProportionBar, ScoreRow } from "./review-summary"
import { getJson } from "./review-utils"
import { useReviewList, type ReviewFilters, type ReviewPageFetcher } from "./use-review-list"

const DEFAULT_FILTERS: ReviewFilters = { sort: "helpful", type: "all" }

const TYPE_WORD = { all: "", positive: "positive ", negative: "negative " } as const

/** Steam tab: summary rows, proportion bar, histogram and a paginated review list. */
export function SteamReviewsPanel({
  appId,
  overview,
  initialPage,
  initialError,
  storeUrl,
  signedIn,
  signInHref,
}: {
  appId: number
  overview: SteamOverview
  initialPage: SteamReviewPage | null
  initialError: string | null
  storeUrl: string
  signedIn: boolean
  signInHref: string
}) {
  const fetchPage = useCallback<ReviewPageFetcher<string>>(
    async (filters, next, signal) => {
      const params = new URLSearchParams({
        appId: String(appId),
        filter: filters.sort,
        type: filters.type,
        cursor: next ?? "*",
      })
      const page = await getJson<SteamReviewPage>(`/api/reviews/steam?${params}`, signal)
      return { reviews: page.reviews, next: page.cursor }
    },
    [appId],
  )

  const list = useReviewList<string>({
    initial: initialPage ? { reviews: initialPage.reviews, next: initialPage.cursor } : null,
    initialError,
    initialFilters: DEFAULT_FILTERS,
    fetchPage,
  })

  const allReviewsUrl = `https://steamcommunity.com/app/${appId}/reviews/`

  return (
    <div className="space-y-4">
      <SteamSummary overview={overview} storeUrl={storeUrl} allReviewsUrl={allReviewsUrl} />

      <ReviewFilterBar
        filters={list.filters}
        onChange={list.setFilters}
        trailing={
          <span className="inline-flex items-center gap-1">
            <MessageSquareTextIcon className="size-3.5" aria-hidden />
            English reviews from Steam
          </span>
        }
      />

      {list.phase === "loading" ? (
        <ReviewListSkeleton count={3} />
      ) : list.phase === "error" ? (
        <StoreNotice
          title="Steam reviews are unavailable right now"
          description={list.error ?? "Steam didn't respond. You can still read them on the Steam store."}
          onRetry={list.retry}
          href={allReviewsUrl}
          linkLabel="Read reviews on Steam"
        />
      ) : list.reviews.length === 0 ? (
        <StoreNotice
          icon={<MessageSquareTextIcon className="size-5" aria-hidden />}
          title={`No ${TYPE_WORD[list.filters.type]}English reviews to show`}
          description={
            list.filters.type !== "all" ? (
              <button
                type="button"
                onClick={() => list.setFilters({ ...list.filters, type: "all" })}
                className="font-medium text-steam-blue transition-colors hover:text-white hover:underline"
              >
                Show all reviews instead
              </button>
            ) : (
              "Steam doesn't have any English reviews for this game yet."
            )
          }
          href={allReviewsUrl}
          linkLabel="Open on Steam"
        />
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
            endMessage={
              <>
                That&apos;s all for these filters ·{" "}
                <a
                  href={allReviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-steam-blue transition-colors hover:text-white hover:underline"
                >
                  more on Steam
                </a>
              </>
            }
          />
        </div>
      )}
    </div>
  )
}

function SteamSummary({
  overview,
  storeUrl,
  allReviewsUrl,
}: {
  overview: SteamOverview
  storeUrl: string
  allReviewsUrl: string
}) {
  if (!overview.overall && !overview.histogram) {
    return (
      <StoreNotice
        title="Steam's review summary is unavailable right now"
        description="We couldn't reach Steam. The store page always has the latest numbers."
        href={storeUrl}
        linkLabel="Open on Steam"
      />
    )
  }
  return (
    <div className="grid gap-5 rounded-md bg-steam-panel p-4 ring-1 ring-white/5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <dl className="space-y-2">
          <ScoreRow label="Overall reviews" summary={overview.overall} />
          <ScoreRow
            label="Recent reviews"
            summary={overview.recent}
            emptyText={overview.histogram ? "No reviews in the last 30 days" : "Unavailable"}
            hint={overview.recent ? "last 30 days" : undefined}
          />
        </dl>
        {overview.overall ? <ProportionBar summary={overview.overall} /> : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-steam-muted">
          <span className="inline-flex items-center gap-1">
            <InfoIcon className="size-3.5" aria-hidden />
            {overview.live ? "Live from Steam · all languages" : "Steam snapshot · live data unavailable"}
          </span>
          <StoreLinkButton href={allReviewsUrl} className="ml-auto">
            All reviews on Steam
          </StoreLinkButton>
        </div>
      </div>
      {overview.histogram ? (
        <ReviewHistogramChart histogram={overview.histogram} title="Steam review history" />
      ) : (
        <div className="flex min-h-40 items-center justify-center rounded-sm bg-black/20 text-xs text-steam-muted">
          Review history chart unavailable
        </div>
      )}
    </div>
  )
}
