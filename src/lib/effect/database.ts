import "server-only"
import type { Client } from "@libsql/client"
import { Context, Effect, Layer } from "effect"
import { getDatabase, type AppDb } from "@/lib/db/client"
import { DbError } from "./errors"

/**
 * Database service. Every query goes through `use`, which:
 *  - waits for the (cached) connection + migrations + catalog seed,
 *  - converts promise rejections into a typed `DbError` tagged with `op`.
 */
export class Database extends Context.Service<
  Database,
  {
    readonly use: <A>(op: string, f: (db: AppDb, client: Client) => Promise<A>) => Effect.Effect<A, DbError>
  }
>()("savepoint/Database") {}

export const DatabaseLive = Layer.succeed(Database, {
  use: <A>(op: string, f: (db: AppDb, client: Client) => Promise<A>) =>
    Effect.tryPromise({
      try: async () => {
        const { db, client } = await getDatabase()
        return f(db, client)
      },
      catch: (cause) => new DbError({ op, cause }),
    }).pipe(Effect.withSpan(`db.${op}`)),
})

/**
 * Shorthand used everywhere:
 *   const rows = yield* dbQuery("games.bySlug", (db) => db.select().from(games).where(eq(games.slug, slug)))
 */
export const dbQuery = <A>(op: string, f: (db: AppDb, client: Client) => Promise<A>): Effect.Effect<A, DbError, Database> =>
  Effect.gen(function* () {
    const database = yield* Database
    return yield* database.use(op, f)
  })
