#!/usr/bin/env node
// Builds data/catalog.json from the curated list in games.config.mjs.
//
//   node scripts/catalog/build-catalog.mjs              # build everything
//   node scripts/catalog/build-catalog.mjs --only hades,celeste   # rebuild a few (others kept from previous output)
//
// Dependency-free (Node >= 18 for global fetch). Polite by design: at most 3 games in
// flight, a minimum delay between requests to the same host, 15s timeouts and 2 retries
// with backoff. A failing source never aborts the build; it is recorded in `warnings`.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GAMES, GENRES, ART_STYLES, TIERS, PLATFORMS } from './games.config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_FILE = path.join(ROOT, 'data', 'catalog.json')

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const WIKI_UA = 'SavepointCatalogBuilder/1.0 (educational project)'

const CONCURRENCY = 3
const TIMEOUT_MS = 15_000
const RETRIES = 2
const RATE_LIMIT_RETRIES = 4 // extra patience for explicit 429s (we honour Retry-After)
const DEFAULT_HOST_DELAY_MS = 250
const HOST_DELAY_MS = {
  'steamcharts.com': 750,
  'en.wikipedia.org': 1000, // Wikimedia throttles anonymous API clients aggressively
  'www.wikidata.org': 1000,
  'query.wikidata.org': 1000,
  'upload.wikimedia.org': 1500, // answers 429 quickly to rapid HEAD checks
  'thumb.wikimedia.org': 1500,
}

const STEAM_ASSET_BASE = 'https://shared.akamai.steamstatic.com/store_item_assets/'
const MAX_SCREENSHOTS = 8
const MAX_TRAILERS = 4
const MAX_ABOUT_PARAGRAPHS = 6
const MAX_ABOUT_CHARS = 1200

// ------------------------------------------------------------------ logging

const t0 = Date.now()
const stamp = () => `${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s`
const log = (...a) => console.log(stamp(), ...a)

// ------------------------------------------------------------------ polite HTTP

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const hostNextSlot = new Map()
const hostDelay = new Map()

function delayFor(host) {
  return hostDelay.get(host) ?? HOST_DELAY_MS[host] ?? DEFAULT_HOST_DELAY_MS
}

/** Reserve the next request slot for a host (works with concurrent callers). */
async function throttle(host) {
  const now = Date.now()
  const slot = Math.max(now, hostNextSlot.get(host) ?? 0)
  hostNextSlot.set(host, slot + delayFor(host))
  if (slot > now) await sleep(slot - now)
}

class HttpError extends Error {
  constructor(status, url, extra = '') {
    super(`HTTP ${status} for ${url}${extra ? ` (${extra})` : ''}`)
    this.status = status
  }
}

/**
 * fetch with per-host throttling, timeout and retries.
 * Returns the Response for any non-retryable status (caller decides), retries on
 * network errors, timeouts, 5xx and 429.
 */
async function politeFetch(url, opts = {}) {
  const host = new URL(url).host
  const headers = { 'user-agent': hostIsWikimedia(host) ? WIKI_UA : BROWSER_UA, ...opts.headers }
  let attempt = 0
  let rateLimitAttempts = 0
  for (;;) {
    await throttle(host)
    try {
      const res = await fetch(url, { ...opts, headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (res.status === 429 && rateLimitAttempts < RATE_LIMIT_RETRIES) {
        rateLimitAttempts++
        const retryAfter = Number(res.headers.get('retry-after'))
        const wait = Math.min(60_000, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5000 * rateLimitAttempts)
        hostDelay.set(host, Math.min(5000, delayFor(host) * 2)) // slow down for the rest of the run
        log(`  ! 429 from ${host}; waiting ${Math.round(wait / 1000)}s (host delay now ${delayFor(host)}ms)`)
        await res.body?.cancel()
        await sleep(wait)
        continue
      }
      if (res.status >= 500 && attempt < RETRIES) {
        attempt++
        await res.body?.cancel()
        await sleep(1000 * 3 ** (attempt - 1))
        continue
      }
      return res
    } catch (err) {
      if (attempt < RETRIES) {
        attempt++
        await sleep(1000 * 3 ** (attempt - 1))
        continue
      }
      throw new Error(`${err.name === 'TimeoutError' ? 'timeout' : err.message} for ${url}`)
    }
  }
}

function hostIsWikimedia(host) {
  return /(^|\.)(wikipedia|wikidata|wikimedia)\.org$/.test(host)
}

async function getJson(url, opts) {
  const res = await politeFetch(url, opts)
  if (!res.ok) {
    await res.body?.cancel()
    throw new HttpError(res.status, url)
  }
  return res.json()
}

async function getText(url, opts) {
  const res = await politeFetch(url, opts)
  if (!res.ok) {
    await res.body?.cancel()
    throw new HttpError(res.status, url)
  }
  return res.text()
}

/** HEAD (falling back to a ranged GET when HEAD is not allowed). Returns the status code. */
const urlStatusCache = new Map()
async function urlStatus(url) {
  if (urlStatusCache.has(url)) return urlStatusCache.get(url)
  let status
  try {
    let res = await politeFetch(url, { method: 'HEAD' })
    if (res.status === 405 || res.status === 501) {
      res = await politeFetch(url, { headers: { range: 'bytes=0-0' } })
      await res.body?.cancel()
      status = res.status === 206 ? 200 : res.status
    } else {
      status = res.status
    }
  } catch {
    status = 0
  }
  urlStatusCache.set(url, status)
  return status
}

async function firstLiveUrl(candidates) {
  for (const url of candidates) {
    if (url && (await urlStatus(url)) === 200) return url
  }
  return null
}

// ------------------------------------------------------------------ text helpers

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»',
  trade: '™', reg: '®', copy: '©', bull: '•', middot: '·', deg: '°', times: '×', eacute: 'é',
  egrave: 'è', ecirc: 'ê', aacute: 'á', agrave: 'à', acirc: 'â', iacute: 'í', oacute: 'ó',
  uacute: 'ú', ntilde: 'ñ', ouml: 'ö', uuml: 'ü', auml: 'ä', ccedil: 'ç', szlig: 'ß', shy: '',
  zwj: '', zwnj: '', thinsp: ' ', ensp: ' ', emsp: ' ', euro: '€', pound: '£', yen: '¥', cent: '¢',
}

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m
    }
    const v = NAMED_ENTITIES[e.toLowerCase()]
    return v === undefined ? m : v
  })
}

