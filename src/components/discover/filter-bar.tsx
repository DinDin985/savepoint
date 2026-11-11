"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { MonitorIcon, SearchIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  countKey,
  EMPTY_FILTERS,
  hasActiveFilters,
  MAX_QUERY_LENGTH,
  parseBrowseParams,
  toSearchParams,
  type BrowseFilters,
} from "@/lib/catalog/params"
import type { PlatformFamily, Tier } from "@/lib/db/schema"
import { ART_STYLES, categoryLabel, GENRES, PLATFORMS, TIERS } from "@/lib/taxonomy"
import { cn } from "@/lib/utils"
import { PendingIndicator, useBrowseTransition } from "./browse-transition"
import { MultiSelect } from "./multi-select"
import { SortSelect } from "./sort-select"

const SEARCH_DEBOUNCE_MS = 300
const ALL = "all"

/**
 * URL-driven browse controls. Local state mirrors the URL so rapid changes
 * compound instantly; every change is pushed with `router.replace` inside the
 * shared transition (the results grid dims while the server renders).
 */
export function FilterBar({ counts }: { counts: Readonly<Record<string, number>> }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlKey = searchParams.toString()
  const { navigate } = useBrowseTransition()

  const [filters, setFilters] = useState<BrowseFilters>(() => parseBrowseParams(searchParams))
  const [query, setQuery] = useState(filters.q)
  const [sync, setSync] = useState<{ seen: string; own: readonly string[] }>({ seen: urlKey, own: [] })
  const timer = useRef<number | undefined>(undefined)

  // URL changed by something other than this bar (header search, back button,
  // pagination…) → adopt it. Our own navigations are already reflected in state;
  // each one is consumed when it lands (with any older ones superseded by it),
  // so revisiting that URL later via Back/Forward is adopted like any other.
  if (urlKey !== sync.seen) {
    const ownIndex = sync.own.indexOf(urlKey)
    if (ownIndex === -1) {
      setSync({ seen: urlKey, own: [] })
      const next = parseBrowseParams(searchParams)
      setFilters({ ...next, page: 1 })
      setQuery(next.q)
    } else {
      setSync({ seen: urlKey, own: sync.own.slice(ownIndex + 1) })
    }
  }

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const commit = (patch: Partial<BrowseFilters>) => {
    window.clearTimeout(timer.current)
    const next: BrowseFilters = { ...filters, q: query.trim(), ...patch, page: 1 }
    const key = toSearchParams(next).toString()
    setFilters(next)
    if (key === urlKey) return
    setSync((s) => ({ seen: s.seen, own: [...s.own.slice(-9), key] }))
    navigate(key ? `${pathname}?${key}` : pathname)
  }

  const onQueryChange = (value: string) => {
    setQuery(value)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => commit({ q: value.trim() }), SEARCH_DEBOUNCE_MS)
  }

  const clearAll = () => {
    window.clearTimeout(timer.current)
    setQuery("")
    commit({ ...EMPTY_FILTERS, sort: filters.sort })
  }

  const genreOptions = GENRES.map((g) => ({ value: g.slug, label: g.label, count: counts[countKey("genre", g.slug)] ?? 0 }))
  const styleOptions = ART_STYLES.map((s) => ({ value: s.slug, label: s.label, count: counts[countKey("art-style", s.slug)] ?? 0 }))
  const active = hasActiveFilters(filters)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <form
          role="search"
          className="min-w-0 flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            commit({ q: query.trim() })
          }}
        >
          <InputGroup className="h-10 rounded-xl bg-input/30 transition-colors hover:border-primary/40 has-[[data-slot=input-group-control]:focus-visible]:border-primary/60">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={query}
              maxLength={MAX_QUERY_LENGTH}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.preventDefault()
                  setQuery("")
                  commit({ q: "" })
                }
              }}
              placeholder="Search by title or developer…"
              aria-label="Search games by title or developer"
              className="text-base sm:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-sm"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery("")
                    commit({ q: "" })
                  }}
                  className="rounded-full hover:bg-primary/15 hover:text-primary"
                >
                  <XIcon />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </form>
        <div className="flex items-center justify-between gap-2 lg:justify-end">
          <PendingIndicator className="lg:order-first" />
          <SortSelect value={filters.sort} onChange={(sort) => commit({ sort })} className="rounded-xl data-[size=default]:h-10" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MultiSelect
          label="Genre"
          options={genreOptions}
          selected={filters.genres}
          onChange={(genres) => commit({ genres })}
          hint="Games match every selected genre"
        />
        <MultiSelect
          label="Art style"
          options={styleOptions}
          selected={filters.artStyles}
          onChange={(artStyles) => commit({ artStyles })}
          hint="Games match any selected style"
        />

        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={filters.tier ?? ALL}
          onValueChange={(value) => commit({ tier: value && value !== ALL ? (value as Tier) : null })}
          aria-label="Studio size"
          className="max-w-full overflow-x-auto"
        >
          {[{ slug: ALL, label: "All" }, ...TIERS].map((tier) => (
            <ToggleGroupItem
              key={tier.slug}
              value={tier.slug}
              aria-label={tier.slug === ALL ? "All studio sizes" : tier.label}
              className="h-9 px-3 transition-all duration-200 hover:text-primary data-[state=on]:border-primary/50 data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
            >
              {tier.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Select
          value={filters.platform ?? ALL}
          onValueChange={(value) => commit({ platform: value === ALL ? null : (value as PlatformFamily) })}
        >
          <SelectTrigger
            aria-label="Platform"
            className={cn(
              "min-w-36 transition-all duration-200 hover:border-primary/40 data-[size=default]:h-9",
              filters.platform && "border-primary/50 bg-primary/10 text-primary dark:bg-primary/10",
            )}
          >
            <MonitorIcon className={cn("text-muted-foreground", filters.platform && "text-primary")} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            <SelectItem value={ALL}>All platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.slug} value={p.slug} disabled={(counts[countKey("platform", p.slug)] ?? 0) === 0}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {active && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
          {filters.q && (
            <FilterChip
              kicker="Search"
              label={`“${filters.q}”`}
              onRemove={() => {
                setQuery("")
                commit({ q: "" })
              }}
            />
          )}
          {filters.genres.map((g) => (
            <FilterChip
              key={`g-${g}`}
              kicker="Genre"
              label={categoryLabel("genre", g)}
              onRemove={() => commit({ genres: filters.genres.filter((x) => x !== g) })}
            />
          ))}
          {filters.artStyles.map((s) => (
            <FilterChip
              key={`s-${s}`}
              kicker="Style"
              label={categoryLabel("art-style", s)}
              onRemove={() => commit({ artStyles: filters.artStyles.filter((x) => x !== s) })}
            />
          ))}
          {filters.tier && <FilterChip kicker="Size" label={categoryLabel("tier", filters.tier)} onRemove={() => commit({ tier: null })} />}
          {filters.platform && (
            <FilterChip kicker="Platform" label={categoryLabel("platform", filters.platform)} onRemove={() => commit({ platform: null })} />
          )}
          <Button variant="ghost" onClick={clearAll} className="h-9 px-3 text-muted-foreground hover:text-primary">
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}

function FilterChip({ kicker, label, onRemove }: { kicker?: string; label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove filter ${kicker ? `${kicker} ` : ""}${label}`}
      className={cn(
        "group/chip inline-flex h-9 max-w-full items-center sm:h-8 gap-1.5 rounded-full border border-primary/30 bg-primary/10 pr-1.5 pl-3 text-xs font-medium text-primary",
        "transition-all duration-200 hover:scale-105 hover:border-primary/60 hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      )}
    >
      {kicker && <span className="font-pixel text-[9px] tracking-wider text-primary/70 uppercase">{kicker}</span>}
      <span className="truncate">{label}</span>
      <span className="flex size-4 items-center justify-center rounded-full bg-primary/15 transition-colors group-hover/chip:bg-primary group-hover/chip:text-primary-foreground">
        <XIcon className="size-3" />
      </span>
    </button>
  )
}

export function FilterBarSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="flex flex-col gap-2 lg:flex-row">
        <div className="h-10 flex-1 animate-pulse rounded-xl bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-muted lg:w-44" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[88, 104, 260, 144].map((w, i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" style={{ width: w }} />
        ))}
      </div>
    </div>
  )
}
