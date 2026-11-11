import { StarIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ratingToStars } from "@/lib/format"
import type { RatingHistogram as Histogram } from "@/lib/profile/types"

/** Letterboxd-style mini histogram of a user's ratings (½★ … ★★★★★). */
export function RatingHistogram({ histogram }: { histogram: Histogram }) {
  const max = Math.max(1, ...histogram.buckets)
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Ratings</p>
        <p className="text-xs text-muted-foreground">
          {histogram.total} rated
          {histogram.average !== null && (
            <>
              {" · "}
              <span className="font-semibold text-star">{(histogram.average / 2).toFixed(1)}</span> avg
            </>
          )}
        </p>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <StarIcon className="mb-0.5 size-3 shrink-0 text-star" fill="currentColor" aria-hidden />
        <div className="flex h-20 flex-1 items-end gap-[3px]" role="list" aria-label="Rating distribution">
          {histogram.buckets.map((n, i) => {
            const pct = n === 0 ? 0 : Math.max(8, (n / max) * 100)
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    role="listitem"
                    aria-label={`${ratingToStars(i + 1)}: ${n}`}
                    className="group/bar flex h-full flex-1 cursor-default items-end rounded-sm transition-colors hover:bg-muted/40"
                  >
                    <div
                      className="w-full rounded-sm bg-muted-foreground/40 transition-all duration-200 group-hover/bar:bg-primary group-hover/bar:shadow-[0_0_12px_-2px_var(--primary)]"
                      style={{ height: `${pct}%`, minHeight: n ? 3 : 1 }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {n} × {ratingToStars(i + 1)}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
        <span className="mb-0.5 shrink-0 text-[10px] leading-none tracking-tighter text-star">★★★★★</span>
      </div>
    </div>
  )
}
