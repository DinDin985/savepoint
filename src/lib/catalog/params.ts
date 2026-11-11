/**
 * URL <-> filter helpers for discovery (browse + category pages).
 * Pure and dependency-free: safe to import from client components.
 */
import type { CategoryKind, PlatformFamily, Tier } from "@/lib/db/schema"
import { ART_STYLES, GENRES, PLATFORMS, TIERS } from "@/lib/taxonomy"

export const SORT_OPTIONS = [
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Highest rated" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
] as const

export type BrowseSort = (typeof SORT_OPTIONS)[number]["value"]

export const DEFAULT_SORT: BrowseSort = "popular"
export const BROWSE_PAGE_SIZE = 24
export const MAX_QUERY_LENGTH = 80

export const isBrowseSort = (value: unknown): value is BrowseSort =>
  typeof value === "string" && SORT_OPTIONS.some((o) => o.value === value)

export const sortLabel = (sort: BrowseSort) => SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort

export type BrowseFilters = {
  readonly q: string
  readonly genres: readonly string[]
  readonly artStyles: readonly string[]
  readonly tier: Tier | null
  readonly platform: PlatformFamily | null
  readonly sort: BrowseSort
  readonly page: number
}

export const EMPTY_FILTERS: BrowseFilters = {
  q: "",
  genres: [],
  artStyles: [],
  tier: null,
  platform: null,
  sort: DEFAULT_SORT,
  page: 1,
}

/** Query-string keys used by /games. */
export const PARAM = {
  q: "q",
  genre: "genre",
  style: "style",
  tier: "tier",
  platform: "platform",
  sort: "sort",
  page: "page",
} as const

/** Which /games query param filters a given category kind. */
export const CATEGORY_PARAM: Record<CategoryKind, string> = {
  genre: PARAM.genre,
  "art-style": PARAM.style,
  tier: PARAM.tier,
  platform: PARAM.platform,
}

const GENRE_SLUGS = new Set(GENRES.map((g) => g.slug))
const STYLE_SLUGS = new Set(ART_STYLES.map((s) => s.slug))
const TIER_SLUGS = new Set<string>(TIERS.map((t) => t.slug))
const PLATFORM_SLUGS = new Set<string>(PLATFORMS.map((p) => p.slug))

type ParamSource = URLSearchParams | Readonly<Record<string, string | string[] | undefined>>

function readAll(source: ParamSource, key: string): string[] {
  if (source instanceof URLSearchParams) return source.getAll(key)
  const value = source[key]
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

const readOne = (source: ParamSource, key: string): string | undefined => readAll(source, key)[0]

/** Keep only known slugs, de-duplicated, in a stable (taxonomy) order. */
function pickSlugs(values: string[], allowed: Set<string>, order: readonly { slug: string }[]): string[] {
  const wanted = new Set(values.flatMap((v) => v.split(",")).map((v) => v.trim().toLowerCase()))
  return order.map((o) => o.slug).filter((slug) => wanted.has(slug) && allowed.has(slug))
}

/**
 * Parse untrusted search params into sanitised filters. Unknown slugs and
 * malformed values are dropped (never throws) so a hand-edited URL still works.
 */
export function parseBrowseParams(source: ParamSource): BrowseFilters {
  const q = (readOne(source, PARAM.q) ?? "").trim().slice(0, MAX_QUERY_LENGTH)
  const tier = readOne(source, PARAM.tier)?.toLowerCase()
  const platform = readOne(source, PARAM.platform)?.toLowerCase()
  const sort = readOne(source, PARAM.sort)
  const page = Number.parseInt(readOne(source, PARAM.page) ?? "1", 10)
  return {
    q,
    genres: pickSlugs(readAll(source, PARAM.genre), GENRE_SLUGS, GENRES),
    artStyles: pickSlugs(readAll(source, PARAM.style), STYLE_SLUGS, ART_STYLES),
    tier: tier && TIER_SLUGS.has(tier) ? (tier as Tier) : null,
    platform: platform && PLATFORM_SLUGS.has(platform) ? (platform as PlatformFamily) : null,
    sort: isBrowseSort(sort) ? sort : DEFAULT_SORT,
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  }
}

/** Canonical query string for a set of filters (defaults are omitted). */
export function toSearchParams(filters: Partial<BrowseFilters>): URLSearchParams {
  const params = new URLSearchParams()
  const q = filters.q?.trim()
  if (q) params.set(PARAM.q, q)
  for (const g of filters.genres ?? []) params.append(PARAM.genre, g)
  for (const s of filters.artStyles ?? []) params.append(PARAM.style, s)
  if (filters.tier) params.set(PARAM.tier, filters.tier)
  if (filters.platform) params.set(PARAM.platform, filters.platform)
  if (filters.sort && filters.sort !== DEFAULT_SORT) params.set(PARAM.sort, filters.sort)
  if (filters.page && filters.page > 1) params.set(PARAM.page, String(filters.page))
  return params
}

export function browseHref(filters: Partial<BrowseFilters> = {}): string {
  const qs = toSearchParams(filters).toString()
  return qs ? `/games?${qs}` : "/games"
}

/** /games URL pre-filtered to one category (used for "refine with filters" links). */
export function categoryBrowseHref(kind: CategoryKind, slug: string, sort?: BrowseSort): string {
  switch (kind) {
    case "genre":
      return browseHref({ genres: [slug], sort })
    case "art-style":
      return browseHref({ artStyles: [slug], sort })
    case "tier":
      return browseHref({ tier: slug as Tier, sort })
    case "platform":
      return browseHref({ platform: slug as PlatformFamily, sort })
  }
}

export const hasActiveFilters = (f: BrowseFilters) =>
  f.q !== "" || f.genres.length > 0 || f.artStyles.length > 0 || f.tier !== null || f.platform !== null

/** Key used by `categoryCounts()` → `counts[countKey("genre", "rpg")]`. */
export const countKey = (kind: CategoryKind, slug: string) => `${kind}:${slug}`
