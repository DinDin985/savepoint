"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ReviewCardData, ReviewSort, ReviewTypeFilter } from "@/lib/reviews/types"
import { isAbortError } from "./review-utils"

export type ReviewFilters = { readonly sort: ReviewSort; readonly type: ReviewTypeFilter }

export type ReviewListPage<T> = { readonly reviews: readonly ReviewCardData[]; readonly next: T | null }

/** Fetches one page for the given filters; `next` is the cursor/offset token (null = first page). */
export type ReviewPageFetcher<T> = (filters: ReviewFilters, next: T | null, signal: AbortSignal) => Promise<ReviewListPage<T>>

type ListState<T> = {
  readonly filters: ReviewFilters
  /** "loading" = (re)loading the first page; the list is replaced by skeletons */
  readonly phase: "ready" | "loading" | "error"
  readonly reviews: readonly ReviewCardData[]
  readonly next: T | null
  readonly loadingMore: boolean
  readonly error: string | null
  readonly moreError: string | null
}

const messageOf = (error: unknown) => (error instanceof Error && error.message ? error.message : "Something went wrong.")

/**
 * Client state for a paginated review list: filter switching (replaces the
 * list, shows skeletons, no page reload) and "Load more" (appends). Stale and
 * out-of-order responses are discarded. `fetchPage` must be referentially stable.
 *
 * When `initial` is null the first page is fetched on mount (on-demand tabs),
 * unless `initialError` says the server-side render already failed (then the
 * list starts in the error state and waits for "Try again").
 */
export function useReviewList<T>({
  initial,
  initialError = null,
  initialFilters,
  fetchPage,
}: {
  initial: ReviewListPage<T> | null
  initialError?: string | null
  initialFilters: ReviewFilters
  fetchPage: ReviewPageFetcher<T>
}) {
  const [state, setState] = useState<ListState<T>>(() => ({
    filters: initialFilters,
    phase: initial ? "ready" : initialError ? "error" : "loading",
    reviews: initial?.reviews ?? [],
    next: initial?.next ?? null,
    loadingMore: false,
    error: initial ? null : initialError,
    moreError: null,
  }))

  const requestId = useRef(0)
  const controller = useRef<AbortController | null>(null)

  /** Starts a request; only the latest one may update state. */
  const request = useCallback(
    (filters: ReviewFilters, next: T | null, append: boolean) => {
      controller.current?.abort()
      const ac = new AbortController()
      controller.current = ac
      const id = ++requestId.current
      fetchPage(filters, next, ac.signal).then(
        (page) => {
          if (id !== requestId.current) return
          setState((s) => ({
            ...s,
            phase: "ready",
            reviews: append ? dedupe([...s.reviews, ...page.reviews]) : page.reviews,
            next: page.next,
            loadingMore: false,
            error: null,
            moreError: null,
          }))
        },
        (error: unknown) => {
          if (id !== requestId.current || isAbortError(error)) return
          setState((s) =>
            append
              ? { ...s, loadingMore: false, moreError: messageOf(error) }
              : { ...s, phase: "error", reviews: [], next: null, loadingMore: false, error: messageOf(error) },
          )
        },
      )
    },
    [fetchPage],
  )

  /** Invalidates and aborts anything in flight (on unmount). */
  const cancel = useCallback(() => {
    requestId.current += 1
    controller.current?.abort()
  }, [])

  // On-demand tabs: fetch the first page when the panel mounts.
  const needsInitial = initial === null && !initialError
  const { sort: initialSort, type: initialType } = initialFilters
  useEffect(() => {
    if (needsInitial) request({ sort: initialSort, type: initialType }, null, false)
    return cancel
  }, [needsInitial, initialSort, initialType, request, cancel])

  const setFilters = useCallback(
    (filters: ReviewFilters) => {
      setState((s) => ({ ...s, filters, phase: "loading", loadingMore: false, error: null, moreError: null }))
      request(filters, null, false)
    },
    [request],
  )

  const loadMore = useCallback(() => {
    if (state.next === null || state.loadingMore || state.phase !== "ready") return
    setState((s) => ({ ...s, loadingMore: true, moreError: null }))
    request(state.filters, state.next, true)
  }, [request, state.filters, state.next, state.loadingMore, state.phase])

  const retry = useCallback(() => {
    setState((s) => ({ ...s, phase: "loading", error: null }))
    request(state.filters, null, false)
  }, [request, state.filters])

  return { ...state, setFilters, loadMore, retry, hasMore: state.next !== null }
}

function dedupe(reviews: readonly ReviewCardData[]): ReviewCardData[] {
  const seen = new Set<string>()
  return reviews.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
}
