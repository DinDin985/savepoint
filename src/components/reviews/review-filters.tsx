"use client"

import { ClockIcon, SparklesIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"
import type { ReactNode } from "react"
import type { ReviewSort, ReviewTypeFilter } from "@/lib/reviews/types"
import { cn } from "@/lib/utils"
import type { ReviewFilters } from "./use-review-list"

type Option<V extends string> = { readonly value: V; readonly label: string; readonly icon?: ReactNode }

const SORTS: readonly Option<ReviewSort>[] = [
  { value: "helpful", label: "Most helpful", icon: <SparklesIcon className="size-3.5" aria-hidden /> },
  { value: "recent", label: "Recent", icon: <ClockIcon className="size-3.5" aria-hidden /> },
]

const TYPES: readonly Option<ReviewTypeFilter>[] = [
  { value: "all", label: "All" },
  { value: "positive", label: "Positive", icon: <ThumbsUpIcon className="size-3.5" aria-hidden /> },
  { value: "negative", label: "Negative", icon: <ThumbsDownIcon className="size-3.5" aria-hidden /> },
]

function Segmented<V extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string
  options: readonly Option<V>[]
  value: V
  onChange: (value: V) => void
  disabled?: boolean
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex max-w-full items-center rounded-sm bg-black/30 p-0.5 ring-1 ring-white/5"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => {
              if (!active) onChange(option.value)
            }}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-[3px] px-2.5 text-xs font-medium whitespace-nowrap transition-all duration-200 sm:h-7",
              "focus-visible:outline-1 focus-visible:outline-steam-blue disabled:cursor-wait",
              active
                ? "bg-steam-blue text-steam-panel shadow-sm"
                : "text-steam-text hover:scale-105 hover:bg-white/10 hover:text-white",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** "Most helpful | Recent" and "All | Positive | Negative" segmented controls. */
export function ReviewFilterBar({
  filters,
  onChange,
  busy,
  trailing,
}: {
  filters: ReviewFilters
  onChange: (filters: ReviewFilters) => void
  busy?: boolean
  trailing?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        label="Sort reviews"
        options={SORTS}
        value={filters.sort}
        onChange={(sort) => onChange({ ...filters, sort })}
        disabled={busy}
      />
      <Segmented
        label="Filter by verdict"
        options={TYPES}
        value={filters.type}
        onChange={(type) => onChange({ ...filters, type })}
        disabled={busy}
      />
      {trailing ? <div className="ml-auto text-xs text-steam-muted">{trailing}</div> : null}
    </div>
  )
}
