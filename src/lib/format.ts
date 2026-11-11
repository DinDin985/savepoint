/** 1234567 → "1,234,567" */
export const formatNumber = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : new Intl.NumberFormat("en-US").format(n)

/** 1234567 → "1.2M" */
export const formatCompact = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)

/** ISO date (yyyy-mm-dd) → "Sep 17, 2020" */
export const formatReleaseDate = (iso: string | null | undefined) => {
  if (!iso) return "TBA"
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
}

export const formatDate = (date: Date | number) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

/** "3 days ago" style relative time */
export const timeAgo = (date: Date | number) => {
  const diff = Date.now() - new Date(date).getTime()
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 24 * 3600e3],
    ["month", 30 * 24 * 3600e3],
    ["week", 7 * 24 * 3600e3],
    ["day", 24 * 3600e3],
    ["hour", 3600e3],
    ["minute", 60e3],
  ]
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms) return rtf.format(-Math.round(diff / ms), unit)
  }
  return "just now"
}

/** Half-star rating (1–10) → "★★★½" */
export const ratingToStars = (rating: number | null | undefined) => {
  if (!rating) return ""
  return "★".repeat(Math.floor(rating / 2)) + (rating % 2 ? "½" : "")
}

/** Half-star rating (1–10) → 3.5 */
export const ratingToNumber = (rating: number | null | undefined) => (rating ? rating / 2 : null)

/** Minutes → "123.4 hrs" (Steam style) */
export const formatHours = (minutes: number) => `${(minutes / 60).toLocaleString("en-US", { maximumFractionDigits: 1 })} hrs`

/** Steam-style label for a positive ratio. */
export function steamScoreLabel(positive: number, total: number): { label: string; tone: "positive" | "mixed" | "negative" } {
  if (total === 0) return { label: "No user reviews", tone: "mixed" }
  const pct = positive / total
  if (pct >= 0.95 && total >= 500) return { label: "Overwhelmingly Positive", tone: "positive" }
  if (pct >= 0.8 && total >= 50) return { label: "Very Positive", tone: "positive" }
  if (pct >= 0.8) return { label: "Positive", tone: "positive" }
  if (pct >= 0.7) return { label: "Mostly Positive", tone: "positive" }
  if (pct >= 0.4) return { label: "Mixed", tone: "mixed" }
  if (pct >= 0.2) return { label: "Mostly Negative", tone: "negative" }
  if (total >= 500) return { label: "Overwhelmingly Negative", tone: "negative" }
  if (total >= 50) return { label: "Very Negative", tone: "negative" }
  return { label: "Negative", tone: "negative" }
}
