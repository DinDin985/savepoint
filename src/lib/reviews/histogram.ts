import type { HistogramPoint, ReviewSummary } from "./types"

const DAY_MS = 24 * 60 * 60 * 1000

/** Start of the UTC month containing `ms`. */
export const startOfUtcMonth = (ms: number) => {
  const d = new Date(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
}

/** Start of the UTC day containing `ms`. */
export const startOfUtcDay = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS

const nextUtcMonth = (ms: number) => {
  const d = new Date(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
}

/**
 * Monthly buckets from the first bucket through `untilMs` (inclusive), filling
 * empty months with zeros so the chart's time axis is continuous.
 */
export function fillMonthlyBuckets(points: readonly HistogramPoint[], untilMs = Date.now()): HistogramPoint[] {
  if (points.length === 0) return []
  const byMonth = new Map<number, HistogramPoint>()
  for (const p of points) {
    const key = startOfUtcMonth(p.date)
    const prev = byMonth.get(key)
    byMonth.set(key, { date: key, up: (prev?.up ?? 0) + p.up, down: (prev?.down ?? 0) + p.down })
  }
  const first = Math.min(...byMonth.keys())
  const last = Math.max(startOfUtcMonth(untilMs), ...byMonth.keys())
  const out: HistogramPoint[] = []
  // hard cap so a corrupt timestamp can't explode the array
  for (let m = first, guard = 0; m <= last && guard < 600; m = nextUtcMonth(m), guard++) {
    out.push(byMonth.get(m) ?? { date: m, up: 0, down: 0 })
  }
  return out
}

/** One bucket per UTC day for the last `days` days ending today, zero-filled. */
export function fillDailyBuckets(points: readonly HistogramPoint[], days = 30, untilMs = Date.now()): HistogramPoint[] {
  const byDay = new Map<number, HistogramPoint>()
  for (const p of points) {
    const key = startOfUtcDay(p.date)
    const prev = byDay.get(key)
    byDay.set(key, { date: key, up: (prev?.up ?? 0) + p.up, down: (prev?.down ?? 0) + p.down })
  }
  const today = startOfUtcDay(untilMs)
  const out: HistogramPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const day = today - i * DAY_MS
    out.push(byDay.get(day) ?? { date: day, up: 0, down: 0 })
  }
  return out
}

/** Sum of a histogram as a positive/negative summary. */
export function sumHistogram(points: readonly HistogramPoint[]): ReviewSummary {
  let positive = 0
  let negative = 0
  for (const p of points) {
    positive += p.up
    negative += p.down
  }
  return { positive, negative, total: positive + negative }
}
