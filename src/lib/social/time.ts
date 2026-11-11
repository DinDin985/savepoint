/**
 * Pure date helpers for the feed's day headings. No server imports, so the
 * client can re-run them in the viewer's own time zone after hydration.
 */

/** Grouping key for a calendar day in the runtime's local time zone (yyyy-m-d). */
export const dayKeyOf = (date: Date | number) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** "Today", "Yesterday", "Monday" (within a week) or "Mon, Mar 3[, 2025]". */
export const dayLabelOf = (date: Date | number, now: Date | number = Date.now()) => {
  const d = new Date(date)
  const n = new Date(now)
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(n) - startOf(d)) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "long" })
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(d.getFullYear() === n.getFullYear() ? {} : { year: "numeric" }),
  })
}
