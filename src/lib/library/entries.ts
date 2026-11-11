import "server-only"
import { randomUUID } from "node:crypto"
import { and, eq, inArray, isNull, notExists, sql, type SQL } from "drizzle-orm"
import type { BatchItem } from "drizzle-orm/batch"
import { Effect, Schema } from "effect"
import { logActivity } from "@/lib/activity"
import type { AppDb } from "@/lib/db/client"
import { activities, games, libraryEntries, reviews, reviewVotes } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"
import { ConflictError, NotFoundError } from "@/lib/effect/errors"
import { validate } from "@/lib/effect/validation"
import { flagConflict } from "./rules"
import { RatingSchema, ReviewDraftSchema } from "./schemas"
import { EMPTY_ENTRY, type LibraryFlag, type LibraryState, type ReviewDraft } from "./types"

/* ──────────────────────────────────────────────────────────────────────────
 * Library entries: one row per (user, game) + the user's review.
 * Every mutation is a single libSQL batch (one atomic transaction):
 *   [conditional upserts/updates…, delete-if-empty, read back the new state]
 * Business rules are documented in ./rules.ts.
 * ────────────────────────────────────────────────────────────────────────── */

type LibraryInsert = typeof libraryEntries.$inferInsert
type EntryFields = Partial<Pick<LibraryInsert, "played" | "playing" | "wishlisted" | "liked" | "rating" | "startedPlayingAt">>

const entryKey = (userId: string, gameId: number) =>
  and(eq(libraryEntries.userId, userId), eq(libraryEntries.gameId, gameId))

const reviewKey = (userId: string, gameId: number) => and(eq(reviews.userId, userId), eq(reviews.gameId, gameId))

/** The viewer's entry + review for a game, joined from the game row (so a missing game → no row). */
const stateQuery = (db: AppDb, userId: string, gameId: number) =>
  db
    .select({
      gameId: games.id,
      slug: games.slug,
      title: games.title,
      played: libraryEntries.played,
      playing: libraryEntries.playing,
      wishlisted: libraryEntries.wishlisted,
      liked: libraryEntries.liked,
      rating: libraryEntries.rating,
      startedPlayingAt: libraryEntries.startedPlayingAt,
      updatedAt: libraryEntries.updatedAt,
      reviewId: reviews.id,
      reviewBody: reviews.body,
      reviewRecommended: reviews.recommended,
      reviewHours: reviews.hoursPlayed,
      reviewSpoilers: reviews.containsSpoilers,
      reviewCreatedAt: reviews.createdAt,
      reviewUpdatedAt: reviews.updatedAt,
    })
    .from(games)
    .leftJoin(libraryEntries, and(eq(libraryEntries.gameId, games.id), eq(libraryEntries.userId, userId)))
    .leftJoin(reviews, and(eq(reviews.gameId, games.id), eq(reviews.userId, userId)))
    .where(eq(games.id, gameId))
    .limit(1)

type StateRow = Awaited<ReturnType<typeof stateQuery>>[number]

type Loaded = { readonly title: string; readonly state: LibraryState }

const toTime = (d: Date | null | undefined) => (d ? d.getTime() : null)

const toLoaded = (row: StateRow): Loaded => ({
  title: row.title,
  state: {
    gameId: row.gameId,
    slug: row.slug,
    entry:
      row.played === null
        ? EMPTY_ENTRY
        : {
            played: Boolean(row.played),
            playing: Boolean(row.playing),
            wishlisted: Boolean(row.wishlisted),
            liked: Boolean(row.liked),
            rating: row.rating ?? null,
            startedPlayingAt: toTime(row.startedPlayingAt),
            updatedAt: toTime(row.updatedAt),
          },
    review:
      row.reviewId === null
        ? null
        : {
            id: row.reviewId,
            body: row.reviewBody ?? "",
            recommended: Boolean(row.reviewRecommended),
            hoursPlayed: row.reviewHours ?? null,
            containsSpoilers: Boolean(row.reviewSpoilers),
            createdAt: toTime(row.reviewCreatedAt) ?? 0,
            updatedAt: toTime(row.reviewUpdatedAt) ?? 0,
          },
  },
})

const gameNotFound = () => new NotFoundError({ message: "That game isn't in the catalog (anymore).", entity: "game" })

const fromRows = (rows: readonly StateRow[]) => (rows[0] ? Effect.succeed(toLoaded(rows[0])) : Effect.fail(gameNotFound()))

const loadState = (userId: string, gameId: number) =>
  dbQuery("library.state", (db) => stateQuery(db, userId, gameId)).pipe(Effect.flatMap(fromRows))

