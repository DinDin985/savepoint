import Link from "next/link"
import { ArrowDownUpIcon } from "lucide-react"
import type { LibraryFilter, LibrarySort } from "@/lib/profile/types"
import { cn } from "@/lib/utils"

const FILTER_LABELS: Record<LibraryFilter, string> = {
  all: "All",
  played: "Played",
  playing: "Playing",
  liked: "Liked",
  rated: "Rated",
}

const SORT_LABELS: Record<LibrarySort, string> = { recent: "Recent", rating: "Rating", title: "Title" }

const hrefFor = (base: string, filter: LibraryFilter, sort: LibrarySort) => {
  const params = new URLSearchParams()
  if (filter !== "all") params.set("filter", filter)
  if (sort !== "recent") params.set("sort", sort)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

/** Filter chips (with counts) + sort switcher for /u/[username]/games — plain links, no JS. */
export function LibraryFilters({
  base,
  filter,
  sort,
  counts,
}: {
  base: string
  filter: LibraryFilter
  sort: LibrarySort
  counts: Record<LibraryFilter, number>
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <nav aria-label="Filter games" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
        {(Object.keys(FILTER_LABELS) as LibraryFilter[]).map((f) => {
          const active = f === filter
          return (
            <Link
              key={f}
              href={hrefFor(base, f, sort)}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-all duration-200 hover:scale-105 sm:h-8 sm:px-3",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_0_18px_-6px_var(--primary)]"
                  : "border-border bg-card/50 text-muted-foreground hover:border-primary/50 hover:text-primary",
              )}
            >
              {FILTER_LABELS[f]}
              <span className={cn("text-xs tabular-nums", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {counts[f]}
              </span>
            </Link>
          )
        })}
      </nav>
      <div className="flex items-center gap-2 text-sm">
        <ArrowDownUpIcon className="size-4 text-muted-foreground" aria-hidden />
        <span className="sr-only">Sort by</span>
        <div className="inline-flex rounded-lg border border-border bg-card/50 p-0.5" role="group" aria-label="Sort by">
          {(Object.keys(SORT_LABELS) as LibrarySort[]).map((s) => {
            const active = s === sort
            return (
              <Link
                key={s}
                href={hrefFor(base, filter, s)}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-md px-3 text-xs font-medium transition-all duration-200 hover:scale-105 sm:h-7 sm:px-2.5",
                  active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-primary",
                )}
              >
                {SORT_LABELS[s]}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
