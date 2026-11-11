import "server-only"
import { and, desc, eq, gte, sql, type SQL } from "drizzle-orm"
import { Effect } from "effect"
import { games, libraryEntries, reviewVotes, reviews, users } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { ForbiddenError, NotFoundError } from "@/lib/effect/errors"
import { fillDailyBuckets, fillMonthlyBuckets, sumHistogram } from "./histogram"
import {
  COMMUNITY_PAGE_SIZE,
  type CommunityOverview,
  type CommunityReviewPage,
  type HistogramPoint,
  type ReviewCardData,
  type ReviewSort,
  type ReviewTypeFilter,
  type ReviewVoteCounts,
  type ReviewVoteKind,
  type ViewerVote,
} from "./types"

/*
 * Correlated subqueries alias their inner table (r2 / le2 / rv) so that the
 * unaliased `"reviews"` references resolve to the outer row.
 */
const voteCountSql = (condition: "rv.helpful = 1" | "rv.helpful = -1" | "rv.funny = 1") =>
  sql<number>`(SELECT COUNT(*) FROM ${reviewVotes} AS rv WHERE rv.review_id = ${reviews.id} AND ${sql.raw(condition)})`

const helpfulYesSql = voteCountSql("rv.helpful = 1")
const helpfulNoSql = voteCountSql("rv.helpful = -1")
const funnySql = voteCountSql("rv.funny = 1")
const authorReviewCountSql = sql<number>`(SELECT COUNT(*) FROM ${reviews} AS r2 WHERE r2.user_id = ${reviews.userId})`
const authorGamesLoggedSql = sql<number>`(SELECT COUNT(*) FROM ${libraryEntries} AS le2 WHERE le2.user_id = ${reviews.userId} AND (le2.played = 1 OR le2.playing = 1))`

const EDIT_THRESHOLD_MS = 60_000

const toViewerVote = (helpful: unknown, funny: unknown): ViewerVote => ({
  helpful: Number(helpful) === 1 ? 1 : Number(helpful) === -1 ? -1 : null,
  funny: Number(funny) === 1,
})

/**
 * A page of Savepoint community reviews for a game.
 * sort "helpful" = most "Yes" votes first, then newest; "recent" = newest first.
 */
