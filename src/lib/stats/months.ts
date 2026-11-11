/** Month helpers shared by stats aggregations and charts (pure, client-safe). */

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const
const LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

/** yyyy-mm keys for the last `count` calendar months (UTC), oldest → newest, ending with the current month. */
export function lastMonthKeys(count: number, now: Date = new Date()): string[] {
  const keys: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`)
  }
  return keys
}

/** First instant (UTC) of the month `monthsAgo` months before `now`. */
export function startOfMonthUtc(monthsAgo: number, now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1))
}

const split = (key: string) => {
  const [y, m] = key.split("-")
  return { year: Number(y), month: Number(m) - 1 }
}

/** "2026-10" → "Oct '26" ; "last-30" → "Last 30d" */
export function shortMonthLabel(key: string): string {
  if (key === "last-30") return "Last 30d"
  const { year, month } = split(key)
  if (!Number.isFinite(year) || !SHORT[month]) return key
  return `${SHORT[month]} '${String(year).slice(-2)}`
}

/** "2026-10" → "October 2026" ; "last-30" → "Last 30 days" */
export function longMonthLabel(key: string): string {
  if (key === "last-30") return "Last 30 days"
  const { year, month } = split(key)
  if (!Number.isFinite(year) || !LONG[month]) return key
  return `${LONG[month]} ${year}`
}