/** Deletes the row when it no longer carries any information. */
const deleteIfEmpty = (db: AppDb, userId: string, gameId: number) =>
  db
    .delete(libraryEntries)
    .where(
      and(
        entryKey(userId, gameId),
        eq(libraryEntries.played, false),
        eq(libraryEntries.playing, false),
        eq(libraryEntries.wishlisted, false),
        eq(libraryEntries.liked, false),
        isNull(libraryEntries.rating),
        notExists(db.select({ one: sql`1` }).from(reviews).where(reviewKey(userId, gameId))),
      ),
    )

/** INSERT … ON CONFLICT(user, game) DO UPDATE with the same fields (optionally guarded by `setWhere`). */
const upsertEntry = (
  db: AppDb,
  userId: string,
  gameId: number,
  fields: EntryFields,
  at: Date,
  options: { readonly set?: { readonly startedPlayingAt?: SQL }; readonly setWhere?: SQL } = {},
) =>
  db
    .insert(libraryEntries)
    .values({ userId, gameId, ...fields, createdAt: at, updatedAt: at })
    .onConflictDoUpdate({
      target: [libraryEntries.userId, libraryEntries.gameId],
      set: { ...fields, ...options.set, updatedAt: at },
      setWhere: options.setWhere,
    })

const updateEntry = (db: AppDb, userId: string, gameId: number, fields: EntryFields, at: Date, extraWhere?: SQL) =>
  db
    .update(libraryEntries)
    .set({ ...fields, updatedAt: at })
    .where(extraWhere ? and(entryKey(userId, gameId), extraWhere) : entryKey(userId, gameId))

/** Runs the writes + cleanup + state read-back as one atomic batch. */
const writeThenLoad = (
  op: string,
  userId: string,
  gameId: number,
  writes: (db: AppDb) => readonly BatchItem<"sqlite">[],
) =>
  dbQuery(op, async (db) => {
    const statements = [...writes(db), deleteIfEmpty(db, userId, gameId), stateQuery(db, userId, gameId)]
    const results = await db.batch(statements as unknown as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]])
    return results[results.length - 1] as StateRow[]
  }).pipe(Effect.flatMap(fromRows))

/* ── Public API (Effects requiring only Database) ───────────────────────── */

/** The user's library state for a game (empty entry when they've never logged it). */
export const getEntry = (userId: string, gameId: number) => loadState(userId, gameId).pipe(Effect.map((l) => l.state))

/**
 * Rate on the half-star scale (1–10) or clear with `null`.
 * Rating ⇒ played + not wishlisted.
 */
export const setRating = Effect.fn("library.setRating")(function* (userId: string, gameId: number, rating: number | null) {
  const input = yield* validate(Schema.Struct({ rating: RatingSchema }), { rating })
  const prev = yield* loadState(userId, gameId)
  const at = new Date()
  const next = yield* writeThenLoad("library.setRating", userId, gameId, (db) =>
    input.rating === null
      ? [updateEntry(db, userId, gameId, { rating: null }, at)]
      : [upsertEntry(db, userId, gameId, { rating: input.rating, played: true, wishlisted: false }, at)],
  )
  if (input.rating !== null && prev.state.entry.rating !== input.rating) {
    yield* logActivity({ userId, kind: "rated", gameId, rating: input.rating })
  }
  return next.state
})

const flagWrites = (
  db: AppDb,
  userId: string,
  gameId: number,
  flag: LibraryFlag,
  value: boolean,
  finished: boolean,
  at: Date,
): BatchItem<"sqlite">[] => {
  switch (flag) {
    case "played":
      return value
        ? [upsertEntry(db, userId, gameId, { played: true, wishlisted: false }, at)]
        : [
            // a rating / like implies played, so they go too; never while a review exists
            updateEntry(
              db,
              userId,
              gameId,
              { played: false, rating: null, liked: false },
              at,
              notExists(db.select({ one: sql`1` }).from(reviews).where(reviewKey(userId, gameId))),
            ),
          ]
    case "playing":
      return value
        ? [
            upsertEntry(db, userId, gameId, { playing: true, wishlisted: false, startedPlayingAt: at }, at, {
              // keep the original start date when they were already playing
              set: {
                startedPlayingAt: sql`CASE WHEN ${libraryEntries.playing} = 1 THEN COALESCE(${libraryEntries.startedPlayingAt}, ${at.getTime()}) ELSE ${at.getTime()} END`,
              },
            }),
          ]
        : [
            updateEntry(
              db,
              userId,
              gameId,
              finished
                ? { playing: false, startedPlayingAt: null, played: true, wishlisted: false }
                : { playing: false, startedPlayingAt: null },
              at,
            ),
          ]
    case "wishlisted":
      return value
        ? [
            upsertEntry(db, userId, gameId, { wishlisted: true }, at, {
              // never wishlist something already played / being played (race-safe guard)
              setWhere: and(eq(libraryEntries.played, false), eq(libraryEntries.playing, false)),
            }),
          ]
        : [updateEntry(db, userId, gameId, { wishlisted: false }, at)]
    case "liked":
      return value
        ? [upsertEntry(db, userId, gameId, { liked: true, played: true, wishlisted: false }, at)]
        : [updateEntry(db, userId, gameId, { liked: false }, at)]
  }
}

