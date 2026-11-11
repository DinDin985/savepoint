import { Effect, Schema, SchemaIssue } from "effect"
import { ValidationError } from "./errors"

const formatter = SchemaIssue.makeFormatterStandardSchemaV1()

/**
 * Decode untrusted input (form data, query params, JSON bodies) with an Effect
 * Schema. Failures become a `ValidationError` whose `fieldErrors` maps the first
 * path segment → first message, ready for inline form errors.
 *
 *   const input = yield* validate(SignUpInput, Object.fromEntries(formData))
 */
export const validate = <S extends Schema.Top & { readonly DecodingServices: never }>(
  schema: S,
  input: unknown,
): Effect.Effect<S["Type"], ValidationError> =>
  Schema.decodeUnknownEffect(schema)(input, { errors: "all" }).pipe(
    Effect.mapError((error) => {
      const fieldErrors: Record<string, string> = {}
      for (const issue of formatter(error.issue).issues) {
        const first = issue.path?.[0]
        const key = String(typeof first === "object" && first !== null && "key" in first ? first.key : first ?? "form")
        fieldErrors[key] ??= issue.message
      }
      const firstMessage = Object.values(fieldErrors)[0] ?? "Invalid input"
      return new ValidationError({ message: firstMessage, fieldErrors })
    }),
  )

/** Common building blocks */
export const NonEmptyTrimmed = (label: string, max = 2000) =>
  Schema.Trim.check(
    Schema.isMinLength(1, { message: `${label} is required` }),
    Schema.isMaxLength(max, { message: `${label} must be at most ${max} characters` }),
  )

/** Form checkbox / switch value → boolean ("on" | "true" | "1" → true). Convert before `validate`. */
export const formBoolean = (value: FormDataEntryValue | null | undefined): boolean =>
  value === "on" || value === "true" || value === "1"

/** FormData → plain object of strings (files dropped) for `validate`. */
export const formToObject = (formData: FormData): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) out[key] = value
  }
  return out
}
