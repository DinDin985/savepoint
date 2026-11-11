"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => undefined

/**
 * false during SSR and the hydration render, true afterwards (and on client-side
 * navigations). Use it to swap a deterministic server string (UTC date) for a
 * viewer-local / relative one without a hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}

/** Deterministic (UTC) date used before hydration: "Nov 10, 2026". */
export const formatUtcDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
