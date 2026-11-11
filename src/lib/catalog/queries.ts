import "server-only"
import { and, count, gte, inArray, sql, type SQL } from "drizzle-orm"
import { Effect } from "effect"
import {
  gameCategories,
  games,
  libraryEntries,
  reviews,
  type CategoryKind,
  type PlatformFamily,
  type SteamReviewSnapshot,
  type Tier,
} from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { gameSummarySelect, toGameSummary, type GameSummary } from "@/lib/games/core"
import { CATEGORY_KINDS, categoryHref, categoryLabel } from "@/lib/taxonomy"
import { BROWSE_PAGE_SIZE, countKey, DEFAULT_SORT, MAX_QUERY_LENGTH, type BrowseSort } from "./params"
import {
  byNewest,
  byPopularity,
  byNintendoExclusiveFirst,
  byPopularityThenNewest,
  byRating,
  escapeLike,
  externalScore,
  isNintendoExclusive,
  looseSearchText,
  NINTENDO_WEAVE_EVERY,
  popularityScore,
  releaseStatus,
  SEARCH_DASHES,
  SEARCH_FOLDS,
  SEARCH_PUNCTUATION,
  sortRanked,
  steamTotals,
  todayIso,
  weaveNintendo,
  type RankedGame,
  type ReleaseStatus,
} from "./ranking"

/* ── Shared select ──────────────────────────────────────────────────────── */

const libraryCountSql = sql<number>`(SELECT COUNT(*) FROM ${libraryEntries} WHERE ${libraryEntries.gameId} = ${games.id})`

const rankedSelect = {
  ...gameSummarySelect,
  source: games.source,
  releaseDate: games.releaseDate,
  metacritic: games.metacritic,
  steamReviews: games.steamReviews,
  platforms: games.platforms,
  genres: games.genres,
  artStyles: games.artStyles,
  featured: games.featured,
  shortDescription: games.shortDescription,
  headerImage: games.headerImage,
  libraryCount: libraryCountSql,
} as const

type RankedRow = {
  id: number
  slug: string
  title: string
  coverImage: string
  heroImage: string | null
  headerImage: string | null
  screenshots: string[]
  releaseYear: number | null
  tier: Tier
  developers: string[]
  avgRating: number | null
  ratingCount: number
  source: "steam" | "wikipedia"
  releaseDate: string | null
  metacritic: number | null
  steamReviews: SteamReviewSnapshot | null
  platforms: PlatformFamily[]
  genres: string[]
  artStyles: string[]
  featured: boolean
  shortDescription: string
  libraryCount: number
}

function toRanked(row: RankedRow): RankedGame {
  const steam = steamTotals(row.steamReviews)
  const libraryCount = Number(row.libraryCount ?? 0)
  return {
    summary: toGameSummary(row),
    source: row.source,
    releaseDate: row.releaseDate,
    metacritic: row.metacritic,
    steamTotal: steam.total,
    steamPositive: steam.positive,
    platforms: row.platforms ?? [],
    genres: row.genres ?? [],
    artStyles: row.artStyles ?? [],
    featured: Boolean(row.featured),
    shortDescription: row.shortDescription,
    backdrop: row.heroImage ?? row.screenshots?.[0] ?? row.headerImage ?? row.coverImage,
    libraryCount,
    popularity: popularityScore(libraryCount, externalScore({ steamTotal: steam.total, metacritic: row.metacritic })),
  }
}

/** All games matching `where` (or the whole catalog), unsorted. */
const loadRanked = (op: string, where?: SQL) =>
  dbQuery(op, (db) => db.select(rankedSelect).from(games).where(where)).pipe(
    Effect.map((rows) => rows.map((row) => toRanked(row as RankedRow))),
  )

/** EXISTS (game is in any of `slugs` for `kind`) */
const inCategory = (kind: CategoryKind, slugs: readonly string[]): SQL =>
  sql`EXISTS (SELECT 1 FROM ${gameCategories} WHERE ${gameCategories.gameId} = ${games.id} AND ${gameCategories.kind} = ${kind} AND ${inArray(gameCategories.slug, [...slugs])})`