const collapse = (s) => s.replace(/[\s ]+/g, ' ').trim()

/** Plain text from a short HTML string (e.g. Steam short_description). */
function htmlToText(html) {
  return collapse(decodeEntities(String(html ?? '').replace(/<[^>]*>/g, ' ')))
}

const HEADING = '\u0001' // sentinel prefix marking heading paragraphs while parsing

/** Steam about_the_game HTML -> list of plain-text paragraphs (headings kept as their own paragraph). */
function steamAboutToParagraphs(html) {
  if (!html) return []
  let s = String(html)
  s = s.replace(/<(script|style|video|iframe|object)\b[\s\S]*?<\/\1>/gi, ' ')
  s = s.replace(/<(img|source|video)\b[^>]*>/gi, ' ')
  s = s.replace(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, inner) => `\n\n${HEADING}${inner.replace(/<[^>]*>/g, ' ')}\n\n`)
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<\/?(p|div|ul|ol|li|blockquote|table|tr)\b[^>]*>/gi, '\n')
  s = s.replace(/<\/?(i|b|em|strong|u|a|span|sup|sub|font)\b[^>]*>/gi, '') // inline: no extra spaces
  s = s.replace(/<[^>]*>/g, ' ')
  s = decodeEntities(s)
  const lines = s
    .split(/\n+/)
    .map((line) => {
      const isHeading = line.includes(HEADING)
      const text = collapse(line.replaceAll(HEADING, '')).replace(/\s+([,.;:!?])(?=\s|$)/g, '$1')
      return { text, isHeading }
    })
    .filter((p) => p.text)
  // Re-join prose that was hard-wrapped with <br> mid-sentence (next line starts lowercase).
  const paras = []
  for (const line of lines) {
    const prev = paras.at(-1)
    if (prev && !prev.isHeading && !line.isHeading && !/[.!?:;"”)…]$/.test(prev.text) && /^[a-z]/.test(line.text)) {
      prev.text = `${prev.text} ${line.text}`
    } else {
      paras.push({ ...line })
    }
  }
  return paras.filter((p) => p.isHeading || p.text.length >= 20)
}

const ABBREVIATIONS = new Set(['bros', 'mr', 'mrs', 'ms', 'dr', 'st', 'jr', 'sr', 'vs', 'inc', 'co', 'ltd', 'no', 'vol', 'feat', 'approx', 'etc', 'e.g', 'i.e', 'u.s', 'u.k'])