export const listCommunityReviews = (input: {
  readonly gameId: number
  readonly viewerId: string | null
  readonly sort: ReviewSort
  readonly type: ReviewTypeFilter
  readonly offset?: number
  readonly limit?: number
}) => {
  const limit = input.limit ?? COMMUNITY_PAGE_SIZE
  const offset = input.offset ?? 0
  const viewerId = input.viewerId
  const conditions: SQL[] = [eq(reviews.gameId, input.gameId)]
  if (input.type === "positive") conditions.push(eq(reviews.recommended, true))
  if (input.type === "negative") conditions.push(eq(reviews.recommended, false))

  return dbQuery("reviews.community.list", (db) =>
    db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        body: reviews.body,
        recommended: reviews.recommended,
        hoursPlayed: reviews.hoursPlayed,
        containsSpoilers: reviews.containsSpoilers,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        username: users.username,
        displayName: users.displayName,
        avatarHue: users.avatarHue,
        avatarImage: games.coverImage,
        authorRating: libraryEntries.rating,
        authorReviewCount: authorReviewCountSql,
        authorGamesLogged: authorGamesLoggedSql,
        helpfulYes: helpfulYesSql,
        helpfulNo: helpfulNoSql,
        funny: funnySql,
        viewerHelpful: viewerId
          ? sql<number | null>`(SELECT rv.helpful FROM ${reviewVotes} AS rv WHERE rv.review_id = ${reviews.id} AND rv.user_id = ${viewerId})`
          : sql<null>`NULL`,
        viewerFunny: viewerId
          ? sql<number | null>`(SELECT rv.funny FROM ${reviewVotes} AS rv WHERE rv.review_id = ${reviews.id} AND rv.user_id = ${viewerId})`
          : sql<null>`NULL`,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.userId))
      .leftJoin(games, eq(games.id, users.avatarGameId))
      .leftJoin(libraryEntries, and(eq(libraryEntries.userId, reviews.userId), eq(libraryEntries.gameId, reviews.gameId)))
      .where(and(...conditions))
      .orderBy(
        ...(input.sort === "helpful"
          ? [desc(helpfulYesSql), desc(reviews.createdAt), desc(reviews.id)]
          : [desc(reviews.createdAt), desc(reviews.id)]),
      )
      .limit(limit + 1)
      .offset(offset),
  ).pipe(
    Effect.map((rows): CommunityReviewPage => {
      const page = rows.slice(0, limit)
      return {
        reviews: page.map((r): ReviewCardData => {
          const createdAt = r.createdAt.getTime()
          const updatedAt = r.updatedAt.getTime()
          return {
            id: r.id,
            source: "community",
            author: {
              name: r.displayName,
              profileUrl: `/u/${r.username}`,
              external: false,
              avatar: {
                kind: "savepoint",
                username: r.username,
                displayName: r.displayName,
                avatarHue: r.avatarHue,
                avatarImage: r.avatarImage ?? null,
              },
              productsOwned: Number(r.authorGamesLogged ?? 0),
              reviewCount: Number(r.authorReviewCount ?? 0),
            },
            recommended: r.recommended,
            body: r.body.trim() ? [{ text: r.body.trim(), spoiler: false }] : [],
            createdAt,
            updatedAt: updatedAt - createdAt > EDIT_THRESHOLD_MS ? updatedAt : null,
            playtimeMinutes: r.hoursPlayed !== null && r.hoursPlayed > 0 ? Math.round(r.hoursPlayed * 60) : null,
            playtimeAtReviewMinutes: null,
            steamDeck: false,
            earlyAccess: false,
            receivedForFree: false,
            containsSpoilers: r.containsSpoilers,
            authorRating: r.authorRating ?? null,
            votes: {
              helpful: Number(r.helpfulYes ?? 0),
              unhelpful: Number(r.helpfulNo ?? 0),
              funny: Number(r.funny ?? 0),
            },
            viewerVote: viewerId ? toViewerVote(r.viewerHelpful, r.viewerFunny) : null,
            isOwn: viewerId !== null && r.userId === viewerId,
            externalUrl: null,
          }
        }),
        nextOffset: rows.length > limit ? offset + limit : null,
      }
    }),
  )
}

const positiveSql = sql<number>`COALESCE(SUM(CASE WHEN ${reviews.recommended} = 1 THEN 1 ELSE 0 END), 0)`
const negativeSql = sql<number>`COALESCE(SUM(CASE WHEN ${reviews.recommended} = 1 THEN 0 ELSE 1 END), 0)`
const monthSql = sql<string>`strftime('%Y-%m', ${reviews.createdAt} / 1000, 'unixepoch')`
const daySql = sql<string>`strftime('%Y-%m-%d', ${reviews.createdAt} / 1000, 'unixepoch')`

const parseBucket = (key: string): number | null => {
  const [y, m, d] = key.split("-").map(Number)
  if (!y || !m) return null
  return Date.UTC(y, m - 1, d || 1)
}

const toPoints = (rows: readonly { bucket: string; up: number; down: number }[]): HistogramPoint[] =>
  rows.flatMap((r) => {
    const date = parseBucket(String(r.bucket))
    return date === null ? [] : [{ date, up: Number(r.up ?? 0), down: Number(r.down ?? 0) }]
  })

/** Totals, last-30-days totals and chart data for a game's community reviews. */
export const getCommunityOverview = (gameId: number) =>
  Effect.gen(function* () {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const [totals, monthly, daily] = yield* Effect.all(
      [
        dbQuery("reviews.community.totals", (db) =>
          db
            .select({
              positive: positiveSql,
              total: sql<number>`COUNT(*)`,
              latest: sql<number | null>`MAX(${reviews.updatedAt})`,
            })
            .from(reviews)
            .where(eq(reviews.gameId, gameId)),
        ),
        dbQuery("reviews.community.monthly", (db) =>
          db
            .select({ bucket: monthSql, up: positiveSql, down: negativeSql })
            .from(reviews)
            .where(eq(reviews.gameId, gameId))
            .groupBy(monthSql)
            .orderBy(monthSql),
        ),
        dbQuery("reviews.community.daily", (db) =>
          db
            .select({ bucket: daySql, up: positiveSql, down: negativeSql })
            .from(reviews)
            .where(and(eq(reviews.gameId, gameId), gte(reviews.createdAt, since)))
            .groupBy(daySql)
            .orderBy(daySql),
        ),
      ],
      { concurrency: "unbounded" },
    )
    const row = totals[0]
    const total = Number(row?.total ?? 0)
    const positive = Number(row?.positive ?? 0)
    const recent = fillDailyBuckets(toPoints(daily))
    return {
      overall: { positive, negative: total - positive, total },
      recent: sumHistogram(recent),
      histogram: { overall: fillMonthlyBuckets(toPoints(monthly)), overallUnit: "month", recent },
      version: `${total}-${Number(row?.latest ?? 0)}`,
    } satisfies CommunityOverview
  })