/** SQL twin of `looseSearchText`: lower-case, fold accents, drop punctuation, drop/space dashes. */
function foldSql(expr: SQL, dashes: "drop" | "space"): SQL {
  let out = sql`lower(${expr})`
  for (const [from, to] of SEARCH_FOLDS) out = sql`replace(${out}, ${from}, ${to})`
  for (const ch of SEARCH_PUNCTUATION) out = sql`replace(${out}, ${ch}, '')`
  for (const ch of SEARCH_DASHES) out = sql`replace(${out}, ${ch}, ${dashes === "drop" ? "" : " "})`
  return out
}

const likeContains = (value: string) => `%${escapeLike(value)}%`

/**
 * Case-insensitive title / developer search. Besides the plain LIKE it also
 * matches accent- and punctuation-insensitively, so "pokemon legends za",
 * "baldurs gate" and "spider man" find "Pokémon Legends: Z-A", "Baldur's Gate 3"
 * and "Marvel's Spider-Man Remastered". Developers are matched per JSON array
 * element (never against the raw JSON text, so `"` or `,` don't match everything).
 */
function searchCondition(rawQuery: string): SQL | undefined {
  const q = rawQuery.trim().slice(0, MAX_QUERY_LENGTH)
  if (!q) return undefined
  const plain = likeContains(q.toLowerCase())
  const devValue = sql.raw("dev.value")
  const titleMatches: SQL[] = [sql`lower(${games.title}) LIKE ${plain} ESCAPE '\\'`]
  const devMatches: SQL[] = [sql`lower(${devValue}) LIKE ${plain} ESCAPE '\\'`]
  // Loose variants only when something is left after folding — "," or "-" alone
  // would otherwise become "%%" / "% %" and match the whole catalog.
  const dropped = looseSearchText(q, "drop").trim()
  if (dropped) titleMatches.push(sql`${foldSql(sql`${games.title}`, "drop")} LIKE ${likeContains(dropped)} ESCAPE '\\'`)
  const spaced = looseSearchText(q, "space").trim().replace(/\s+/g, " ")
  if (spaced) {
    titleMatches.push(sql`${foldSql(sql`${games.title}`, "space")} LIKE ${likeContains(spaced)} ESCAPE '\\'`)
    devMatches.push(sql`${foldSql(devValue, "space")} LIKE ${likeContains(spaced)} ESCAPE '\\'`)
  }
  return sql`(${sql.join(titleMatches, sql` OR `)} OR EXISTS (SELECT 1 FROM json_each(${games.developers}) AS dev WHERE ${sql.join(devMatches, sql` OR `)}))`
}

/* ── Browse ─────────────────────────────────────────────────────────────── */

export type BrowseInput = {
  readonly q?: string
  readonly genres?: readonly string[]
  readonly artStyles?: readonly string[]
  readonly tier?: Tier | null
  readonly platform?: PlatformFamily | null
  readonly sort?: BrowseSort
  readonly page?: number
  readonly pageSize?: number
}

export type BrowseResult = {
  readonly games: GameSummary[]
  readonly total: number
  readonly page: number
  readonly pageCount: number
  readonly pageSize: number
}

/**
 * Search + filter + sort + paginate the catalog.
 * - `genres`: game must be in ALL selected genres.
 * - `artStyles`: game must have ANY of the selected styles.
 */
export const browseGames = (input: BrowseInput) =>
  Effect.gen(function* () {
    const conditions: SQL[] = []
    const search = searchCondition(input.q ?? "")
    if (search) conditions.push(search)
    for (const genre of input.genres ?? []) conditions.push(inCategory("genre", [genre]))
    if (input.artStyles && input.artStyles.length > 0) conditions.push(inCategory("art-style", input.artStyles))
    if (input.tier) conditions.push(inCategory("tier", [input.tier]))
    if (input.platform) conditions.push(inCategory("platform", [input.platform]))

    const rows = yield* loadRanked("catalog.browse", conditions.length > 0 ? and(...conditions) : undefined)
    const sorted = sortRanked(rows, input.sort ?? DEFAULT_SORT, { nintendoFirst: input.platform === "nintendo" })

    const pageSize = Math.max(1, Math.min(input.pageSize ?? BROWSE_PAGE_SIZE, 100))
    const total = sorted.length
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const page = Math.min(Math.max(1, Math.floor(input.page ?? 1)), pageCount)
    const result: BrowseResult = {
      games: sorted.slice((page - 1) * pageSize, page * pageSize).map((g) => g.summary),
      total,
      page,
      pageCount,
      pageSize,
    }
    return result
  })