function splitSentences(text) {
  const out = []
  let start = 0
  const re = /[.!?](?=["'”’)]*\s+["'“‘(]?[A-Z0-9])/g
  let m
  while ((m = re.exec(text))) {
    const end = m.index + 1
    const before = text.slice(start, end)
    const lastWord = (before.match(/([A-Za-z.]+)\.$/)?.[1] ?? '').toLowerCase()
    if (m[0] === '.' && (ABBREVIATIONS.has(lastWord) || /^[a-z]$/i.test(lastWord))) continue
    out.push(text.slice(start, end).trim())
    start = end
  }
  const rest = text.slice(start).trim()
  if (rest) out.push(rest)
  return out
}

function truncateAtSentence(text, budget) {
  if (text.length <= budget) return text
  let acc = ''
  for (const sentence of splitSentences(text)) {
    const next = acc ? `${acc} ${sentence}` : sentence
    if (next.length > budget) break
    acc = next
  }
  if (acc) return acc
  const cut = text.slice(0, budget)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), budget - 20))}…`
}

/**
 * Cap paragraphs at MAX_ABOUT_PARAGRAPHS / ~MAX_ABOUT_CHARS. A paragraph that would overflow
 * the budget is sentence-truncated when we have fewer than two body paragraphs so far.
 */
function capParagraphs(paras) {
  const out = []
  let total = 0
  let body = 0
  for (const p of paras) {
    if (out.length >= MAX_ABOUT_PARAGRAPHS) break
    const remaining = MAX_ABOUT_CHARS - total
    if (p.text.length <= remaining) {
      out.push(p)
      total += p.text.length
      if (!p.isHeading) body++
      continue
    }
    if (!p.isHeading && body < 2 && remaining >= 120) {
      const t = truncateAtSentence(p.text, remaining)
      out.push({ text: t, isHeading: false })
    }
    break
  }
  while (out.length && out.at(-1).isHeading) out.pop() // no dangling headings
  while (out.length > 1 && out[0].isHeading && out[1].isHeading) out.shift()
  return out.map((p) => p.text)
}

function shortFromExtract(extract) {
  const sentences = splitSentences(collapse(extract ?? ''))
  let acc = ''
  for (const s of sentences.slice(0, 3)) {
    const next = acc ? `${acc} ${s}` : s
    if (acc && next.length > 320) break
    acc = next
  }
  return acc
}

function slugify(s) {
  return s
    .replace(/[™®©]/g, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const normTitle = (s) =>
  String(s ?? '')
    .replace(/[™®©]/g, '') // before NFKD, which would turn ™ into "TM"
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 }
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** Steam release_date.date -> yyyy-mm-dd, or null for partial / unknown dates. */
function parseSteamDate(str) {
  if (!str) return null
  const s = str.trim().replace(/,/g, '')
  let m = s.match(/^([A-Za-z]{3,9})\.? (\d{1,2}) (\d{4})$/) // "Sep 17 2020"
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) return iso(m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], m[2])
  m = s.match(/^(\d{1,2}) ([A-Za-z]{3,9})\.? (\d{4})$/) // "17 Sep 2020"
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) return iso(m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], m[1])
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return s
  return null
}

const stripQuery = (u) => (u ? u.split('?')[0] : u)
const withHttps = (u) => (u?.startsWith('//') ? `https:${u}` : u)

// ------------------------------------------------------------------ Steam

const steamAssets = new Map() // appid -> GetItems assets

async function prefetchSteamAssets(appIds) {
  for (let i = 0; i < appIds.length; i += 25) {
    const ids = appIds.slice(i, i + 25)
    const input = {
      ids: ids.map((appid) => ({ appid })),
      context: { language: 'english', country_code: 'US' },
      data_request: { include_assets: true },
    }
    try {
      const d = await getJson(`https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`)
      for (const item of d?.response?.store_items ?? []) {
        if (item?.assets) steamAssets.set(item.appid ?? item.id, item.assets)
      }
    } catch (err) {
      log(`  ! Steam GetItems asset prefetch failed (${err.message}); will fall back to legacy asset paths`)
    }
  }
  log(`Prefetched Steam library assets for ${steamAssets.size}/${appIds.length} apps`)
}

function steamAssetUrl(appid, key) {
  const a = steamAssets.get(appid)
  if (!a?.asset_url_format || !a[key]) return null
  return STEAM_ASSET_BASE + a.asset_url_format.replace('${FILENAME}', a[key])
}

const legacyAsset = (appid, file) => `${STEAM_ASSET_BASE}steam/apps/${appid}/${file}`

async function fetchSteam(entry, game) {
  const id = entry.steamAppId
  const d = await getJson(`https://store.steampowered.com/api/appdetails?appids=${id}&l=english&cc=us`)
  const res = d?.[id]
  if (!res?.success || !res.data) throw new Error(`appdetails success=false for ${id}`)
  const a = res.data

  // Verify the curated id points at the intended game.
  const want = normTitle(entry.title)
  const got = normTitle(a.name)
  const wantCore = want.split(' ').slice(0, 3).join(' ')
  if (!got.includes(wantCore) && !want.includes(got)) {
    game.warnings.push(`steam: app ${id} is named "${a.name}", expected "${entry.title}"`)
    log(`  !! ${entry.title}: Steam app ${id} is "${a.name}" — check the id`)
  }
  game.steamName = a.name

  game.shortDescription = htmlToText(a.short_description)
  game.about = capParagraphs(steamAboutToParagraphs(a.about_the_game))
  if (a.release_date?.coming_soon) {
    game.releaseDate = parseSteamDate(a.release_date.date)
  } else {
    game.releaseDate = parseSteamDate(a.release_date?.date)
    if (!game.releaseDate) game.warnings.push(`steam: could not parse release date "${a.release_date?.date}"`)
  }
  game.developers = (a.developers ?? []).map(collapse).filter(Boolean)
  game.publishers = (a.publishers ?? []).map(collapse).filter(Boolean)
  game.steamGenres = (a.genres ?? []).map((g) => g.description).filter(Boolean)
  game.headerImage = a.header_image ?? null
  game.screenshots = (a.screenshots ?? []).map((s) => s.path_full).filter(Boolean).slice(0, MAX_SCREENSHOTS)
  const movies = [...(a.movies ?? [])].sort((x, y) => Number(!!y.highlight) - Number(!!x.highlight))
  game.trailers = movies.slice(0, MAX_TRAILERS).map((m) => ({
    name: collapse(decodeEntities(m.name ?? 'Trailer')),
    thumbnail: m.thumbnail ?? null,
    hls: m.hls_h264 ?? null,
    youtubeId: null,
  }))
  game.metacritic = a.metacritic?.score ?? null
  game.website = a.website || null
  game.storeLinks.steam = `https://store.steampowered.com/app/${id}/`

  // Portrait cover + wide hero: current assets from GetItems first, then legacy fixed paths.
  const cover = await firstLiveUrl([
    steamAssetUrl(id, 'library_capsule_2x'),
    steamAssetUrl(id, 'library_capsule'),
    legacyAsset(id, 'library_600x900_2x.jpg'),
    legacyAsset(id, 'library_600x900.jpg'),
  ])
  if (cover) {
    game.coverImage = cover
  } else if (a.header_image) {
    game.coverImage = a.header_image
    game.warnings.push('cover: no portrait library capsule found; using header_image')
  }
  const hero = await firstLiveUrl([steamAssetUrl(id, 'library_hero'), legacyAsset(id, 'library_hero.jpg')])
  if (hero) {
    game.heroImage = hero
  } else {
    game.heroImage = game.screenshots[0] ?? null
    game.warnings.push('hero: no library_hero found; using first screenshot')
  }
}

async function fetchSteamReviews(entry, game) {
  const d = await getJson(
    `https://store.steampowered.com/ajaxappreviews/${entry.steamAppId}?json=1&filter=all&language=all&purchase_type=all&num_per_page=1`,
  )
  const q = d?.query_summary
  if (!q || typeof q.total_reviews !== 'number') throw new Error('no query_summary')
  game.steamReviews = {
    desc: q.review_score_desc ?? '',
    positive: q.total_positive ?? 0,
    negative: q.total_negative ?? 0,
    total: q.total_reviews ?? 0,
  }
}

