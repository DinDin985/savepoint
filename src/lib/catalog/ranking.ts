/**
 * Pure ranking helpers for the discovery queries. The catalog is small (~80
 * games), so filtering happens in SQL and ordering happens here in JS.
 */
import type { PlatformFamily, SteamReviewSnapshot } from "@/lib/db/schema"
import type { GameSummary } from "@/lib/games/core"
import type { BrowseSort } from "./params"

export type RankedGame = {
  readonly summary: GameSummary
  readonly source: "steam" | "wikipedia"
  readonly releaseDate: string | null
  readonly metacritic: number | null
  readonly steamTotal: number
  readonly steamPositive: number
  readonly platforms: readonly PlatformFamily[]
  readonly genres: readonly string[]
  readonly artStyles: readonly string[]
  readonly featured: boolean
  readonly shortDescription: string
  /** Wide image for backdrops: hero art → first screenshot → header → cover. */
  readonly backdrop: string
  readonly libraryCount: number
  readonly popularity: number
}

/**
 * Nintendo first-party and Epic-only games have no Steam review count. Without a
 * stand-in they would always sink to the bottom of "popular", so they get a
 * neutral external score roughly equal to a 100k-review Steam game (close to the
 * catalog median). Community activity (x10 per library entry) dominates quickly.
 */
export const NON_STEAM_BASELINE = 5

export function externalScore(input: { steamTotal: number; metacritic: number | null }): number {
  if (input.steamTotal > 0) return Math.log10(input.steamTotal)
  if (input.metacritic !== null) return input.metacritic / 20
  return NON_STEAM_BASELINE
}

/** Popularity = community library entries (x10) + log10(Steam review total). */
export const popularityScore = (libraryCount: number, external: number) => libraryCount * 10 + external

export function steamTotals(snapshot: SteamReviewSnapshot | null): { total: number; positive: number } {
  return { total: Number(snapshot?.total ?? 0), positive: Number(snapshot?.positive ?? 0) }
}

const byTitle = (a: RankedGame, b: RankedGame) =>
  a.summary.title.localeCompare(b.summary.title, "en", { sensitivity: "base" })

export const byPopularity = (a: RankedGame, b: RankedGame) => b.popularity - a.popularity || byTitle(a, b)

/** Popularity, with ties (e.g. Nintendo games sharing the baseline) going to newer releases. */
export const byPopularityThenNewest = (a: RankedGame, b: RankedGame) =>
  b.popularity - a.popularity || (b.releaseDate ?? "9999").localeCompare(a.releaseDate ?? "9999") || byTitle(a, b)

const steamRatio = (g: RankedGame) => (g.steamTotal > 0 ? g.steamPositive / g.steamTotal : -1)

/** Community average first, then critics, then Steam positivity as tie-breakers. */
export const byRating = (a: RankedGame, b: RankedGame) =>
  (b.summary.avgRating ?? -1) - (a.summary.avgRating ?? -1) ||
  b.summary.ratingCount - a.summary.ratingCount ||
  (b.metacritic ?? -1) - (a.metacritic ?? -1) ||
  steamRatio(b) - steamRatio(a) ||
  byPopularity(a, b)

/** Newest first; unreleased (no date) counts as newest of all. */
export const byNewest = (a: RankedGame, b: RankedGame) => {
  if (a.releaseDate === b.releaseDate) return byPopularity(a, b)
  if (a.releaseDate === null) return -1
  if (b.releaseDate === null) return 1
  return b.releaseDate.localeCompare(a.releaseDate)
}

/** Oldest first; unreleased (no date) goes last. */
export const byOldest = (a: RankedGame, b: RankedGame) => {
  if (a.releaseDate === b.releaseDate) return byPopularity(a, b)
  if (a.releaseDate === null) return 1
  if (b.releaseDate === null) return -1
  return a.releaseDate.localeCompare(b.releaseDate)
}

export const isNintendoExclusive = (g: RankedGame) => g.platforms.length === 1 && g.platforms[0] === "nintendo"

/** Nintendo exclusives first (they have no Steam review counts to rank them by). */
export const byNintendoExclusiveFirst = (a: RankedGame, b: RankedGame) =>
  Number(isNintendoExclusive(b)) - Number(isNintendoExclusive(a)) || byPopularityThenNewest(a, b)

