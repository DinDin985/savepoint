import "server-only"
import { createClient, type Client } from "@libsql/client"
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql"
import * as schema from "./schema"
import { bootstrapDatabase } from "./bootstrap"

export type AppDb = LibSQLDatabase<typeof schema>

/**
 * SQLite everywhere:
 *  - local dev  → `file:local.db` (plain SQLite file via libSQL)
 *  - production → Turso (hosted libSQL/SQLite) when TURSO_DATABASE_URL is set
 *  - Vercel without Turso → an ephemeral SQLite file in /tmp (demo only — data resets on cold start)
 */
export function resolveDatabaseConfig(): { url: string; authToken?: string; ephemeral: boolean } {
  const url =
    process.env.TURSO_DATABASE_URL ??
    process.env.DATABASE_URL ??
    process.env.TURSO_URL ??
    process.env.LIBSQL_URL
  const authToken =
    process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN ?? process.env.LIBSQL_AUTH_TOKEN
  if (url) return { url, authToken, ephemeral: false }
  if (process.env.VERCEL) return { url: "file:/tmp/savepoint.db", ephemeral: true }
  return { url: "file:local.db", ephemeral: false }
}

type DbHandle = { readonly client: Client; readonly db: AppDb }

const globalForDb = globalThis as unknown as { __savepointDb?: Promise<DbHandle> }

async function open(): Promise<DbHandle> {
  const { url, authToken } = resolveDatabaseConfig()
  const client = createClient({ url, authToken })
  if (url.startsWith("file:")) {
    await client.execute("PRAGMA journal_mode = WAL")
    await client.execute("PRAGMA busy_timeout = 5000")
  }
  await client.execute("PRAGMA foreign_keys = ON")
  const db = drizzle(client, { schema })
  await bootstrapDatabase(client)
  return { client, db }
}

/**
 * Opens the database once per server instance, applies embedded migrations and
 * seeds/refreshes the game catalog. A failed bootstrap is not cached, so the next
 * request retries.
 */
export function getDatabase(): Promise<DbHandle> {
  if (!globalForDb.__savepointDb) {
    globalForDb.__savepointDb = open().catch((error) => {
      globalForDb.__savepointDb = undefined
      throw error
    })
  }
  return globalForDb.__savepointDb
}