async function fetchPlayerStats(entry, game) {
  const id = entry.steamAppId
  let current = null
  let peak24h = null
  let allTimePeak = null
  let ok = false
  try {
    const d = await getJson(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${id}`)
    if (d?.response?.result === 1 && typeof d.response.player_count === 'number') {
      current = d.response.player_count
      ok = true
    }
  } catch (err) {
    game.warnings.push(`players: current player API failed (${err.message})`)
  }
  try {
    const html = await getText(`https://steamcharts.com/app/${id}`)
    const stats = {}
    for (const m of html.matchAll(/<div class="app-stat">\s*<span class="num">([\d,]+)<\/span>\s*<br\s*\/?>\s*([a-z0-9 -]+)/gi)) {
      stats[m[2].trim().toLowerCase()] = Number(m[1].replace(/,/g, ''))
    }
    if (current === null && Number.isFinite(stats.playing)) current = stats.playing
    if (Number.isFinite(stats['24-hour peak'])) peak24h = stats['24-hour peak']
    if (Number.isFinite(stats['all-time peak'])) allTimePeak = stats['all-time peak']
    if (peak24h !== null || allTimePeak !== null) ok = true
    else game.warnings.push('players: steamcharts page had no stats')
  } catch (err) {
    game.warnings.push(`players: steamcharts failed (${err.message})`)
  }
  if (ok) game.playerStats = { current, peak24h, allTimePeak, source: 'steamcharts', fetchedAt: new Date().toISOString() }
}

// ------------------------------------------------------------------ Wikidata / Wikipedia

const wd = (c) => c?.mainsnak?.datavalue?.value
function claimValues(entity, prop) {
  const claims = (entity?.claims?.[prop] ?? []).filter((c) => c.rank !== 'deprecated')
  const preferred = claims.filter((c) => c.rank === 'preferred')
  return (preferred.length ? [...preferred, ...claims.filter((c) => c.rank !== 'preferred')] : claims).map(wd).filter((v) => v != null)
}

async function wikidataEntity(q) {
  const d = await getJson(`https://www.wikidata.org/wiki/Special:EntityData/${q}.json`)
  return d?.entities?.[q] ?? Object.values(d?.entities ?? {})[0] ?? null
}

async function wikidataBySteamId(appid) {
  const d = await getJson(`https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`haswbstatement:P1733=${appid}`)}&srlimit=5&format=json`)
  return d?.query?.search?.[0]?.title ?? null
}

const labelCache = new Map()
async function wikidataLabels(ids) {
  const missing = [...new Set(ids)].filter((id) => !labelCache.has(id))
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50)
    // Many items now keep their name only under the language-neutral "mul" code.
    const d = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch.join('|')}&props=labels&languages=en|mul&format=json`)
    for (const id of batch) {
      const labels = d?.entities?.[id]?.labels
      labelCache.set(id, labels?.en?.value ?? labels?.mul?.value ?? null)
    }
  }
  return ids.map((id) => labelCache.get(id)).filter(Boolean)
}

function earliestDay(entity) {
  const times = (entity?.claims?.P577 ?? [])
    .filter((c) => c.rank !== 'deprecated')
    .map(wd)
    .filter((v) => v?.precision === 11 && typeof v.time === 'string')
    .map((v) => v.time.replace(/^\+/, '').slice(0, 10))
    .sort()
  return times[0] ?? null
}

const normalizeEpicSlug = (s) => String(s).replace(/^\/?(en-US\/)?(p|product)\//, '').replace(/\/home$/, '').replace(/^\/+|\/+$/g, '')

/**
 * One SPARQL query resolves every Steam app id (P1733) to its Wikidata item and the
 * cross-references we use, instead of two api.php/EntityData calls per game
 * (www.wikidata.org throttles anonymous clients hard).
 */
const steamWikidataRefs = new Map() // appid -> refs
let steamWikidataPrefetched = false

async function prefetchSteamWikidata(appIds) {
  if (!appIds.length) return
  const query = `SELECT ?appid ?item ?article ?epic ?eshop ?yt WHERE {
    VALUES ?appid { ${appIds.map((id) => JSON.stringify(String(id))).join(' ')} }
    ?item wdt:P1733 ?appid .
    OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }
    OPTIONAL { ?item wdt:P6278 ?epic }
    OPTIONAL { ?item wdt:P8084 ?eshop }
    OPTIONAL { ?item wdt:P1651 ?yt }
  }`
  try {
    const d = await getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, {
      headers: { accept: 'application/sparql-results+json' },
    })
    const byItem = new Map() // `${appid} ${q}` -> refs
    for (const b of d?.results?.bindings ?? []) {
      const appid = Number(b.appid?.value)
      const q = b.item?.value?.split('/').pop()
      if (!appid || !q) continue
      const key = `${appid} ${q}`
      const r = byItem.get(key) ?? { appid, q, enwiki: null, epicSlug: null, nintendoSlug: null, youtubeIds: [] }
      if (b.article && !r.enwiki) r.enwiki = decodeURIComponent(b.article.value.split('/wiki/')[1] ?? '').replace(/_/g, ' ') || null
      if (b.epic && !r.epicSlug) r.epicSlug = normalizeEpicSlug(b.epic.value)
      if (b.eshop && !r.nintendoSlug && /^[a-z0-9-]+$/.test(b.eshop.value)) r.nintendoSlug = b.eshop.value
      if (b.yt && /^[\w-]{11}$/.test(b.yt.value) && !r.youtubeIds.includes(b.yt.value)) r.youtubeIds.push(b.yt.value)
      byItem.set(key, r)
    }
    // If several items share an app id, prefer the one with an en-wiki article (then an Epic id).
    const score = (r) => (r.enwiki ? 2 : 0) + (r.epicSlug ? 1 : 0)
    for (const r of byItem.values()) {
      const cur = steamWikidataRefs.get(r.appid)
      if (!cur || score(r) > score(cur)) steamWikidataRefs.set(r.appid, r)
    }
    steamWikidataPrefetched = true
    log(`Resolved ${steamWikidataRefs.size}/${appIds.length} Steam apps to Wikidata items via SPARQL`)
  } catch (err) {
    log(`  ! Wikidata SPARQL prefetch failed (${err.message}); falling back to per-game lookups`)
  }
}

/** Pull the cross-reference ids we use from a Wikidata entity. */
function wikidataRefs(entity) {
  return {
    enwiki: entity?.sitelinks?.enwiki?.title ?? null,
    epicSlug: claimValues(entity, 'P6278').map(normalizeEpicSlug)[0] ?? null,
    nintendoSlug: claimValues(entity, 'P8084').find((v) => /^[a-z0-9-]+$/.test(v)) ?? null,
    youtubeIds: claimValues(entity, 'P1651').filter((v) => /^[\w-]{11}$/.test(v)),
  }
}

const wikiTitlePath = (t) => encodeURIComponent(t.replace(/ /g, '_'))

/** media-list -> full-size en.wikipedia (non-free, i.e. game) images that are not the cover/logos. */
async function wikipediaScreenshots(title, coverFile) {
  const d = await getJson(`https://en.wikipedia.org/api/rest_v1/page/media-list/${wikiTitlePath(title)}`)
  const out = []
  for (const item of d?.items ?? []) {
    if (item.type !== 'image') continue
    const largest = [...(item.srcset ?? [])].sort((a, b) => parseFloat(b.scale) - parseFloat(a.scale))[0]?.src
    if (!largest || !largest.includes('/wikipedia/en/')) continue
    const file = decodeURIComponent(stripQuery(largest).split('/').pop()).replace(/^\d+px-/, '')
    if (coverFile && file === coverFile) continue
    if (/logo|\.svg|icon|cover|box[_ ]?art|wordmark/i.test(item.title ?? file)) continue
    const thumb = stripQuery(withHttps(largest))
    // /wikipedia/en/thumb/a/ab/File.jpg/330px-File.jpg -> upload.wikimedia.org/wikipedia/en/a/ab/File.jpg
    const m = thumb.match(/\/wikipedia\/en\/thumb\/([0-9a-f]\/[0-9a-f]{2}\/[^/]+)\/[^/]+$/)
    const original = m ? `https://upload.wikimedia.org/wikipedia/en/${m[1]}` : thumb.replace('//thumb.wikimedia.org/', '//upload.wikimedia.org/')
    out.push({ original, thumb })
  }
  const urls = []
  for (const { original, thumb } of out) {
    const live = await firstLiveUrl([original, thumb])
    if (live) urls.push(live)
    if (urls.length >= MAX_SCREENSHOTS) break
  }
  return urls
}

