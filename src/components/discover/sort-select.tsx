"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { ArrowDownUpIcon } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT_SORT, isBrowseSort, PARAM, SORT_OPTIONS, type BrowseSort } from "@/lib/catalog/params"
import { cn } from "@/lib/utils"
import { useBrowseTransition } from "./browse-transition"

/** Presentational sort dropdown. */
export function SortSelect({
  value,
  onChange,
  className,
}: {
  value: BrowseSort
  onChange: (sort: BrowseSort) => void
  className?: string
}) {
  return (
    <Select value={value} onValueChange={(v) => isBrowseSort(v) && onChange(v)}>
      <SelectTrigger
        aria-label="Sort games"
        // the trigger's own height lives on `data-[size=default]:`, so overrides must use that variant too
        className={cn(
          "min-w-40 transition-all duration-200 hover:border-primary/40 hover:text-foreground data-[size=default]:h-9",
          className,
        )}
      >
        <ArrowDownUpIcon className="text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Sort dropdown bound to the `?sort=` param of the current URL (category pages). */
export function UrlSortSelect({ className }: { className?: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { navigate } = useBrowseTransition()
  const current = searchParams.get(PARAM.sort)
  const value = isBrowseSort(current) ? current : DEFAULT_SORT
  return (
    <SortSelect
      value={value}
      className={className}
      onChange={(sort) => {
        const params = new URLSearchParams(searchParams.toString())
        if (sort === DEFAULT_SORT) params.delete(PARAM.sort)
        else params.set(PARAM.sort, sort)
        params.delete(PARAM.page)
        const qs = params.toString()
        navigate(qs ? `${pathname}?${qs}` : pathname)
      }}
    />
  )
}
