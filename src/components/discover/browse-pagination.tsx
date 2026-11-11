import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from "@/components/ui/pagination"
import { PARAM } from "@/lib/catalog/params"
import { cn } from "@/lib/utils"
import { TransitionLink } from "./browse-transition"

type SearchParamsRecord = Readonly<Record<string, string | readonly string[] | undefined>>

function hrefForPage(pathname: string, searchParams: SearchParamsRecord, page: number): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === PARAM.page || value === undefined) continue
    for (const v of typeof value === "string" ? [value] : value) params.append(key, v)
  }
  if (page > 1) params.set(PARAM.page, String(page))
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

/** 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  const pages = new Set([1, pageCount, page - 2, page - 1, page, page + 1, page + 2].filter((p) => p >= 1 && p <= pageCount))
  if (page <= 4) [2, 3, 4, 5].forEach((p) => p <= pageCount && pages.add(p))
  if (page >= pageCount - 3) [pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1].forEach((p) => p >= 1 && pages.add(p))
  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | "gap")[] = []
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1]
    if (prev !== undefined && p - prev > 1) out.push("gap")
    out.push(p)
  })
  return out
}

/**
 * shadcn Pagination whose links preserve every other search param. Phones get
 * Previous · "Page x of y" · Next; wider screens get the numbered window.
 */
export function BrowsePagination({
  page,
  pageCount,
  pathname,
  searchParams,
  className,
}: {
  page: number
  pageCount: number
  pathname: string
  /** Params to keep on every page link (pass the canonical, sanitised filters). */
  searchParams: SearchParamsRecord
  className?: string
}) {
  if (pageCount <= 1) return null
  const prev = page > 1 ? hrefForPage(pathname, searchParams, page - 1) : null
  const next = page < pageCount ? hrefForPage(pathname, searchParams, page + 1) : null
  const pill = "transition-all duration-200 hover:scale-110 hover:text-primary"
  const step = cn(buttonVariants({ variant: "ghost" }), "h-9 gap-1 px-3")

  return (
    <Pagination className={className}>
      <PaginationContent className="gap-1">
        <PaginationItem>
          {prev ? (
            <TransitionLink href={prev} aria-label="Go to previous page" className={cn(step, "pl-2", pill)}>
              <ChevronLeftIcon data-icon="inline-start" />
              Previous
            </TransitionLink>
          ) : (
            <span className={cn(step, "pointer-events-none pl-2 opacity-40")} aria-disabled="true">
              <ChevronLeftIcon data-icon="inline-start" />
              Previous
            </span>
          )}
        </PaginationItem>

        <PaginationItem className="px-2 text-sm text-muted-foreground tabular-nums sm:hidden">
          Page <span className="font-medium text-foreground">{page}</span> of {pageCount}
        </PaginationItem>

        {pageWindow(page, pageCount).map((item, i) =>
          item === "gap" ? (
            <PaginationItem key={`gap-${i}`} className="hidden sm:block">
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item} className="hidden sm:block">
              <TransitionLink
                href={hrefForPage(pathname, searchParams, item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={`Page ${item}`}
                className={cn(
                  buttonVariants({ variant: item === page ? "outline" : "ghost" }),
                  "size-9 px-0 tabular-nums",
                  pill,
                  item === page && "border-primary/50 text-primary dark:border-primary/50",
                )}
              >
                {item}
              </TransitionLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          {next ? (
            <TransitionLink href={next} aria-label="Go to next page" className={cn(step, "pr-2", pill)}>
              Next
              <ChevronRightIcon data-icon="inline-end" />
            </TransitionLink>
          ) : (
            <span className={cn(step, "pointer-events-none pr-2 opacity-40")} aria-disabled="true">
              Next
              <ChevronRightIcon data-icon="inline-end" />
            </span>
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
