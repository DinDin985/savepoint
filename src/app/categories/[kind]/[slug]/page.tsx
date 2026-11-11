import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { BrowseTransitionProvider, PendingDim, PendingIndicator } from "@/components/discover/browse-transition"
import { CategoryHeader } from "@/components/discover/category-header"
import { UrlSortSelect } from "@/components/discover/sort-select"
import { LoadError, NoResults, SignInCta } from "@/components/discover/states"
import { GameGrid } from "@/components/game/game-card"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/current-user"
import { loadSafely } from "@/lib/catalog/load"
import { categoryBrowseHref, countKey, DEFAULT_SORT, isBrowseSort, PARAM, sortLabel } from "@/lib/catalog/params"
import { categoryCounts, gamesInCategory } from "@/lib/catalog/queries"
import type { CategoryKind } from "@/lib/db/schema"
import { formatNumber } from "@/lib/format"
import { CATEGORY_KINDS, categoryHref, isCategoryKind } from "@/lib/taxonomy"
import { cn } from "@/lib/utils"

type Params = Promise<{ kind: string; slug: string }>
type SearchParams = Promise<Record<string, string | string[] | undefined>>

function resolveCategory(kind: string, slug: string) {
  if (!isCategoryKind(kind)) return null
  const group = CATEGORY_KINDS.find((k) => k.kind === kind)
  const item = group?.items.find((i) => i.slug === slug)
  return group && item ? { kind: kind as CategoryKind, group, item } : null
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { kind, slug } = await params
  const resolved = resolveCategory(kind, slug)
  if (!resolved) return { title: "Category not found" }
  return {
    title: `${resolved.item.label} games`,
    description: `${resolved.item.blurb} Browse ${resolved.item.label.toLowerCase()} games on Savepoint — rate, review and track them.`,
  }
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { kind, slug } = await params
  const resolved = resolveCategory(kind, slug)
  if (!resolved) notFound()

  const sp = await searchParams
  const rawSort = Array.isArray(sp[PARAM.sort]) ? sp[PARAM.sort]?.[0] : sp[PARAM.sort]
  const sort = isBrowseSort(rawSort) ? rawSort : DEFAULT_SORT
  const currentPath = `${categoryHref(resolved.kind, resolved.item.slug)}${sort !== DEFAULT_SORT ? `?${PARAM.sort}=${sort}` : ""}`

  const [user, result, counts] = await Promise.all([
    getCurrentUser(),
    loadSafely("category.games", gamesInCategory(resolved.kind, resolved.item.slug, sort)),
    loadSafely("category.counts", categoryCounts()),
  ])

  const games = result.ok ? result.data.games : []
  const related = resolved.group.items
    .map((item) => ({ ...item, count: counts.ok ? (counts.data[countKey(resolved.kind, item.slug)] ?? 0) : 0 }))
    .filter((item) => item.count > 0 || item.slug === resolved.item.slug)
  const nintendo = resolved.kind === "platform" && resolved.item.slug === "nintendo"

  return (
    <>
      <CategoryHeader
        kindLabel={resolved.group.label}
        kindAnchor={resolved.kind}
        label={resolved.item.label}
        blurb={resolved.item.blurb}
        count={
          result.ok
            ? games.length
            : counts.ok
              ? (counts.data[countKey(resolved.kind, resolved.item.slug)] ?? 0)
              : null
        }
        backdrop={result.ok ? result.data.backdrop : null}
        browseHref={categoryBrowseHref(resolved.kind, resolved.item.slug, sort)}
        accent={nintendo ? "liked" : "primary"}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {!user && <SignInCta next={currentPath} className="mb-8" />}

        <BrowseTransitionProvider>
          {!result.ok ? (
            <LoadError retryHref={currentPath} />
          ) : games.length === 0 ? (
            <NoResults
              title={`No ${resolved.item.label.toLowerCase()} games yet`}
              description="We haven't added any games to this category yet. Check back soon — or explore the rest of the catalog."
              action={
                <>
                  <Button asChild className="h-9 px-3">
                    <Link href="/games">Browse all games</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-9 px-3">
                    <Link href="/categories">All categories</Link>
                  </Button>
                </>
              }
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground tabular-nums">{formatNumber(games.length)}</span>{" "}
                  {games.length === 1 ? "game" : "games"} · {sortLabel(sort).toLowerCase()}
                </p>
                <div className="flex items-center gap-3">
                  <PendingIndicator />
                  <Suspense fallback={<div className="h-9 w-44 animate-pulse rounded-lg bg-muted" />}>
                    <UrlSortSelect />
                  </Suspense>
                </div>
              </div>
              <PendingDim>
                <GameGrid games={games} />
              </PendingDim>
            </>
          )}
        </BrowseTransitionProvider>

        {related.length > 1 && (
          <section aria-labelledby="related-title" className="mt-14 border-t border-white/5 pt-8">
            <h2 id="related-title" className="font-pixel text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              More {resolved.group.plural.toLowerCase()}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {related.map((item) => {
                const current = item.slug === resolved.item.slug
                return (
                  <Link
                    key={item.slug}
                    href={categoryHref(resolved.kind, item.slug)}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "group/related inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-all duration-200 hover:scale-105",
                      current
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-white/10 bg-card/60 hover:border-primary/50 hover:bg-primary/10 hover:text-primary",
                      item.slug === "nintendo" && !current && "border-liked/40 text-liked hover:border-liked/70 hover:bg-liked/15 hover:text-liked",
                    )}
                  >
                    {item.label}
                    <span className="text-xs text-muted-foreground tabular-nums group-hover/related:text-current">{item.count}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
