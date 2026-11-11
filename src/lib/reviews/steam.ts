import "server-only"
import { Duration, Effect, Option, Schema } from "effect"
import type { Game } from "@/lib/db/schema"
import { ExternalApiError } from "@/lib/effect/errors"
import { fetchJson } from "@/lib/effect/http"
import { parseSteamReviewBody } from "./bbcode"
import { sumHistogram } from "./histogram"
import {
  STEAM_PAGE_SIZE,
  type HistogramPoint,
  type HistogramUnit,
  type ReviewCardData,
  type ReviewHistogram,
  type ReviewSort,
  type ReviewSummary,
  type ReviewTypeFilter,
  type SteamOverview,
  type SteamReviewPage,
} from "./types"

const STORE = "https://store.steampowered.com"
/** Keep the game page snappy when Steam is slow (the section streams in via Suspense). */
const TIMEOUT = Duration.seconds(6)

/* ── Upstream schemas (only the fields we use; unknown keys are ignored) ── */

const SteamAuthor = Schema.Struct({
  steamid: Schema.String,
  personaname: Schema.optional(Schema.String),
  avatar: Schema.optional(Schema.String),
  num_games_owned: Schema.optional(Schema.Number),
  num_reviews: Schema.optional(Schema.Number),
  playtime_forever: Schema.optional(Schema.Number),
  playtime_at_review: Schema.optional(Schema.Number),
})

const SteamReviewRow = Schema.Struct({
  recommendationid: Schema.String,
  author: SteamAuthor,
  review: Schema.String,
  timestamp_created: Schema.Number,
  timestamp_updated: Schema.optional(Schema.Number),
  voted_up: Schema.Boolean,
  votes_up: Schema.optional(Schema.Number),
  votes_funny: Schema.optional(Schema.Number),
  steam_purchase: Schema.optional(Schema.Boolean),
  received_for_free: Schema.optional(Schema.Boolean),
  written_during_early_access: Schema.optional(Schema.Boolean),
  primarily_steam_deck: Schema.optional(Schema.Boolean),
})
type SteamReviewRow = typeof SteamReviewRow.Type

const SteamQuerySummary = Schema.Struct({
  num_reviews: Schema.optional(Schema.Number),
  review_score: Schema.optional(Schema.Number),
  review_score_desc: Schema.optional(Schema.String),
  total_positive: Schema.optional(Schema.Number),
  total_negative: Schema.optional(Schema.Number),
  total_reviews: Schema.optional(Schema.Number),
})

const SteamReviewsResponse = Schema.Struct({
  success: Schema.Number,
  cursor: Schema.optional(Schema.String),
  query_summary: Schema.optional(SteamQuerySummary),
  // decoded row-by-row below so one odd review can't sink the whole page
  reviews: Schema.optional(Schema.Array(Schema.Unknown)),
})

const HistogramRow = Schema.Struct({
  date: Schema.Number,
  recommendations_up: Schema.Number,
  recommendations_down: Schema.Number,
})

const SteamHistogramResponse = Schema.Struct({
  success: Schema.Number,
  results: Schema.optional(
    Schema.Struct({
      start_date: Schema.optional(Schema.Number),
      end_date: Schema.optional(Schema.Number),
      rollup_type: Schema.optional(Schema.String),
      rollups: Schema.optional(Schema.Array(HistogramRow)),
      recent: Schema.optional(Schema.Array(HistogramRow)),
    }),
  ),
})

const decodeRow = Schema.decodeUnknownOption(SteamReviewRow)

/* ── URLs ───────────────────────────────────────────────────────────────── */

type ListParams = {
  readonly filter: "all" | "recent"
  readonly reviewType: ReviewTypeFilter
  readonly language: "english" | "all"
  readonly perPage: number
  readonly cursor: string
  /**
   * "Most helpful" (filter=all) ranks by helpfulness inside a sliding window;
   * without a range Steam only looks at the last few weeks. Lists only.
   */
  readonly dayRange?: number
}

const reviewsUrl = (appId: number, p: ListParams) =>
  `${STORE}/ajaxappreviews/${appId}?json=1&filter=${p.filter}&review_type=${p.reviewType}` +
  `&language=${p.language}&purchase_type=all&num_per_page=${p.perPage}&cursor=${encodeURIComponent(p.cursor)}` +
  (p.filter === "all" && p.dayRange ? `&day_range=${p.dayRange}` : "")

export const steamStoreUrl = (appId: number) => `${STORE}/app/${appId}/`
export const steamReviewsUrl = (appId: number) => `https://steamcommunity.com/app/${appId}/reviews/`

const avatarUrl = (hash: string | undefined) => {
  if (!hash || !/^[0-9a-f]{40}$/i.test(hash) || /^0+$/.test(hash)) return null
  return `https://avatars.steamstatic.com/${hash}_medium.jpg`
}

const isSteamId = (id: string) => /^\d{5,20}$/.test(id)

/* ── Mapping ────────────────────────────────────────────────────────────── */

