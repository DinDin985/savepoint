import { Data } from "effect"

/** Input failed validation. `fieldErrors` maps form field names → message. */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string
  readonly fieldErrors?: Readonly<Record<string, string>>
}> {}

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly message: string
  readonly entity?: string
}> {}

/** No signed-in user. */
export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly message: string
}> {}

/** Signed in, but not allowed (e.g. editing someone else's review). */
export class ForbiddenError extends Data.TaggedError("ForbiddenError")<{
  readonly message: string
}> {}

/** Uniqueness / state conflicts (username taken, already following…). */
export class ConflictError extends Data.TaggedError("ConflictError")<{
  readonly message: string
  readonly field?: string
}> {}

export class DbError extends Data.TaggedError("DbError")<{
  readonly op: string
  readonly cause: unknown
}> {}

/** Steam / Epic / SteamCharts / Wikipedia request failed or returned garbage. */
export class ExternalApiError extends Data.TaggedError("ExternalApiError")<{
  readonly source: "steam" | "steamcharts" | "epic" | "wikipedia" | "other"
  readonly url: string
  readonly status?: number
  readonly cause?: unknown
}> {}

export type AppError =
  | ValidationError
  | NotFoundError
  | UnauthorizedError
  | ForbiddenError
  | ConflictError
  | DbError
  | ExternalApiError

/** Message that is safe to show to end users. */
export function userMessage(error: AppError): string {
  switch (error._tag) {
    case "ValidationError":
    case "NotFoundError":
    case "UnauthorizedError":
    case "ForbiddenError":
    case "ConflictError":
      return error.message
    case "DbError":
      return "Something went wrong saving your data. Please try again."
    case "ExternalApiError":
      return `Couldn't reach ${error.source === "other" ? "an external service" : error.source} right now. Please try again later.`
  }
}
