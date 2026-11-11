import { steamScoreLabel } from "@/lib/format"
import type { HistogramUnit, ReviewSummary } from "@/lib/reviews/types"

export type ScoreTone = ReturnType<typeof steamScoreLabel>["tone"]

/** Steam colours for a review-score label. */
export const toneTextClass: Record<ScoreTone, string> = {
  positive: "text-steam-blue",
  mixed: "text-steam-mixed",
  negative: "text-steam-negative",
}

export const scoreFor = (summary: ReviewSummary) => steamScoreLabel(summary.positive, summary.total)

export const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0)

/** Deterministic (UTC) so server and client render the same string. */
export const formatPostedDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })

/** Chart axis tick for a bucket start. */
export const formatBucketTick = (ms: number, unit: HistogramUnit) =>
  new Date(ms).toLocaleDateString(
    "en-US",
    unit === "month" ? { month: "short", year: "numeric", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" },
  )

/** Chart tooltip title for a bucket start. */
export const formatBucketLabel = (ms: number, unit: HistogramUnit) => {
  if (unit === "month") return new Date(ms).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
  const day = new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
  return unit === "week" ? `Week of ${day}` : day
}

export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)

/** GET a JSON endpoint; non-2xx responses throw with the API's `{ error }` message. */
export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } })
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Request failed (${res.status})`
    throw new Error(message)
  }
  return body as T
}

export const isAbortError = (error: unknown) => error instanceof DOMException && error.name === "AbortError"

/**
 * Ids of the game page's log / review form, in order of preference: `#log`
 * (requested from the game-page feature) and the library panel that exists today.
 */
export const REVIEW_FORM_IDS = ["log", "library-panel"] as const

/** Fired on `window` when a reviews CTA asks for the review editor (the library panel may listen and open it). */
export const WRITE_REVIEW_EVENT = "savepoint:write-review"

/**
 * Smooth-scrolls to the review form and announces the intent. Returns false
 * when no form is on the page (the caller then lets the link navigate).
 */
export function scrollToReviewForm(): boolean {
  const target = REVIEW_FORM_IDS.map((id) => document.getElementById(id)).find((el) => el !== null)
  if (!target) return false
  target.scrollIntoView({ behavior: "smooth", block: "start" })
  window.dispatchEvent(new CustomEvent(WRITE_REVIEW_EVENT))
  return true
}
