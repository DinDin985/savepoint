import "server-only"
import type { Client, InStatement } from "@libsql/client"
import { migrations } from "./migrations.generated"
import { catalog, type CatalogGame } from "./catalog"

/**
 * Applies embedded migrations (idempotent) and upserts the curated game catalog
 * whenever data/catalog.json changes. Safe to run concurrently from several cold
 * starts: every step is idempotent.
 */
export async function bootstrapDatabase(client: Client): Promise<void> {
  await client.execute(
    "CREATE TABLE IF NOT EXISTS __migrations (name TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL)",
  )
  const applied = new Set(
    (await client.execute("SELECT name FROM __migrations")).rows.map((r) => String(r.name)),
  )

  for (const migration of migrations) {
    if (applied.has(migration.name)) continue
    try {
      await client.batch(
        [
          ...migration.statements,
          { sql: "INSERT INTO __migrations (name, applied_at) VALUES (?, ?)", args: [migration.name, Date.now()] },
        ],
        "write",
      )
    } catch (error) {
      // Another instance may have applied it concurrently.
      const check = await client.execute({ sql: "SELECT 1 FROM __migrations WHERE name = ?", args: [migration.name] })
      if (check.rows.length === 0) throw error
    }
  }

  await seedCatalog(client)
}

async function seedCatalog(client: Client): Promise<void> {
  const version = `${catalog.generatedAt}:${catalog.games.length}`
  const current = await client.execute({ sql: "SELECT value FROM app_meta WHERE key = 'catalog_version'", args: [] })
  if (current.rows[0]?.value === version) return

  const statements: InStatement[] = []
  for (const game of catalog.games) {
    statements.push(upsertGame(game))
    statements.push({
      sql: "DELETE FROM game_categories WHERE game_id = (SELECT id FROM games WHERE slug = ?)",
      args: [game.slug],
    })
    const categories: [string, string][] = [
      ...game.genres.map((s): [string, string] => ["genre", s]),
      ...game.artStyles.map((s): [string, string] => ["art-style", s]),
      ["tier", game.tier],
      ...game.platforms.map((s): [string, string] => ["platform", s]),
    ]
    for (const [kind, slug] of categories) {
      statements.push({
        sql: "INSERT OR IGNORE INTO game_categories (game_id, kind, slug) SELECT id, ?, ? FROM games WHERE slug = ?",
        args: [kind, slug, game.slug],
      })
    }
  }
  statements.push({
    sql: "INSERT INTO app_meta (key, value) VALUES ('catalog_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [version],
  })
  await client.batch(statements, "write")
}

const json = (v: unknown) => JSON.stringify(v ?? null)

function upsertGame(g: CatalogGame): InStatement {
  const cols = {
    slug: g.slug,
    title: g.title,
    source: g.source,
    steam_app_id: g.steamAppId,
    wikipedia_title: g.wikipediaTitle,
    epic: json(g.epic),
    store_links: json(g.storeLinks),
    platforms: json(g.platforms),
    short_description: g.shortDescription,
    about: json(g.about),
    release_date: g.releaseDate,
    release_year: g.releaseDate ? Number(g.releaseDate.slice(0, 4)) : null,
    developers: json(g.developers),
    publishers: json(g.publishers),
    steam_genres: json(g.steamGenres),
    genres: json(g.genres),
    art_styles: json(g.artStyles),
    tier: g.tier,
    featured: g.featured ? 1 : 0,
    cover_image: g.coverImage,
    hero_image: g.heroImage,
    header_image: g.headerImage,
    screenshots: json(g.screenshots),
    trailers: json(g.trailers),
    metacritic: g.metacritic,
    steam_reviews: json(g.steamReviews),
    player_stats: json(g.playerStats),
    website: g.website,
  } as const
  const names = Object.keys(cols)
  const updates = names.filter((n) => n !== "slug").map((n) => `${n} = excluded.${n}`)
  return {
    sql: `INSERT INTO games (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})
          ON CONFLICT(slug) DO UPDATE SET ${updates.join(", ")}`,
    args: Object.values(cols).map((v) => (v === undefined ? null : v)),
  }
}
