import type { ReviewBodySegment } from "./types"

/**
 * Steam reviews are written in BBCode ([b], [i], [h1], [spoiler], [url=…],
 * [list][*]…). We never render it as HTML: tags are stripped to plain text
 * (keeping line breaks and list bullets) and [spoiler] blocks become separate
 * segments the UI blurs until clicked.
 */

const SPOILER_RE = /\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi

/** Tags whose whole content is dropped (images, embedded videos…). */
const DROP_CONTENT_RE = /\[(img|previewyoutube|video)(?:=[^\]]*)?\][\s\S]*?\[\/\1\]/gi
const SELF_CLOSING_EMBED_RE = /\[(?:previewyoutube|img)=[^\]]*\]/gi
const HEADING_CLOSE_RE = /\[\/h[1-6]\]/gi
const BLOCK_TAG_RE = /\[\/?(?:quote|code|list|olist|table|tr|noparse)(?:=[^\]]*)?\]/gi
const CELL_CLOSE_RE = /\[\/t[hd]\]/gi
const BULLET_RE = /\[\*\]\s*/g
const HR_RE = /\[hr\]\s*\[\/hr\]|\[hr\]/gi
/** Only real BBCode tags are stripped, so bracketed prose like "[EDIT]" or "[sic]" survives. */
const ANY_TAG_RE =
  /\[\/?(?:b|i|u|s|strike|h[1-6]|url|spoiler|noparse|hr|list|olist|quote|code|table|tr|th|td|img|previewyoutube|video|p|br|center|left|right|color|size|font|sup|sub)(?:=[^\]\n]*)?\]/gi

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
}

function decodeEntities(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITY_MAP[m] ?? m)
}

/** Strip BBCode tags to readable plain text (line breaks preserved). */
export function stripBbcode(input: string): string {
  let text = input.replace(/\r\n?/g, "\n")
  text = text.replace(DROP_CONTENT_RE, "")
  text = text.replace(SELF_CLOSING_EMBED_RE, "")
  // [url=https://…]label[/url] → label ; [url]https://…[/url] → https://…
  text = text.replace(/\[url=[^\]]*\]([\s\S]*?)\[\/url\]/gi, "$1")
  text = text.replace(HEADING_CLOSE_RE, "\n")
  text = text.replace(HR_RE, "\n———\n")
  text = text.replace(BULLET_RE, "\n• ")
  text = text.replace(CELL_CLOSE_RE, "  ")
  text = text.replace(BLOCK_TAG_RE, "\n")
  text = text.replace(ANY_TAG_RE, "")
  text = decodeEntities(text)
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * Plain text between spoilers. Keeps one space / line break at each edge when
 * the source had whitespace there, so an inline spoiler isn't glued to the
 * neighbouring words ("the [spoiler]boss[/spoiler] dies" → "the ", "boss", " dies").
 */
function segmentText(raw: string): string {
  const core = stripBbcode(raw)
  if (!core) return edgeWhitespace(raw)
  return edgeWhitespace(/^\s*/.exec(raw)?.[0] ?? "") + core + edgeWhitespace(/\s*$/.exec(raw)?.[0] ?? "")
}

/** Collapse a run of whitespace to "", " ", "\n" or "\n\n" (paragraph break). */
function edgeWhitespace(ws: string): string {
  if (!ws || !/\s/.test(ws)) return ""
  const breaks = ws.match(/\n/g)?.length ?? 0
  return breaks >= 2 ? "\n\n" : breaks === 1 ? "\n" : " "
}

/** Split a Steam review into plain-text segments, marking [spoiler] blocks. */
export function parseSteamReviewBody(input: string): ReviewBodySegment[] {
  const segments: ReviewBodySegment[] = []
  let last = 0
  for (const match of input.matchAll(SPOILER_RE)) {
    const index = match.index ?? 0
    const before = segmentText(input.slice(last, index))
    if (before) segments.push({ text: before, spoiler: false })
    const hidden = stripBbcode(match[1] ?? "")
    if (hidden) segments.push({ text: hidden, spoiler: true })
    last = index + match[0].length
  }
  const rest = segmentText(input.slice(last))
  if (rest) segments.push({ text: rest, spoiler: false })

  // only the review's outer edges are trimmed
  const first = segments[0]
  if (first && !first.spoiler) segments[0] = { ...first, text: first.text.trimStart() }
  const end = segments.length - 1
  const lastSegment = segments[end]
  if (lastSegment && !lastSegment.spoiler) segments[end] = { ...lastSegment, text: lastSegment.text.trimEnd() }
  return segments.filter((segment) => segment.text.length > 0)
}

/** Total characters of visible text (used to decide whether to clamp). */
export function bodyLength(segments: readonly ReviewBodySegment[]): number {
  return segments.reduce((n, s) => n + s.text.length, 0)
}
