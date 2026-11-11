import { CloudOffIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/* Shared loading / notice / pagination pieces for the reviews area. Hook-free,
 * so they render in both server and client components. */

export function ReviewCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-md bg-steam-panel ring-1 ring-white/5 sm:flex-row" aria-hidden>
      <div className="flex items-center gap-3 border-b border-white/5 bg-black/15 p-3 sm:w-44 sm:flex-col sm:items-start sm:border-r sm:border-b-0 md:w-48">
        <Skeleton className="size-10 rounded-sm bg-white/10" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-24 bg-white/10" />
          <Skeleton className="h-2.5 w-20 bg-white/5" />
        </div>
      </div>
      <div className="flex-1 space-y-3 p-3 sm:p-4">
        <div className="flex items-center gap-3 rounded-sm bg-steam-panel-2/60 p-2">
          <Skeleton className="size-10 rounded-sm bg-white/10" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32 bg-white/10" />
            <Skeleton className="h-3 w-40 bg-white/5" />
          </div>
        </div>
        <Skeleton className="h-2.5 w-36 bg-white/5" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full bg-white/5" />
          <Skeleton className="h-3 w-[92%] bg-white/5" />
          <Skeleton className="h-3 w-[78%] bg-white/5" />
        </div>
        <Skeleton className="h-7 w-48 bg-white/5" />
      </div>
    </div>
  )
}

export function ReviewListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading reviews">
      {Array.from({ length: count }, (_, i) => (
        <ReviewCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function SummarySkeleton() {
  return (
    <div className="grid gap-5 rounded-md bg-steam-panel p-4 ring-1 ring-white/5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" aria-hidden>
      <div className="space-y-3">
        <Skeleton className="h-4 w-60 max-w-full bg-white/10" />
        <Skeleton className="h-4 w-48 max-w-full bg-white/5" />
        <Skeleton className="mt-4 h-2.5 w-full rounded-full bg-white/10" />
        <Skeleton className="h-3 w-full bg-white/5" />
      </div>
      <Skeleton className="h-48 w-full bg-white/5" />
    </div>
  )
}

/** Suspense fallback for the whole section body. */
export function ReviewsBodySkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading reviews">
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="space-y-4 rounded-lg bg-steam-bg p-3 sm:p-4">
        <SummarySkeleton />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-48 bg-white/10" />
          <Skeleton className="h-8 w-56 bg-white/10" />
        </div>
        <ReviewListSkeleton count={2} />
      </div>
    </div>
  )
}

/** Steam-styled notice for an unavailable upstream (Steam / Epic down). */
export function StoreNotice({
  title,
  description,
  href,
  linkLabel,
  onRetry,
  icon,
  className,
}: {
  title: string
  description?: ReactNode
  href?: string | null
  linkLabel?: string
  onRetry?: () => void
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-start gap-3 rounded-md border border-white/5 bg-steam-panel p-4 text-steam-text sm:flex-row sm:items-center",
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-black/30 text-steam-muted">
        {icon ?? <CloudOffIcon className="size-5" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <div className="mt-0.5 text-xs text-steam-muted">{description}</div> : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-steam-panel-2 px-3 text-xs font-medium text-steam-text ring-1 ring-white/10 transition-all duration-200 hover:scale-105 hover:bg-white/15 hover:text-white active:scale-95 sm:h-8"
          >
            <RefreshCwIcon className="size-3.5" aria-hidden />
            Try again
          </button>
        ) : null}
        {href ? <StoreLinkButton href={href}>{linkLabel ?? "Open store page"}</StoreLinkButton> : null}
      </div>
    </div>
  )
}

/** Steam-blue gradient call-to-action that opens a store page in a new tab. */
export function StoreLinkButton({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-sm bg-steam-blue/85 px-3 text-xs font-semibold text-steam-panel shadow-sm transition-all duration-200 sm:h-8",
        "hover:scale-105 hover:bg-steam-blue hover:shadow-[0_0_18px_-4px_var(--steam-blue)] active:scale-95",
        className,
      )}
    >
      {children}
      <ExternalLinkIcon className="size-3.5" aria-hidden />
    </a>
  )
}

/** "Load more" button + end-of-list message + inline error for the next page. */
export function LoadMore({
  hasMore,
  loading,
  error,
  onLoadMore,
  count,
  endMessage,
}: {
  hasMore: boolean
  loading: boolean
  error: string | null
  onLoadMore: () => void
  count: number
  endMessage?: ReactNode
}) {
  if (count === 0) return null
  if (!hasMore) {
    return (
      <div className="flex items-center gap-3 py-2 text-xs text-steam-muted">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-center">{endMessage ?? "You've reached the end of the reviews."}</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-2 pt-1">
      {error ? <p className="text-xs text-steam-muted">Couldn&apos;t load more reviews: {error}</p> : null}
      <button
        type="button"
        onClick={onLoadMore}
        disabled={loading}
        className="inline-flex h-9 w-full max-w-xs items-center justify-center gap-2 rounded-sm bg-steam-panel-2 text-sm font-medium text-steam-text ring-1 ring-white/10 transition-all duration-200 hover:scale-[1.03] hover:bg-steam-blue hover:text-steam-panel disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100 disabled:hover:bg-steam-panel-2 disabled:hover:text-steam-text"
      >
        {loading ? <Spinner className="size-4" /> : null}
        {loading ? "Loading…" : error ? "Try again" : "Load more reviews"}
      </button>
    </div>
  )
}