/** Lead section of an article as capped plain-text paragraphs. */
async function wikipediaIntro(title) {
  const d = await getJson(
    `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exintro=1&redirects=1&format=json&formatversion=2&titles=${encodeURIComponent(title)}`,
  )
  const extract = d?.query?.pages?.[0]?.extract ?? ''
  const paras = extract.split(/\n+/).map(collapse).filter((p) => p.length >= 20).map((text) => ({ text, isHeading: false }))
  return capParagraphs(paras)
}

async function fetchWikipedia(entry, game) {
  const summary = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitlePath(entry.wikipediaTitle)}`)
  if (summary?.type !== 'standard') game.warnings.push(`wikipedia: summary type is "${summary?.type}"`)
  if (!/game/i.test(summary?.description ?? '')) game.warnings.push(`wikipedia: description "${summary?.description}" does not look like a video game`)
  game.wikipediaTitle = summary.title ?? entry.wikipediaTitle
  game.shortDescription = shortFromExtract(summary.extract)

  // Intro paragraphs (plain text) for `about`.
  try {
    game.about = await wikipediaIntro(game.wikipediaTitle)
  } catch (err) {
    game.warnings.push(`wikipedia: intro extract failed (${err.message})`)
  }
  if (!game.about.length && summary.extract) game.about = [collapse(summary.extract)]

  const coverSrc = summary.originalimage?.source ? stripQuery(summary.originalimage.source) : null
  const coverFile = coverSrc ? decodeURIComponent(coverSrc.split('/').pop()) : null
  if (coverSrc) {
    if ((await urlStatus(coverSrc)) === 200) game.coverImage = coverSrc
    else game.warnings.push(`cover: Wikipedia image ${coverSrc} did not return 200`)
    const { width, height } = summary.originalimage
    if (width && height && height < width * 1.15) game.warnings.push(`cover: Wikipedia cover is not portrait (${width}x${height})`)
  }

  try {
    game.screenshots = await wikipediaScreenshots(game.wikipediaTitle, coverFile)
  } catch (err) {
    game.warnings.push(`wikipedia: media-list failed (${err.message})`)
  }
  game.heroImage = game.screenshots[0] ?? null
  if (!game.coverImage && game.screenshots[0]) {
    game.coverImage = game.screenshots[0]
    game.warnings.push('cover: Wikipedia has no box art for this article; using first screenshot')
  }

  // Structured facts from Wikidata.
  const q = entry.wikidataId ?? summary.wikibase_item
  if (!q) {
    game.warnings.push('wikidata: no Q-id')
    return null
  }
  const entity = await wikidataEntity(q)
  game.releaseDate = earliestDay(entity)
  if (!game.releaseDate) game.warnings.push('wikidata: no day-precision P577 release date')
  const devIds = claimValues(entity, 'P178').map((v) => v.id).filter(Boolean)
  const pubIds = claimValues(entity, 'P123').map((v) => v.id).filter(Boolean)
  try {
    game.developers = await wikidataLabels(devIds)
    game.publishers = await wikidataLabels(pubIds)
  } catch (err) {
    game.warnings.push(`wikidata: label lookup failed (${err.message})`)
  }
  return wikidataRefs(entity)
}

// ------------------------------------------------------------------ Epic Games Store

let epicBlocked = null // set to a reason string once Epic answers with a bot challenge

async function epicGraphql(query) {
  const res = await politeFetch('https://store.epicgames.com/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ query }),
  })
  const ctype = res.headers.get('content-type') ?? ''
  if (res.headers.get('cf-mitigated') || (res.status === 403 && !ctype.includes('json'))) {
    await res.body?.cancel()
    // A bot challenge: do not retry or try to work around it.
    epicBlocked = `HTTP ${res.status} bot challenge (cf-mitigated: ${res.headers.get('cf-mitigated') ?? 'n/a'})`
    throw new Error(`Epic GraphQL blocked: ${epicBlocked}`)
  }
  if (!res.ok) {
    await res.body?.cancel()
    throw new HttpError(res.status, 'Epic GraphQL')
  }
  return res.json()
}

const EPIC_SEARCH_FIELDS = [
  'title namespace id productSlug urlSlug offerMappings { pageSlug pageType } catalogNs { mappings(pageType:"productHome") { pageSlug } }',
  'title namespace productSlug urlSlug',
]
const EPIC_NOISE = /soundtrack|\bost\b|bundle|\bpack\b|upgrade|\bdlc\b|season pass|expansion|artbook|add-?on|currency|coins|v-bucks|demo\b|chapter\s|\bvr\b/i

async function epicSearch(keywords) {
  let lastErr
  for (const fields of EPIC_SEARCH_FIELDS) {
    const d = await epicGraphql(
      `query { Catalog { searchStore(keywords: ${JSON.stringify(keywords)}, count: 10, country: "US", locale: "en-US") { elements { ${fields} } } } }`,
    )
    const elements = d?.data?.Catalog?.searchStore?.elements
    if (Array.isArray(elements)) return elements
    lastErr = new Error(`search errors: ${JSON.stringify(d?.errors ?? d).slice(0, 200)}`)
  }
  throw lastErr
}

function pickEpicElement(elements, title) {
  const want = normTitle(title)
  const clean = elements.filter((e) => e?.namespace && !EPIC_NOISE.test(e.title ?? ''))
  return (
    clean.find((e) => normTitle(e.title) === want) ??
    clean.find((e) => normTitle(e.title).startsWith(want) && !/edition/i.test(e.title)) ??
    clean.find((e) => normTitle(e.title).startsWith(want)) ??
    clean.find((e) => want.startsWith(normTitle(e.title))) ??
    null
  )
}

function epicSlugOf(el) {
  const candidates = [
    el.productSlug,
    el.offerMappings?.find((m) => m.pageType === 'productHome')?.pageSlug,
    el.catalogNs?.mappings?.[0]?.pageSlug,
    el.urlSlug,
  ]
  const s = candidates.find((c) => c && !/^[0-9a-f]{32}$/.test(c))
  return s ? normalizeEpicSlug(s) : null
}

async function epicRatings(namespace) {
  const d = await epicGraphql(
    `query { RatingsPolls { getProductResult(sandboxId: ${JSON.stringify(namespace)}, locale: "en-US") { averageRating pollResult { id total localizations { resultEmoji resultTitle resultText } } } } }`,
  )
  const r = d?.data?.RatingsPolls?.getProductResult
  if (!r) return { averageRating: null, polls: [] }
  const polls = (r.pollResult ?? [])
    .map((p) => ({
      title: p.localizations?.resultTitle ?? '',
      text: p.localizations?.resultText ?? '',
      emoji: p.localizations?.resultEmoji || null,
      votes: p.total ?? 0,
    }))
    .filter((p) => p.title)
    .sort((a, b) => b.votes - a.votes)
  return { averageRating: typeof r.averageRating === 'number' ? r.averageRating : null, polls }
}

const epicUrl = (slug) => `https://store.epicgames.com/en-US/p/${slug}`

