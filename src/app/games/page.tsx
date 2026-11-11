import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { BrowsePagination } from "@/components/discover/browse-pagination"
import { BrowseTransitionProvider, PendingDim } from "@/components/discover/browse-transition"
import { FilterBar, FilterBarSkeleton } from "@/components/discover/filter-bar"
import { QuickPicks } from "@/components/discover/quick-picks"
import { LoadError, NoResults, SignInCta } from "@/components/discover/states"
import { GameGrid } from "@/components/game/game-card"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/current-user"
import { loadSafely } from "@/lib/catalog/load"
import {
  BROWSE_PAGE_SIZE,
  browseHref,
  hasActiveFilters,
  parseBrowseParams,
  sortLabel,
  toSearchParams,
} from "@/lib/catalog/params"
import { browseGames, categoryCounts } from "@/lib/catalog/queries"
import { formatNumber } from "@/lib/format"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const filters = parseBrowseParams(await searchParams)
  return {
    title: filters.q ? `“${filters.q}” — Search games` : "Browse games",
    description:
      "Search and filter the Savepoint catalog by genre, art style, studio size and platform — Steam, Epic and Nintendo games.",
  }
}

export default async function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const rawParams = await searchParams
  const filters = parseBrowseParams(rawParams)
  const [user, result, counts] = await Promise.all([
    getCurrentUser(),
    loadSafely("browse.games", browseGames({ ...filters, pageSize: BROWSE_PAGE_SIZE })),
    loadSafely("browse.counts", categoryCounts()),
  ])

  const canonical = toSearchParams(filters)
  const qs = canonical.toString()
  const currentPath = qs ? `/games?${qs}` : "/games"
  const active = hasActiveFilters(filters)
  // pagination keeps the sanitised filters only (unknown / malformed params are dropped)
  const pageParams: Record<string, string[]> = {}
  for (const [key, value] of canonical) (pageParams[key] ??= []).push(value)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="font-pixel text-[10px] tracking-[0.2em] text-primary uppercase">Browse</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          {filters.q ? (
            <>
              Results for <span className="text-primary">“{filters.q}”</span>
            </>
          ) : (
            "Find your next game"
          )}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Search the catalog by title or developer and filter by genre, art style, studio size and platform — from
          Steam and Epic hits to Nintendo Switch exclusives.
        </p>
      </header>

      <BrowseTransitionProvider>
        <div className="space-y-4">
          <Suspense fallback={<FilterBarSkeleton />}>
            <FilterBar counts={counts.ok ? counts.data : {}} />
          </Suspense>
          {!active && <QuickPicks />}
        </div>

        {!user && <SignInCta next={currentPath} className="mt-6" />}

        <PendingDim className="mt-6">
          {!result.ok ? (
            <LoadError retryHref={currentPath} />
          ) : result.data.total === 0 ? (
            <NoResults
              title={filters.q ? `No games found for “${filters.q}”` : undefined}
              description={
                filters.q
                  ? "Check the spelling, try a developer name, or clear your filters."
                  : "Try removing a filter — or start over with the whole catalog."
              }
              action={
                <>
                  <Button asChild className="h-9 px-3">
                    <Link href={browseHref({ sort: filters.sort })}>Clear filters</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-9 px-3">
                    <Link href="/categories">Explore categories</Link>
                  </Button>
                </>
              }
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 text-sm text-muted-foreground">
                <p>
                  Showing{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {formatNumber((result.data.page - 1) * result.data.pageSize + 1)}–
                    {formatNumber((result.data.page - 1) * result.data.pageSize + result.data.games.length)}
                  </span>{" "}
                  of <span className="font-medium text-foreground tabular-nums">{formatNumber(result.data.total)}</span>{" "}
                  {result.data.total === 1 ? "game" : "games"}
                </p>
                <p className="text-xs">Sorted by {sortLabel(filters.sort).toLowerCase()}</p>
              </div>
              <GameGrid games={result.data.games} />
              <BrowsePagination
                className="mt-10"
                page={result.data.page}
                pageCount={result.data.pageCount}
                pathname="/games"
                searchParams={pageParams}
              />
            </>
          )}
        </PendingDim>
      </BrowseTransitionProvider>
    </div>
  )
}
