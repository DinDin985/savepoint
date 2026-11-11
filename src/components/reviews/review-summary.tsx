import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"
import type { ReactNode } from "react"
import { formatNumber } from "@/lib/format"
import type { ReviewSummary } from "@/lib/reviews/types"
import { cn } from "@/lib/utils"
import { percent, plural, scoreFor, toneTextClass } from "./review-utils"

/**
 * Steam-style summary line:
 *   OVERALL REVIEWS:  Very Positive (12,345 reviews)
 * The label is coloured by tone (positive / mixed / negative).
 */
export function ScoreRow({
  label,
  summary,
  emptyText = "No user reviews",
  hint,
  countSuffix = true,
}: {
  label: string
  summary: ReviewSummary | null
  emptyText?: string
  hint?: ReactNode
  countSuffix?: boolean
}) {
  const score = summary && summary.total > 0 ? scoreFor(summary) : null
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="w-36 shrink-0 text-[11px] font-medium tracking-wider text-steam-muted uppercase">{label}:</dt>
      <dd className="min-w-0 text-sm">
        {score && summary ? (
          <>
            <span
              className={cn("font-semibold", toneTextClass[score.tone])}
              title={`${percent(summary.positive, summary.total)}% of ${formatNumber(summary.total)} user reviews are positive`}
            >
              {score.label}
            </span>{" "}
            <span className="text-steam-muted tabular-nums">
              ({formatNumber(summary.total)}
              {countSuffix ? ` ${plural(summary.total, "review")}` : ""})
            </span>
          </>
        ) : (
          <span className="text-steam-muted">{emptyText}</span>
        )}
        {hint ? <span className="ml-2 text-[11px] text-steam-muted/80">{hint}</span> : null}
      </dd>
    </div>
  )
}

/** Horizontal positive-vs-negative proportion bar with percentages. */
export function ProportionBar({ summary, className }: { summary: ReviewSummary; className?: string }) {
  const pos = percent(summary.positive, summary.total)
  const neg = summary.total > 0 ? 100 - pos : 0
  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/5"
        role="img"
        aria-label={`${pos}% positive, ${neg}% negative`}
      >
        <div
          className="h-full bg-steam-positive transition-[width] duration-700 ease-out"
          style={{ width: `${summary.total > 0 ? (summary.positive / summary.total) * 100 : 0}%` }}
        />
        <div
          className="h-full bg-steam-negative transition-[width] duration-700 ease-out"
          style={{ width: `${summary.total > 0 ? (summary.negative / summary.total) * 100 : 0}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs tabular-nums">
        <span className="inline-flex items-center gap-1 text-steam-text">
          <ThumbsUpIcon className="size-3.5 text-steam-blue" aria-hidden />
          <span className="font-semibold text-steam-blue">{pos}%</span> positive
          <span className="hidden text-steam-muted min-[400px]:inline">({formatNumber(summary.positive)})</span>
        </span>
        <span className="inline-flex items-center gap-1 text-steam-text">
          <span className="hidden text-steam-muted min-[400px]:inline">({formatNumber(summary.negative)})</span>
          <span className="font-semibold">{neg}%</span> negative
          <ThumbsDownIcon className="size-3.5 text-steam-negative" aria-hidden />
        </span>
      </div>
    </div>
  )
}