async function fetchEpic(entry, game, refs, previous) {
  const searchTitle = entry.epicSearch ?? entry.title
  if (!epicBlocked) {
    try {
      const el = pickEpicElement(await epicSearch(searchTitle), entry.title)
      if (!el) throw new Error(`no matching search result for "${searchTitle}"`)
      const slug = epicSlugOf(el) ?? refs?.epicSlug
      if (!slug) throw new Error(`matched "${el.title}" but it has no product slug`)
      let ratings = { averageRating: null, polls: [] }
      try {
        ratings = await epicRatings(el.namespace)
      } catch (err) {
        game.warnings.push(`epic: ratings failed (${err.message})`)
      }
      game.epic = { productSlug: slug, namespace: el.namespace, url: epicUrl(slug), ...ratings }
      game.storeLinks.epic = game.epic.url
      return
    } catch (err) {
      if (!epicBlocked) game.warnings.push(`epic: GraphQL lookup failed (${err.message})`)
    }
  }

  // Fallbacks when GraphQL is unavailable (e.g. bot challenge) or found nothing.
  if (previous?.epic?.namespace) {
    game.epic = previous.epic
    game.storeLinks.epic = previous.epic.url
    game.warnings.push('epic: GraphQL unavailable this run; kept Epic data from the previous build')
    return
  }
  if (refs?.epicSlug) {
    game.epic = { productSlug: refs.epicSlug, namespace: null, url: epicUrl(refs.epicSlug), averageRating: null, polls: [] }
    game.storeLinks.epic = game.epic.url
    if (epicBlocked) game.warnings.push('epic: GraphQL blocked by bot challenge; store slug from Wikidata P6278, no namespace/ratings')
    return
  }
  game.warnings.push(epicBlocked ? 'epic: GraphQL blocked by bot challenge and Wikidata has no Epic Games Store ID (P6278)' : 'epic: no Epic match found')
}