/** Number of games per (kind, slug), keyed by `countKey(kind, slug)`. */
export const categoryCounts = () =>
  dbQuery("catalog.categoryCounts", (db) =>
    db
      .select({ kind: gameCategories.kind, slug: gameCategories.slug, n: count() })
      .from(gameCategories)
      .groupBy(gameCategories.kind, gameCategories.slug),
  ).pipe(
    Effect.map((rows) => {
      const counts: Record<string, number> = {}
      for (const row of rows) counts[countKey(row.kind, row.slug)] = Number(row.n)
      return counts
    }),
  )

/* ── Home page rows ─────────────────────────────────────────────────────── */

export type FeaturedGame = GameSummary & {
  readonly backdrop: string
  /** Wikipedia images are small: the UI softens them when used full-bleed. */
  readonly lowResBackdrop: boolean
  readonly shortDescription: string
  readonly chips: readonly { readonly label: string; readonly href: string }[]
  readonly nintendo: boolean
}

function toFeatured(g: RankedGame): FeaturedGame {
  const chips = [
    ...g.genres.slice(0, 2).map((slug) => ({ label: categoryLabel("genre", slug), href: categoryHref("genre", slug) })),
    { label: categoryLabel("tier", g.summary.tier), href: categoryHref("tier", g.summary.tier) },
    ...(g.platforms.includes("nintendo")
      ? [{ label: categoryLabel("platform", "nintendo"), href: categoryHref("platform", "nintendo") }]
      : []),
  ]
  return {
    ...g.summary,
    backdrop: g.backdrop,
    lowResBackdrop: g.source === "wikipedia",
    shortDescription: g.shortDescription,
    chips,
    nintendo: g.platforms.includes("nintendo"),
  }
}

/**
 * Curated featured games (newest first) with Nintendo first-party picks woven
 * in, so the hero rotation always represents Switch players too.
 */
export const featuredGames = (limit = 12) =>
  loadRanked("catalog.featured").pipe(
    Effect.map((all) => {
      const featured = all.filter((g) => g.featured).sort(byNewest)
      const nintendoPicks = all
        .filter((g) => isNintendoExclusive(g) && !g.featured && g.backdrop !== g.summary.coverImage)
        .sort(byPopularityThenNewest)
        .slice(0, 3)
      const merged = [...featured]
      nintendoPicks.forEach((pick, i) => merged.splice(Math.min(1 + i * 3, merged.length), 0, pick))
      const picked = merged.length > 0 ? merged : [...all].sort(byPopularity)
      return picked.slice(0, limit).map(toFeatured)
    }),
  )

/** Most popular overall. */
export const popularGames = (limit = 12) =>
  loadRanked("catalog.popular").pipe(Effect.map((all) => all.sort(byPopularity).slice(0, limit).map((g) => g.summary)))

/** Popular games for the hero marquee, with Nintendo exclusives woven in (every 3rd cover). */
export const marqueeGames = (limit = 45) =>
  loadRanked("catalog.marquee").pipe(
    Effect.map((all) =>
      weaveNintendo(all.sort(byPopularity), 3, Math.ceil(limit / 3))
        .slice(0, limit)
        .map((g) => g.summary),
    ),
  )

/** Home-page row for a studio size; Triple-A mixes in Nintendo's first-party blockbusters. */
export const tierHighlights = (tier: Tier, limit = 12) =>
  loadRanked("catalog.tierHighlights", inCategory("tier", [tier])).pipe(
    Effect.map((rows) => {
      const sorted = rows.sort(byPopularity)
      return (tier === "aaa" ? weaveNintendo(sorted, 4, Math.ceil(limit / 4)) : sorted)
        .slice(0, limit)
        .map((g) => g.summary)
    }),
  )

