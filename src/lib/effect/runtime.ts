import "server-only"
import { Cause, Effect, Exit, ManagedRuntime } from "effect"
import { Database, DatabaseLive } from "./database"
import { userMessage, type AppError } from "./errors"

/** Every service the app runtime provides. Effects must only require these. */
export type AppServices = Database

const makeRuntime = () => ManagedRuntime.make(DatabaseLive)

const globalForRuntime = globalThis as unknown as { __savepointRuntime?: ReturnType<typeof makeRuntime> }
export const runtime = (globalForRuntime.__savepointRuntime ??= makeRuntime())

/**
 * Run an Effect from a Server Component / route handler. Typed failures reject the
 * promise (→ nearest error.tsx). Never call next/navigation `redirect()` /
 * `notFound()` *inside* an Effect — return a value and call them afterwards.
 */
export function runEffect<A, E>(effect: Effect.Effect<A, E, AppServices>): Promise<A> {
  return runtime.runPromise(effect)
}

/** Result type returned by every Server Action (serialisable). */
export type ActionResult<A = undefined> =
  | { readonly ok: true; readonly data: A; readonly message?: string }
  | { readonly ok: false; readonly error: string; readonly fieldErrors?: Readonly<Record<string, string>> }

/**
 * Run an Effect inside a Server Action and convert the outcome into a plain
 * `ActionResult`. Expected (typed) failures become `{ ok: false, error }`;
 * defects are logged and reported generically.
 */
export async function runAction<A>(
  effect: Effect.Effect<A, AppError, AppServices>,
  options?: { readonly successMessage?: string },
): Promise<ActionResult<A>> {
  const exit = await runtime.runPromiseExit(effect)
  if (Exit.isSuccess(exit)) {
    return { ok: true, data: exit.value, message: options?.successMessage }
  }
  const failure = Cause.findErrorOption(exit.cause)
  if (failure._tag === "Some") {
    const error = failure.value
    if (error._tag === "DbError" || error._tag === "ExternalApiError") {
      console.error(`[action] ${error._tag}`, error)
    }
    return {
      ok: false,
      error: userMessage(error),
      fieldErrors: error._tag === "ValidationError" ? error.fieldErrors : undefined,
    }
  }
  console.error("[action] defect", Cause.pretty(exit.cause))
  return { ok: false, error: "Unexpected error. Please try again." }
}
