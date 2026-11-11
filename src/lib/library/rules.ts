/**
 * Library business rules as pure functions (client-safe).
 *
 * The server enforces the same rules atomically in SQL (`entries.ts`); the
 * client uses these to predict the next state for optimistic updates and to
 * show friendly messages before a round-trip.
 *
 *  - Rating (1–10) ⇒ played, not wishlisted. Liking ⇒ played (and so not wishlisted).
 *  - Saving a review ⇒ played, not wishlisted.
 *  - Wishlisting is rejected when the game is played or being played.
 *  - Playing ⇒ not wishlisted, startedPlayingAt = now. Stopping with "finished" ⇒ played.
 *  - Un-marking played clears the rating + like (they imply played) and is
 *    rejected while a review exists.
 *  - A row with every flag false, no rating and no review is deleted.
 */
import type { LibraryEntryState, LibraryFlag, LibraryState, OwnReview } from "./types"

export type LibraryChange =
  | { readonly kind: "rating"; readonly rating: number | null }
  | { readonly kind: "flag"; readonly flag: LibraryFlag; readonly value: boolean; readonly finished?: boolean }
  | { readonly kind: "review"; readonly review: OwnReview | null }

const markPlayed = (entry: LibraryEntryState): LibraryEntryState => ({ ...entry, played: true, wishlisted: false })

export function applyRating(entry: LibraryEntryState, rating: number | null): LibraryEntryState {
  return rating === null ? { ...entry, rating: null } : { ...markPlayed(entry), rating }
}

export function applyFlag(
  entry: LibraryEntryState,
  flag: LibraryFlag,
  value: boolean,
  options: { readonly finished?: boolean; readonly hasReview?: boolean; readonly now?: number } = {},
): LibraryEntryState {
  const now = options.now ?? Date.now()
  switch (flag) {
    case "played":
      if (value) return markPlayed(entry)
      if (options.hasReview) return entry
      return { ...entry, played: false, rating: null, liked: false }
    case "playing":
      if (value) {
        return {
          ...entry,
          playing: true,
          wishlisted: false,
          startedPlayingAt: entry.playing ? (entry.startedPlayingAt ?? now) : now,
        }
      }
      return {
        ...(options.finished ? markPlayed(entry) : entry),
        playing: false,
        startedPlayingAt: null,
      }
    case "wishlisted":
      if (value && (entry.played || entry.playing)) return entry
      return { ...entry, wishlisted: value }
    case "liked":
      return value ? { ...markPlayed(entry), liked: true } : { ...entry, liked: false }
  }
}

/** Next state for an optimistic update. */
export function applyChange(state: LibraryState, change: LibraryChange): LibraryState {
  switch (change.kind) {
    case "rating":
      return { ...state, entry: applyRating(state.entry, change.rating) }
    case "flag":
      return {
        ...state,
        entry: applyFlag(state.entry, change.flag, change.value, {
          finished: change.finished,
          hasReview: state.review !== null,
        }),
      }
    case "review":
      return {
        ...state,
        review: change.review,
        entry: change.review ? markPlayed(state.entry) : state.entry,
      }
  }
}

/**
 * Why a flag change isn't allowed (null when it is). Shared by the server's
 * `ConflictError` and the client's pre-check so the wording is identical.
 */
export function flagConflict(
  state: Pick<LibraryState, "entry" | "review">,
  flag: LibraryFlag,
  value: boolean,
  title: string,
): string | null {
  if (flag === "wishlisted" && value) {
    if (state.entry.playing) return `You're playing ${title} right now — no need to wishlist it.`
    if (state.entry.played) return `You've already played ${title}. The wishlist is for games you haven't played yet.`
  }
  if (flag === "played" && !value && state.review) {
    return `You've reviewed ${title}. Delete your review first to unmark it as played.`
  }
  return null
}

/** True when the entry carries no information (the server deletes such rows). */
export const isEmptyEntry = (entry: LibraryEntryState, review: OwnReview | null) =>
  !entry.played && !entry.playing && !entry.wishlisted && !entry.liked && entry.rating === null && review === null