/**
 * Games with the most community activity (library changes + reviews) in the
 * last 7 days; games without recent activity fall back to overall popularity.
 */
export const popularThisWeek = (limit = 12) =>
  Effect.gen(function* () {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [all, library, reviewed] = yield* Effect.all(
      [
        loadRanked("catalog.popularThisWeek"),
        dbQuery("catalog.weeklyLibrary", (db) =>
          db
            .select({ gameId: libraryEntries.gameId, n: count() })
            .from(libraryEntries)
            .where(gte(libraryEntries.updatedAt, since))
            .groupBy(libraryEntries.gameId),
        ),
        dbQuery("catalog.weeklyReviews", (db) =>
          db
            .select({ gameId: reviews.gameId, n: count() })
            .from(reviews)
            .where(gte(reviews.updatedAt, since))
            .groupBy(reviews.gameId),
        ),
      ],
      { concurrency: "unbounded" },
    )
    const weekly = new Map<number, number>()
    for (const row of [...library, ...reviewed]) weekly.set(row.gameId, (weekly.get(row.gameId) ?? 0) + Number(row.n))
    const trending = all
      .filter((g) => (weekly.get(g.summary.id) ?? 0) > 0)
      .sort((a, b) => (weekly.get(b.summary.id) ?? 0) - (weekly.get(a.summary.id) ?? 0) || byPopularity(a, b))
    // Top up with overall popularity (Nintendo exclusives woven in, as in the browse "popular" sort).
    const fallback = weaveNintendo(
      all.filter((g) => !weekly.has(g.summary.id)).sort(byPopularity),
      NINTENDO_WEAVE_EVERY,
    )
    return [...trending, ...fallback].slice(0, limit).map((g) => g.summary)
  })

/** Highest community average among games with at least `minRatings` ratings (may be empty). */
export const topRatedByCommunity = (limit = 12, minRatings = 1) =>
  loadRanked("catalog.topRated").pipe(
    Effect.map((all) =>
      all
        .filter((g) => g.summary.avgRating !== null && g.summary.ratingCount >= minRatings)
        .sort(byRating)
        .slice(0, limit)
        .map((g) => g.summary),
    ),
  )

/** Metacritic desc, topped up with the best-reviewed Steam games when scores are missing. */
export const criticallyAcclaimed = (limit = 12) =>
  loadRanked("catalog.acclaimed").pipe(
    Effect.map((all) => {
      const scored = all
        .filter((g) => g.metacritic !== null)
        .sort((a, b) => (b.metacritic ?? 0) - (a.metacritic ?? 0) || byPopularity(a, b))
      const rest = all
        .filter((g) => g.metacritic === null && g.steamTotal >= 1000)
        .sort((a, b) => b.steamPositive / b.steamTotal - a.steamPositive / a.steamTotal)
      return [...scored, ...rest].slice(0, limit).map((g) => ({ ...g.summary, metacritic: g.metacritic }))
    }),
  )

export type ReleaseGame = GameSummary & { readonly releaseDate: string | null; readonly status: ReleaseStatus }

/** Upcoming (soonest first), then a few TBA titles, then the latest releases. */
export const newAndUpcoming = (limit = 12) =>
  loadRanked("catalog.newAndUpcoming").pipe(
    Effect.map((all) => {
      const today = todayIso()
      const upcoming = all
        .filter((g) => g.releaseDate !== null && g.releaseDate > today)
        .sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""))
      const tba = all.filter((g) => g.releaseDate === null).sort(byPopularity).slice(0, 3)
      const released = all.filter((g) => g.releaseDate !== null && g.releaseDate <= today).sort(byNewest)
      return [...upcoming, ...tba, ...released].slice(0, limit).map(
        (g): ReleaseGame => ({ ...g.summary, releaseDate: g.releaseDate, status: releaseStatus(g.releaseDate, today) }),
      )
    }),
  )

