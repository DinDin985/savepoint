// Fills Epic Games Store namespace + player rating + polls into data/catalog.json.
// Usage: node scripts/catalog/enrich-epic.mjs
// Polite: sequential, 400ms between requests. Stops immediately if Epic answers
// with a bot challenge (we never try to get around it).
import { readFileSync, writeFileSync } from "node:fs"

const FILE = "data/catalog.json"
const ENDPOINT = "https://store.epicgames.com/graphql"
const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
}
// Games sold on Epic that the main builder could not match.
const EXTRA = {
  "it-takes-two": "It Takes Two",
  "slay-the-spire": "Slay the Spire",
  "vampire-survivors": "Vampire Survivors",
  "animal-well": "ANIMAL WELL",
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
class Challenged extends Error {}

async function gql(query) {
  await sleep(400)
  const res = await fetch(ENDPOINT, { method: "POST", headers: HEADERS, body: JSON.stringify({ query }) })
  if (res.headers.get("cf-mitigated") === "challenge") throw new Challenged("Epic returned a bot challenge")
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = await res.json()
  if (body.errors?.length) throw new Error(body.errors[0].message)
  return body.data
}

const norm = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

async function findProduct(title, productSlug) {
  const data = await gql(
    `query { Catalog { searchStore(keywords: ${JSON.stringify(title)}, count: 10, country: "US", locale: "en-US") { elements { title namespace productSlug urlSlug offerType catalogNs { mappings(pageType: "productHome") { pageSlug } } } } } }`,
  )
  const els = data?.Catalog?.searchStore?.elements ?? []
  const slugOf = (e) => e.catalogNs?.mappings?.[0]?.pageSlug ?? e.productSlug ?? null
  const bySlug = productSlug ? els.find((e) => slugOf(e) === productSlug) : null
  const exact = els.find((e) => norm(e.title) === norm(title) && e.offerType !== "ADD_ON")
  const base = els.find((e) => e.offerType === "BASE_GAME" && norm(e.title).startsWith(norm(title)))
  const pick = bySlug ?? exact ?? base
  return pick ? { namespace: pick.namespace, slug: slugOf(pick) ?? productSlug } : null
}

async function ratings(namespace) {
  const data = await gql(
    `query { RatingsPolls { getProductResult(sandboxId: ${JSON.stringify(namespace)}, locale: "en-US") { averageRating pollResult { id total localizations { resultEmoji resultTitle resultText } } } } }`,
  )
  const r = data?.RatingsPolls?.getProductResult
  if (!r) return { averageRating: null, polls: [] }
  const polls = (r.pollResult ?? [])
    .filter((p) => p.localizations?.resultTitle)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)
    .map((p) => ({
      title: p.localizations.resultTitle,
      text: p.localizations.resultText ?? "",
      emoji: p.localizations.resultEmoji ?? null,
      votes: p.total,
    }))
  return { averageRating: typeof r.averageRating === "number" ? r.averageRating : null, polls }
}

const catalog = JSON.parse(readFileSync(FILE, "utf8"))
let filled = 0
try {
  for (const game of catalog.games) {
    const extraTitle = EXTRA[game.slug]
    if (!game.epic && !extraTitle) continue
    const productSlug = game.epic?.productSlug ?? null
    try {
      const found = await findProduct(extraTitle ?? game.title, productSlug)
      if (!found?.namespace) {
        console.warn(`✗ ${game.slug}: no Epic match`)
        continue
      }
      const slug = found.slug ?? productSlug
      const r = await ratings(found.namespace)
      game.epic = {
        productSlug: slug,
        namespace: found.namespace,
        url: `https://store.epicgames.com/en-US/p/${slug}`,
        averageRating: r.averageRating,
        polls: r.polls,
      }
      game.storeLinks.epic = game.epic.url
      game.warnings = (game.warnings ?? []).filter((w) => !/epic/i.test(w))
      filled++
      console.log(`✓ ${game.slug}: ns=${found.namespace} rating=${r.averageRating} polls=${r.polls.length}`)
    } catch (error) {
      if (error instanceof Challenged) throw error
      console.warn(`✗ ${game.slug}: ${error.message}`)
    }
  }
} catch (error) {
  console.error(`Stopped: ${error.message}`)
}

catalog.generatedAt = new Date().toISOString()
writeFileSync(FILE, JSON.stringify(catalog, null, 2) + "\n")
console.log(`Filled Epic data for ${filled} games.`)
