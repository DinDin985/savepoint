/**
 * Pure (dependency-free) parser for https://steamcharts.com/app/<id>.
 *
 * The page renders three headline numbers:
 *   <div class="app-stat"> <span class="num">2094</span> <br>playing <abbr class="timeago" title="…"></abbr> </div>
 *   … 24-hour peak … all-time peak
 * and a `<table class="common-table">` with one row per month:
 *   Month | Avg. Players | Gain | % Gain | Peak Players     (first row = "Last 30 Days")
 *
 * We deliberately use tolerant regexes instead of a DOM library: unknown markup
 * is skipped, never thrown on.
 */

export type SteamChartsMonth = {
  /** yyyy-mm */
  readonly month: string
  readonly avgPlayers: number
  readonly peakPlayers: number
}

export type SteamChartsData = {
  readonly playing: number | null
  /** ISO timestamp SteamCharts sampled `playing` at (if present) */
  readonly playingAt: string | null
  readonly peak24h: number | null
  readonly allTimePeak: number | null
  readonly last30Days: { readonly avgPlayers: number; readonly peakPlayers: number } | null
  /** oldest → newest */
  readonly months: readonly SteamChartsMonth[]
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const

const decodeEntities = (text: string) =>
  text
    .replace(/&#43;/g, "+")
    .replace(/&#45;/g, "-")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))

const stripTags = (html: string) =>
  decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim()

/** "21,483.41" → 21483.41 ; "-" / "" → null */
export const parseNumber = (raw: string): number | null => {
  const cleaned = decodeEntities(raw).replace(/[,\s+%]/g, "")
  if (cleaned === "" || cleaned === "-") return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** "October 2026" → "2026-10" */
export const parseMonthLabel = (label: string): string | null => {
  const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(label.trim())
  if (!m) return null
  const index = MONTHS.indexOf(m[1].toLowerCase() as (typeof MONTHS)[number])
  if (index === -1) return null
  return `${m[2]}-${String(index + 1).padStart(2, "0")}`
}

export function parseSteamChartsHtml(html: string): SteamChartsData {
  let playing: number | null = null
  let playingAt: string | null = null
  let peak24h: number | null = null
  let allTimePeak: number | null = null

  const statRe = /<div[^>]*class="[^"]*\bapp-stat\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  for (const block of html.matchAll(statRe)) {
    const inner = block[1]
    const num = /<span[^>]*class="[^"]*\bnum\b[^"]*"[^>]*>\s*([\d,.]+)\s*<\/span>/i.exec(inner)
    if (!num) continue
    const value = parseNumber(num[1])
    if (value === null) continue
    const label = stripTags(inner.slice((num.index ?? 0) + num[0].length)).toLowerCase()
    if (label.includes("24-hour") || label.includes("24 hour")) peak24h = Math.round(value)
    else if (label.includes("all-time") || label.includes("all time")) allTimePeak = Math.round(value)
    else if (label.startsWith("playing")) {
      playing = Math.round(value)
      const at = /<abbr[^>]*title="([^"]+)"/i.exec(inner)?.[1]
      if (at && !Number.isNaN(Date.parse(at))) playingAt = new Date(at).toISOString()
    }
  }

  let last30Days: SteamChartsData["last30Days"] = null
  const byMonth = new Map<string, SteamChartsMonth>()
  const table = /<table[^>]*class="[^"]*\bcommon-table\b[^"]*"[^>]*>([\s\S]*?)<\/table>/i.exec(html)?.[1] ?? ""
  const body = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i.exec(table)?.[1] ?? table
  for (const row of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => stripTags(c[1]))
    if (cells.length < 5) continue
    const avg = parseNumber(cells[1])
    const peak = parseNumber(cells[4])
    if (avg === null || peak === null) continue
    if (/last\s*30\s*days/i.test(cells[0])) {
      last30Days = { avgPlayers: Math.round(avg), peakPlayers: Math.round(peak) }
      continue
    }
    const month = parseMonthLabel(cells[0])
    if (month && !byMonth.has(month))
      byMonth.set(month, { month, avgPlayers: Math.round(avg), peakPlayers: Math.round(peak) })
  }

  const months = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))
  return { playing, playingAt, peak24h, allTimePeak, last30Days, months }
}

/** True when the page yielded anything useful (guards against challenge / error pages). */
export const hasSteamChartsData = (data: SteamChartsData) =>
  data.playing !== null || data.peak24h !== null || data.allTimePeak !== null || data.months.length > 0
