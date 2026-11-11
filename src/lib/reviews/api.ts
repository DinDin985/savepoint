import "server-only"
import { Cause, Exit, type Effect } from "effect"
import { userMessage, type AppError } from "@/lib/effect/errors"
import { runtime, type AppServices } from "@/lib/effect/runtime"

const statusFor = (error: AppError): number => {
  switch (error._tag) {
    case "ValidationError":
      return 400
    case "UnauthorizedError":
      return 401
    case "ForbiddenError":
      return 403
    case "NotFoundError":
      return 404
    case "ConflictError":
      return 409
    case "ExternalApiError":
      return 502
    case "DbError":
      return 500
  }
}

/**
 * Run an Effect in a Route Handler and answer with JSON. Typed failures map to
 * HTTP statuses (ExternalApiError → 502) with a user-safe `{ error }` body;
 * `headers` are only applied to successful responses (errors are never cached).
 */
export async function jsonFromEffect<A>(
  effect: Effect.Effect<A, AppError, AppServices>,
  options?: { readonly headers?: Record<string, string> },
): Promise<Response> {
  const exit = await runtime.runPromiseExit(effect)
  if (Exit.isSuccess(exit)) {
    return Response.json(exit.value, { headers: options?.headers })
  }
  const noStore = { "Cache-Control": "no-store" }
  const failure = Cause.findErrorOption(exit.cause)
  if (failure._tag === "Some") {
    const error = failure.value
    if (error._tag === "DbError" || error._tag === "ExternalApiError") {
      console.error(`[api/reviews] ${error._tag}`, error)
    }
    return Response.json(
      {
        error: userMessage(error),
        ...(error._tag === "ValidationError" && error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      },
      { status: statusFor(error), headers: noStore },
    )
  }
  console.error("[api/reviews] defect", Cause.pretty(exit.cause))
  return Response.json({ error: "Unexpected error. Please try again." }, { status: 500, headers: noStore })
}

/** URLSearchParams → plain object for Schema validation (first value wins). */
export const searchParamsToObject = (params: URLSearchParams): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const [key, value] of params) {
    if (!(key in out)) out[key] = value
  }
  return out
}
