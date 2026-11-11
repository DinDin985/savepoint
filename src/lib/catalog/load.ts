import "server-only"
import { Effect } from "effect"
import { runEffect, type AppServices } from "@/lib/effect/runtime"

export type Loaded<A> = { readonly ok: true; readonly data: A } | { readonly ok: false }

/**
 * Run a read-only Effect for a page section without letting a failure take the
 * whole page down: typed failures and defects are logged and surface as
 * `{ ok: false }` so the section can render its own error state.
 */
export async function loadSafely<A, E>(label: string, effect: Effect.Effect<A, E, AppServices>): Promise<Loaded<A>> {
  try {
    return await runEffect(
      effect.pipe(
        Effect.map((data): Loaded<A> => ({ ok: true, data })),
        Effect.catch((error) =>
          Effect.logError(`[discover] ${label} failed`, error).pipe(Effect.as<Loaded<A>>({ ok: false })),
        ),
      ),
    )
  } catch (error) {
    console.error(`[discover] ${label} crashed`, error)
    return { ok: false }
  }
}