// ------------------------------------------------------------------ per game

function blankGame(entry) {
  return {
    slug: entry.slug ?? slugify(entry.title),
    title: entry.title,
    source: entry.steamAppId ? 'steam' : 'wikipedia',
    steamAppId: entry.steamAppId ?? null,
    wikipediaTitle: entry.wikipediaTitle ?? null,
    epic: null,
    storeLinks: { steam: null, epic: null, nintendo: null },
    platforms: [...entry.platforms],
    shortDescription: '',
    about: [],
    releaseDate: null,
    developers: [],
    publishers: [],
    steamGenres: [],
    genres: [...entry.genres],
    artStyles: [...entry.artStyles],
    tier: entry.tier,
    featured: !!entry.featured,
    coverImage: '',
    heroImage: null,
    headerImage: null,
    screenshots: [],
    trailers: [],
    metacritic: null,
    steamReviews: null,
    playerStats: null,
    website: null,
    warnings: [],
  }
}

async function step(game, label, fn) {
  try {
    return await fn()
  } catch (err) {
    game.warnings.push(`${label}: ${err.message}`)
    return undefined
  }
}

async function buildGame(entry, previous) {
  const game = blankGame(entry)
  let refs = null

  if (game.source === 'steam') {
    await step(game, 'steam', () => fetchSteam(entry, game))
    await step(game, 'reviews', () => fetchSteamReviews(entry, game))
    await step(game, 'players', () => fetchPlayerStats(entry, game))
    // Wikidata cross-references: en-wiki title, Epic slug, Nintendo eShop slug, YouTube trailers.
    if (!entry.wikidataId && steamWikidataPrefetched) {
      refs = steamWikidataRefs.get(entry.steamAppId) ?? null
    } else {
      const q = entry.wikidataId ?? (await step(game, 'wikidata', () => wikidataBySteamId(entry.steamAppId)))
      const entity = q ? await step(game, 'wikidata', () => wikidataEntity(q)) : null
      if (entity) refs = wikidataRefs(entity)
    }
    if (refs) game.wikipediaTitle = refs.enwiki
    else if (entry.epic) game.warnings.push(`wikidata: no item found for Steam app id ${entry.steamAppId}`)

    // Some store pages are pure image/video marketing with no text, and some are only promo
    // copy (curated via aboutFrom: 'wikipedia'): use the Wikipedia lead instead.
    const wantWikiAbout = entry.aboutFrom === 'wikipedia'
    if ((wantWikiAbout || !game.about.length) && game.wikipediaTitle) {
      const intro = await step(game, 'about', () => wikipediaIntro(game.wikipediaTitle))
      if (intro?.length) {
        if (!game.about.length) game.warnings.push('about: Steam description has no text (images/videos only); used the Wikipedia lead')
        game.about = intro
      }
    } else if (wantWikiAbout) {
      game.warnings.push('about: aboutFrom=wikipedia but no en-wiki article is linked; kept Steam text')
    }
    if (!game.about.length && game.shortDescription) game.about = [game.shortDescription]
  } else {
    refs = (await step(game, 'wikipedia', () => fetchWikipedia(entry, game))) ?? null
  }

  if (!game.trailers.length && refs?.youtubeIds?.length) {
    game.trailers = refs.youtubeIds.slice(0, MAX_TRAILERS).map((id, i) => ({
      name: i === 0 ? `${game.title} trailer` : `${game.title} trailer ${i + 1}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      hls: null,
      youtubeId: id,
    }))
  }

  if (game.platforms.includes('nintendo') && refs?.nintendoSlug) {
    const url = `https://www.nintendo.com/us/store/products/${refs.nintendoSlug}/`
    const status = await urlStatus(url)
    if (status === 200) game.storeLinks.nintendo = url
    else if (status === 404) game.warnings.push(`nintendo: ${url} returned 404`)
    else {
      game.storeLinks.nintendo = url
      game.warnings.push(`nintendo: could not verify ${url} (status ${status})`)
    }
  }

  if (entry.epic) await fetchEpic(entry, game, refs, previous)

  // Curated overrides win over fetched values (see games.config.mjs).
  for (const key of ['shortDescription', 'releaseDate', 'developers', 'publishers']) {
    if (entry[key] !== undefined) game[key] = Array.isArray(entry[key]) ? [...entry[key]] : entry[key]
  }
  if (!game.coverImage) game.warnings.push('cover: MISSING')
  return game
}

// ------------------------------------------------------------------ validation & summary

function validateConfig() {
  const errors = []
  const slugs = new Set()
  for (const e of GAMES) {
    const slug = e.slug ?? slugify(e.title)
    if (slugs.has(slug)) errors.push(`duplicate slug ${slug}`)
    slugs.add(slug)
    if (!e.steamAppId && !e.wikipediaTitle) errors.push(`${slug}: needs steamAppId or wikipediaTitle`)
    if (!TIERS.includes(e.tier)) errors.push(`${slug}: bad tier ${e.tier}`)
    if (!e.platforms?.length || e.platforms.some((p) => !PLATFORMS.includes(p))) errors.push(`${slug}: bad platforms ${e.platforms}`)
    if (!e.genres?.length || e.genres.length > 4 || e.genres.some((g) => !GENRES.includes(g))) errors.push(`${slug}: bad genres ${e.genres}`)
    if (!e.artStyles?.length || e.artStyles.length > 2 || e.artStyles.some((a) => !ART_STYLES.includes(a))) errors.push(`${slug}: bad artStyles ${e.artStyles}`)
    if (e.releaseDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(e.releaseDate)) errors.push(`${slug}: releaseDate override must be yyyy-mm-dd`)
    if (e.aboutFrom !== undefined && e.aboutFrom !== 'wikipedia') errors.push(`${slug}: aboutFrom must be 'wikipedia'`)
  }
  if (errors.length) {
    console.error('Invalid games.config.mjs:\n  ' + errors.join('\n  '))
    process.exit(1)
  }
}

function countBy(games, key) {
  const counts = {}
  for (const g of games) for (const v of [].concat(g[key])) counts[v] = (counts[v] ?? 0) + 1
  return counts
}

function sanityCheck(games) {
  const problems = []
  for (const g of games) {
    const p = []
    if (!g.title) p.push('title')
    if (!g.slug) p.push('slug')
    if (!g.coverImage) p.push('coverImage')
    if (!g.shortDescription) p.push('shortDescription')
    if (!g.releaseDate) p.push('releaseDate')
    if (!g.about.length) p.push('about')
    if (!g.genres.length) p.push('genres')
    if (!g.artStyles.length) p.push('artStyles')
    if (p.length) problems.push(`${g.slug}: missing ${p.join(', ')}`)
  }
  return problems
}

function printSummary(games) {
  const fmt = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  ')
  console.log('\n================ SUMMARY ================')
  console.log(`games: ${games.length}  (steam=${games.filter((g) => g.source === 'steam').length}, wikipedia=${games.filter((g) => g.source === 'wikipedia').length}, featured=${games.filter((g) => g.featured).length})`)
  console.log(`tier:      ${fmt(countBy(games, 'tier'))}`)
  console.log(`platforms: ${fmt(countBy(games, 'platforms'))}`)
  console.log(`artStyles: ${fmt(countBy(games, 'artStyles'))}`)
  console.log(`genres:    ${fmt(countBy(games, 'genres'))}`)
  const unusedGenres = GENRES.filter((x) => !games.some((g) => g.genres.includes(x)))
  const unusedStyles = ART_STYLES.filter((x) => !games.some((g) => g.artStyles.includes(x)))
  if (unusedGenres.length || unusedStyles.length) console.log(`unused taxonomy: ${[...unusedGenres, ...unusedStyles].join(', ')}`)
  const list = (pred) => games.filter(pred).map((g) => g.slug).join(', ') || '(none)'
  console.log(`no screenshots: ${list((g) => !g.screenshots.length)}`)
  console.log(`no trailers:    ${list((g) => !g.trailers.length)}`)
  console.log(`no hero:        ${list((g) => !g.heroImage)}`)
  const epicWanted = GAMES.filter((e) => e.epic).map((e) => e.slug ?? slugify(e.title))
  const epicGames = games.filter((g) => epicWanted.includes(g.slug))
  console.log(`epic: ${epicGames.filter((g) => g.epic?.namespace).length}/${epicGames.length} with GraphQL namespace+ratings, ${epicGames.filter((g) => g.epic).length}/${epicGames.length} with a store link`)
  if (epicBlocked) console.log(`epic GraphQL: blocked this run — ${epicBlocked}`)
  console.log(`epic missing:   ${list((g) => epicWanted.includes(g.slug) && !g.epic)}`)
  const problems = sanityCheck(games)
  console.log(`sanity: ${problems.length ? '\n  ' + problems.join('\n  ') : 'all games have title, slug, cover, description, about, release date, genres, art styles'}`)
  const warned = games.filter((g) => g.warnings.length)
  console.log(`\nwarnings (${warned.length} games):`)
  for (const g of warned) for (const w of g.warnings) console.log(`  ${g.slug}: ${w}`)
}

// ------------------------------------------------------------------ main

async function main() {
  validateConfig()
  const onlyArg = process.argv.find((a) => a.startsWith('--only'))
  const only = onlyArg ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : process.argv[process.argv.indexOf(onlyArg) + 1]).split(',') : null

  let previous = new Map()
  if (existsSync(OUT_FILE)) {
    try {
      const prev = JSON.parse(await readFile(OUT_FILE, 'utf8'))
      previous = new Map((prev.games ?? []).map((g) => [g.slug, g]))
    } catch {
      log('  ! could not read previous catalog; starting fresh')
    }
  }

  const entries = GAMES.filter((e) => !only || only.includes(e.slug ?? slugify(e.title)))
  log(`Building ${entries.length} game(s)${only ? ` (--only ${only.join(',')})` : ''}`)
  const steamIds = entries.filter((e) => e.steamAppId).map((e) => e.steamAppId)
  await prefetchSteamAssets(steamIds)
  await prefetchSteamWikidata(steamIds)

  const results = new Map()
  let next = 0
  let done = 0
  async function worker() {
    while (next < entries.length) {
      const entry = entries[next++]
      const slug = entry.slug ?? slugify(entry.title)
      const game = await buildGame(entry, previous.get(slug))
      results.set(slug, game)
      done++
      const flags = [
        game.coverImage ? 'cover' : 'NO-COVER',
        `${game.screenshots.length} shots`,
        `${game.trailers.length} trailers`,
        game.steamReviews ? 'reviews' : null,
        game.playerStats ? 'players' : null,
        game.epic ? (game.epic.namespace ? 'epic+ratings' : 'epic-link') : null,
      ].filter(Boolean)
      log(`[${String(done).padStart(2)}/${entries.length}] ${slug} — ${flags.join(', ')}${game.warnings.length ? `  (${game.warnings.length} warning${game.warnings.length > 1 ? 's' : ''})` : ''}`)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker))

  // Keep config order; with --only, keep untouched games from the previous build.
  const games = GAMES.map((e) => {
    const slug = e.slug ?? slugify(e.title)
    return results.get(slug) ?? previous.get(slug)
  }).filter(Boolean)
  for (const g of games) delete g.steamName

  await mkdir(path.dirname(OUT_FILE), { recursive: true })
  await writeFile(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), games }, null, 2) + '\n')
  log(`Wrote ${games.length} games to ${path.relative(ROOT, OUT_FILE)}`)
  printSummary(games)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