function toCard(appId: number, row: SteamReviewRow): ReviewCardData {
  const a = row.author
  const steamid = isSteamId(a.steamid) ? a.steamid : null
  const createdAt = row.timestamp_created * 1000
  const updatedAt = row.timestamp_updated && row.timestamp_updated > row.timestamp_created + 60 ? row.timestamp_updated * 1000 : null
  return {
    id: `steam-${row.recommendationid}`,
    source: "steam",
    author: {
      name: a.personaname?.trim() || "Steam user",
      profileUrl: steamid ? `https://steamcommunity.com/profiles/${steamid}/` : null,
      external: true,
      avatar: { kind: "image", url: avatarUrl(a.avatar) },
      productsOwned: a.num_games_owned && a.num_games_owned > 0 ? a.num_games_owned : null,
      reviewCount: a.num_reviews && a.num_reviews > 0 ? a.num_reviews : null,
    },
    recommended: row.voted_up,
    body: parseSteamReviewBody(row.review),
    createdAt,
    updatedAt,
    playtimeMinutes: a.playtime_forever ?? null,
    playtimeAtReviewMinutes: a.playtime_at_review ?? null,
    steamDeck: row.primarily_steam_deck ?? false,
    earlyAccess: row.written_during_early_access ?? false,
    receivedForFree: row.received_for_free ?? false,
    containsSpoilers: false,
    authorRating: null,
    votes: { helpful: row.votes_up ?? 0, unhelpful: 0, funny: row.votes_funny ?? 0 },
    viewerVote: null,
    isOwn: false,
    externalUrl: steamid ? `https://steamcommunity.com/profiles/${steamid}/recommended/${appId}/` : steamReviewsUrl(appId),
  }
}

const toPoint = (r: typeof HistogramRow.Type): HistogramPoint => ({
  date: r.date * 1000,
  up: r.recommendations_up,
  down: r.recommendations_down,
})

/* ── Effects ────────────────────────────────────────────────────────────── */

/**
 * One page of English Steam reviews. "Most helpful" = filter=all, "Recent" =
 * filter=recent. Pass the returned cursor back for the next page ("*" = first).
 */
export const getSteamReviews = Effect.fn("reviews.steam.list")(function* (
  appId: number,
  options: { readonly sort: ReviewSort; readonly type: ReviewTypeFilter; readonly cursor?: string | null },
) {
  const cursor = options.cursor || "*"
  const url = reviewsUrl(appId, {
    filter: options.sort === "recent" ? "recent" : "all",
    reviewType: options.type,
    language: "english",
    perPage: STEAM_PAGE_SIZE,
    cursor,
    dayRange: 365,
  })
  const res = yield* fetchJson(url, SteamReviewsResponse, { source: "steam", revalidate: 600, timeout: TIMEOUT })
  if (res.success !== 1) return yield* new ExternalApiError({ source: "steam", url })

  const reviews = (res.reviews ?? []).flatMap((raw) =>
    Option.match(decodeRow(raw), { onNone: () => [], onSome: (row) => [toCard(appId, row)] }),
  )
  const raw = res.reviews?.length ?? 0
  // Steam keeps echoing the same cursor once the list is exhausted.
  const next = res.cursor && res.cursor !== cursor && raw >= STEAM_PAGE_SIZE ? res.cursor : null
  return { reviews, cursor: next } satisfies SteamReviewPage
})

/** All-language lifetime totals (the "Overall Reviews" row). */
export const getSteamSummary = Effect.fn("reviews.steam.summary")(function* (appId: number) {
  const url = reviewsUrl(appId, { filter: "all", reviewType: "all", language: "all", perPage: 1, cursor: "*" })
  const res = yield* fetchJson(url, SteamReviewsResponse, { source: "steam", revalidate: 3600, timeout: TIMEOUT })
  const q = res.query_summary
  if (res.success !== 1 || !q || q.total_reviews === undefined) {
    return yield* new ExternalApiError({ source: "steam", url })
  }
  const positive = q.total_positive ?? 0
  const negative = q.total_negative ?? Math.max(0, q.total_reviews - positive)
  return { positive, negative, total: q.total_reviews } satisfies ReviewSummary
})

/** Monthly (or weekly) lifetime rollups + daily bars for the last ~30 days. */
export const getSteamHistogram = Effect.fn("reviews.steam.histogram")(function* (appId: number) {
  const url = `${STORE}/appreviewhistogram/${appId}?l=english&review_score_preference=0`
  const res = yield* fetchJson(url, SteamHistogramResponse, { source: "steam", revalidate: 3600, timeout: TIMEOUT })
  if (res.success !== 1 || !res.results) return yield* new ExternalApiError({ source: "steam", url })
  const unit: HistogramUnit = res.results.rollup_type === "week" ? "week" : res.results.rollup_type === "day" ? "day" : "month"
  return {
    overall: (res.results.rollups ?? []).map(toPoint).sort((a, b) => a.date - b.date),
    overallUnit: unit,
    recent: (res.results.recent ?? []).map(toPoint).sort((a, b) => a.date - b.date),
  } satisfies ReviewHistogram
})

/**
 * Summary rows + chart for the Steam tab. Never fails: a failed summary falls
 * back to the catalog snapshot, a failed histogram just hides the chart.
 */
export const getSteamOverview = (game: Pick<Game, "steamAppId" | "steamReviews">) =>
  Effect.gen(function* () {
    const appId = game.steamAppId
    if (!appId) return null
    const [summary, histogram] = yield* Effect.all(
      [Effect.option(getSteamSummary(appId)), Effect.option(getSteamHistogram(appId))],
      { concurrency: "unbounded" },
    )
    const snapshot = game.steamReviews
    const overall: ReviewSummary | null = Option.isSome(summary)
      ? summary.value
      : snapshot && snapshot.total > 0
        ? { positive: snapshot.positive, negative: snapshot.negative, total: snapshot.total }
        : null
    const hist = Option.getOrNull(histogram)
    const recent = hist && hist.recent.length > 0 ? sumHistogram(hist.recent) : null
    return {
      appId,
      overall,
      recent,
      histogram: hist && (hist.overall.length > 0 || hist.recent.length > 0) ? hist : null,
      live: Option.isSome(summary),
    } satisfies SteamOverview
  })