/** Slot spacing used when Nintendo exclusives are woven into "most popular" lists. */
export const NINTENDO_WEAVE_EVERY = 4

export function sortRanked(
  games: readonly RankedGame[],
  sort: BrowseSort,
  options: { readonly nintendoFirst?: boolean } = {},
): RankedGame[] {
  if (sort === "popular") {
    if (options.nintendoFirst) return [...games].sort(byNintendoExclusiveFirst)
    // Switch exclusives have no Steam review count to rank them by, so a plain
    // popularity sort would bury every one of them below page 2. Weave them in.
    return weaveNintendo([...games].sort(byPopularity), NINTENDO_WEAVE_EVERY)
  }
  const comparator = sort === "rating" ? byRating : sort === "newest" ? byNewest : sort === "oldest" ? byOldest : byTitle
  return [...games].sort(comparator)
}

/**
 * Weave Nintendo exclusives into a popularity-ordered list so Switch-only hits
 * aren't drowned out by Steam review counts in mixed rows: an exclusive takes
 * at least every `every`-th slot (at most `max` of them are moved), and keeps
 * its natural place when community activity already ranks it higher.
 */
export function weaveNintendo(ranked: readonly RankedGame[], every: number, max = Number.POSITIVE_INFINITY): RankedGame[] {
  const exclusives = ranked.filter(isNintendoExclusive).sort(byPopularityThenNewest).slice(0, max)
  if (exclusives.length === 0) return [...ranked]
  const woven = new Set(exclusives.map((g) => g.summary.id))
  const rest = ranked.filter((g) => !woven.has(g.summary.id))
  const out: RankedGame[] = []
  let r = 0
  let x = 0
  while (r < rest.length || x < exclusives.length) {
    const exclusive = exclusives[x]
    const other = rest[r]
    const slot = out.length % every === every - 1
    if (exclusive && (!other || slot || exclusive.popularity > other.popularity)) {
      out.push(exclusive)
      x++
    } else if (other) {
      out.push(other)
      r++
    }
  }
  return out
}

/** Today as yyyy-mm-dd (UTC), comparable with `releaseDate`. */
export const todayIso = () => new Date().toISOString().slice(0, 10)

export type ReleaseStatus = "upcoming" | "tba" | "new" | "released"

const NEW_RELEASE_WINDOW_DAYS = 90

export function releaseStatus(releaseDate: string | null, today = todayIso()): ReleaseStatus {
  if (releaseDate === null) return "tba"
  if (releaseDate > today) return "upcoming"
  const ageDays = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${releaseDate}T00:00:00Z`)) / 86_400_000
  return ageDays <= NEW_RELEASE_WINDOW_DAYS ? "new" : "released"
}

/** Escape LIKE wildcards; pair with `ESCAPE '\'`. */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

/**
 * Accented letters the SQL side folds to ASCII ("pokemon" finds "Pokémon").
 * SQLite's lower() only handles ASCII and has no translate(), so each fold is a
 * nested replace(): keep this list (plus the two below) short — SQLite's parser
 * overflows at ~25 nested calls. Queries are folded in JS (any diacritic).
 */
export const SEARCH_FOLDS: readonly (readonly [string, string])[] = [
  ["é", "e"],
  ["è", "e"],
  ["É", "e"],
  ["á", "a"],
  ["ó", "o"],
  ["ö", "o"],
  ["ō", "o"],
  ["ü", "u"],
]

/** Punctuation the loose title match ignores ("baldurs gate", "super mario bros wonder", "pokemon legends za"). */
export const SEARCH_PUNCTUATION = ["'", "’", ":", ".", ",", "!"] as const
/** Dashes are either dropped ("spiderman") or read as spaces ("spider man", "hi fi rush"). */
export const SEARCH_DASHES = ["-", "–"] as const

/** Lower-case, strip diacritics and ignored punctuation; JS twin of the SQL fold in `queries.ts`. */
export function looseSearchText(value: string, dashes: "drop" | "space"): string {
  let out = value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  for (const ch of SEARCH_PUNCTUATION) out = out.split(ch).join("")
  for (const ch of SEARCH_DASHES) out = out.split(ch).join(dashes === "drop" ? "" : " ")
  return out
}