/* ── Votes ──────────────────────────────────────────────────────────────── */

export type VoteResult = {
  readonly counts: ReviewVoteCounts
  readonly viewerVote: ViewerVote
  readonly gameSlug: string
  readonly authorUsername: string
}

/**
 * Toggle a "Was this review helpful?" vote.
 *  - helpful / unhelpful are mutually exclusive; clicking the active one clears it
 *  - funny toggles independently
 *  - authors can't vote on their own review
 */
export const voteOnReview = (userId: string, reviewId: string, kind: ReviewVoteKind) =>
  Effect.gen(function* () {
    const target = yield* dbQuery("reviews.vote.target", (db) =>
      db
        .select({ id: reviews.id, authorId: reviews.userId, gameSlug: games.slug, authorUsername: users.username })
        .from(reviews)
        .innerJoin(games, eq(games.id, reviews.gameId))
        .innerJoin(users, eq(users.id, reviews.userId))
        .where(eq(reviews.id, reviewId))
        .limit(1),
    ).pipe(Effect.map((rows) => rows[0] ?? null))

    if (!target) return yield* new NotFoundError({ message: "That review no longer exists.", entity: "review" })
    if (target.authorId === userId) {
      return yield* new ForbiddenError({ message: "You can't vote on your own review." })
    }

    const result = yield* dbQuery("reviews.vote.toggle", (db) =>
      db.transaction(async (tx) => {
        const existing = await tx
          .select({ helpful: reviewVotes.helpful, funny: reviewVotes.funny })
          .from(reviewVotes)
          .where(and(eq(reviewVotes.reviewId, reviewId), eq(reviewVotes.userId, userId)))
          .limit(1)
        const current = toViewerVote(existing[0]?.helpful ?? null, existing[0]?.funny ? 1 : 0)
        const next: ViewerVote = {
          helpful:
            kind === "helpful"
              ? current.helpful === 1
                ? null
                : 1
              : kind === "unhelpful"
                ? current.helpful === -1
                  ? null
                  : -1
                : current.helpful,
          funny: kind === "funny" ? !current.funny : current.funny,
        }

        if (next.helpful === null && !next.funny) {
          await tx.delete(reviewVotes).where(and(eq(reviewVotes.reviewId, reviewId), eq(reviewVotes.userId, userId)))
        } else {
          await tx
            .insert(reviewVotes)
            .values({ reviewId, userId, helpful: next.helpful, funny: next.funny })
            .onConflictDoUpdate({
              target: [reviewVotes.reviewId, reviewVotes.userId],
              set: { helpful: next.helpful, funny: next.funny },
            })
        }

        const counts = await tx
          .select({
            helpful: sql<number>`COALESCE(SUM(CASE WHEN ${reviewVotes.helpful} = 1 THEN 1 ELSE 0 END), 0)`,
            unhelpful: sql<number>`COALESCE(SUM(CASE WHEN ${reviewVotes.helpful} = -1 THEN 1 ELSE 0 END), 0)`,
            funny: sql<number>`COALESCE(SUM(CASE WHEN ${reviewVotes.funny} = 1 THEN 1 ELSE 0 END), 0)`,
          })
          .from(reviewVotes)
          .where(eq(reviewVotes.reviewId, reviewId))
        const c = counts[0]
        return {
          viewerVote: next,
          counts: { helpful: Number(c?.helpful ?? 0), unhelpful: Number(c?.unhelpful ?? 0), funny: Number(c?.funny ?? 0) },
        }
      }),
    )

    return { ...result, gameSlug: target.gameSlug, authorUsername: target.authorUsername } satisfies VoteResult
  })