/** Nintendo platform games, first-party exclusives first. */
export const nintendoSpotlight = (limit = 12) =>
  loadRanked("catalog.nintendo", inCategory("platform", ["nintendo"])).pipe(
    Effect.map((rows) =>
      rows
        .sort(byNintendoExclusiveFirst)
        .slice(0, limit)
        .map((g) => ({ ...g.summary, exclusive: isNintendoExclusive(g) })),
    ),
  )

/* ── Categories ─────────────────────────────────────────────────────────── */

export type CategoryBackdrop = { readonly image: string; readonly title: string; readonly slug: string; readonly lowRes: boolean }

/** Games in one category, sorted, plus the most popular game's wide art for the page header. */
export const gamesInCategory = (kind: CategoryKind, slug: string, sort: BrowseSort = DEFAULT_SORT) =>
  loadRanked("catalog.inCategory", inCategory(kind, [slug])).pipe(
    Effect.map((rows) => {
      const nintendoFirst = kind === "platform" && slug === "nintendo"
      const byRank = [...rows].sort(nintendoFirst ? byNintendoExclusiveFirst : byPopularity)
      const top = byRank.find((g) => g.backdrop !== g.summary.coverImage) ?? byRank[0]
      const backdrop: CategoryBackdrop | null = top
        ? { image: top.backdrop, title: top.summary.title, slug: top.summary.slug, lowRes: top.source === "wikipedia" }
        : null
      return { games: sortRanked(rows, sort, { nintendoFirst }).map((g) => g.summary), backdrop }
    }),
  )

export type CategoryShowcase = {
  readonly kind: CategoryKind
  readonly slug: string
  readonly label: string
  readonly blurb: string
  readonly count: number
  /** Up to 3 portrait covers for the collage. */
  readonly covers: readonly { readonly title: string; readonly image: string }[]
  /** Wide art the tile cross-fades to on hover. */
  readonly screenshot: string | null
}

/**
 * Every taxonomy category (in taxonomy order) with its game count and a cover
 * collage. Covers avoid repeating games already shown by sibling tiles of the
 * same kind so the hub doesn't show the same three blockbusters everywhere.
 */
export const categoryShowcases = (kinds: readonly CategoryKind[] = CATEGORY_KINDS.map((k) => k.kind)) =>
  Effect.gen(function* () {
    const [all, memberships] = yield* Effect.all(
      [
        loadRanked("catalog.showcase"),
        dbQuery("catalog.memberships", (db) =>
          db.select().from(gameCategories).where(inArray(gameCategories.kind, [...kinds])),
        ),
      ],
      { concurrency: "unbounded" },
    )
    const byId = new Map(all.map((g) => [g.summary.id, g]))
    const members = new Map<string, RankedGame[]>()
    for (const m of memberships) {
      const game = byId.get(m.gameId)
      if (!game) continue
      const key = countKey(m.kind, m.slug)
      const list = members.get(key) ?? []
      list.push(game)
      members.set(key, list)
    }

    const result: CategoryShowcase[] = []
    for (const group of CATEGORY_KINDS.filter((k) => kinds.includes(k.kind))) {
      const used = new Set<number>()
      for (const item of group.items) {
        const nintendoFirst = group.kind === "platform" && item.slug === "nintendo"
        const list = (members.get(countKey(group.kind, item.slug)) ?? []).sort(
          nintendoFirst ? byNintendoExclusiveFirst : byPopularity,
        )
        const fresh = list.filter((g) => !used.has(g.summary.id))
        const picks = [...fresh, ...list.filter((g) => used.has(g.summary.id))].slice(0, 3)
        for (const p of picks) used.add(p.summary.id)
        const hero = picks[0]
        result.push({
          kind: group.kind,
          slug: item.slug,
          label: item.label,
          blurb: item.blurb,
          count: list.length,
          covers: picks.map((g) => ({ title: g.summary.title, image: g.summary.coverImage })),
          screenshot: hero ? hero.summary.hoverImage : null,
        })
      }
    }
    return result
  })