/**
 * Toggle played / playing / wishlisted / liked.
 * `finished` only matters when turning "playing" off (finished ⇒ played).
 * Wishlisting a played or currently-played game fails with a friendly `ConflictError`.
 */
export const setFlag = Effect.fn("library.setFlag")(function* (
  userId: string,
  gameId: number,
  flag: LibraryFlag,
  value: boolean,
  options: { readonly finished?: boolean } = {},
) {
  const prev = yield* loadState(userId, gameId)
  const conflict = flagConflict(prev.state, flag, value, prev.title)
  if (conflict) return yield* new ConflictError({ message: conflict, field: flag })

  const finished = options.finished === true
  const at = new Date()
  const next = yield* writeThenLoad(`library.setFlag.${flag}`, userId, gameId, (db) =>
    flagWrites(db, userId, gameId, flag, value, finished, at),
  )

  // the SQL guards won the race against a concurrent change → report it like the pre-check would
  const blocked =
    (flag === "wishlisted" && value && !next.state.entry.wishlisted) || (flag === "played" && !value && next.state.entry.played)
  if (blocked) {
    return yield* new ConflictError({
      message: flagConflict(next.state, flag, value, next.title) ?? "That change conflicts with your library. Refresh and try again.",
      field: flag,
    })
  }

  const before = prev.state.entry
  const after = next.state.entry
  if (flag === "played" && value && !before.played) yield* logActivity({ userId, kind: "played", gameId, rating: after.rating })
  if (flag === "playing" && value && !before.playing) yield* logActivity({ userId, kind: "playing", gameId })
  if (flag === "playing" && !value && finished && !before.played) {
    yield* logActivity({ userId, kind: "played", gameId, rating: after.rating })
  }
  if (flag === "wishlisted" && value && !before.wishlisted) yield* logActivity({ userId, kind: "wishlisted", gameId })
  if (flag === "liked" && value && !before.liked) yield* logActivity({ userId, kind: "liked", gameId })

  return next.state
})

/**
 * Create or edit the user's review (one per game).
 * Body 10–8000 chars after trimming, hours 0–100000. Saving ⇒ played + not wishlisted.
 */
export const upsertReview = Effect.fn("library.upsertReview")(function* (userId: string, gameId: number, draft: ReviewDraft) {
  const input = yield* validate(ReviewDraftSchema, draft)
  const prev = yield* loadState(userId, gameId)
  const hoursPlayed = input.hoursPlayed === undefined || input.hoursPlayed === null ? null : Math.round(input.hoursPlayed * 10) / 10
  const at = new Date()
  const next = yield* writeThenLoad("library.upsertReview", userId, gameId, (db) => [
    db
      .insert(reviews)
      .values({
        id: randomUUID(),
        userId,
        gameId,
        body: input.body,
        recommended: input.recommended,
        hoursPlayed,
        containsSpoilers: input.containsSpoilers,
        createdAt: at,
        updatedAt: at,
      })
      .onConflictDoUpdate({
        target: [reviews.userId, reviews.gameId],
        set: {
          body: input.body,
          recommended: input.recommended,
          hoursPlayed,
          containsSpoilers: input.containsSpoilers,
          updatedAt: at,
        },
      }),
    upsertEntry(db, userId, gameId, { played: true, wishlisted: false }, at),
  ])
  if (!prev.state.review && next.state.review) {
    yield* logActivity({ userId, kind: "reviewed", gameId, reviewId: next.state.review.id, rating: next.state.entry.rating })
  }
  return next.state
})

/** Delete the user's review of a game (the game stays logged as played). */
export const deleteReview = Effect.fn("library.deleteReview")(function* (userId: string, gameId: number) {
  const prev = yield* loadState(userId, gameId)
  if (!prev.state.review) {
    return yield* new NotFoundError({ message: "You haven't reviewed this game.", entity: "review" })
  }
  const next = yield* writeThenLoad("library.deleteReview", userId, gameId, (db) => {
    const reviewIds = db.select({ id: reviews.id }).from(reviews).where(reviewKey(userId, gameId))
    return [
      // explicit cleanup: hosted libSQL connections may not enforce ON DELETE CASCADE
      db.delete(reviewVotes).where(inArray(reviewVotes.reviewId, reviewIds)),
      db.delete(activities).where(inArray(activities.reviewId, reviewIds)),
      db.delete(reviews).where(reviewKey(userId, gameId)),
    ]
  })
  return next.state
})
