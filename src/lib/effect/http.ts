import "server-only"
import { Duration, Effect, Schedule, Schema } from "effect"
import { ExternalApiError } from "./errors"

type Source = ExternalApiError["source"]

export type FetchOptions = {
  /** Which upstream this is (for error messages / logging). */
  readonly source: Source
  /** Next.js Data Cache revalidation in seconds (default 600). Use 0 for no caching. */
  readonly revalidate?: number
  readonly timeout?: Duration.Input
  readonly retries?: number
  readonly init?: RequestInit
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

/**
 * fetch → Response with timeout + exponential retry, wrapped in a typed error.
 * Uses Next's fetch cache (`next.revalidate`) so upstream APIs aren't hammered.
 */
export const fetchResponse = (url: string, options: FetchOptions): Effect.Effect<Response, ExternalApiError> => {
  const revalidate = options.revalidate ?? 600
  return Effect.tryPromise({
    try: (signal) =>
      fetch(url, {
        ...options.init,
        signal,
        headers: { "User-Agent": BROWSER_UA, Accept: "application/json, text/html;q=0.9", ...options.init?.headers },
        ...(revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" as const }),
      }),
    catch: (cause) => new ExternalApiError({ source: options.source, url, cause }),
  }).pipe(
    Effect.flatMap((res) =>
      res.ok ? Effect.succeed(res) : Effect.fail(new ExternalApiError({ source: options.source, url, status: res.status })),
    ),
    Effect.timeout(options.timeout ?? Duration.seconds(8)),
    Effect.catchTag("TimeoutError", (cause) => Effect.fail(new ExternalApiError({ source: options.source, url, cause }))),
    Effect.retry({
      schedule: Schedule.exponential(Duration.millis(250)),
      times: options.retries ?? 1,
      // 4xx won't get better by retrying
      while: (e) => e.status === undefined || e.status >= 500 || e.status === 429,
    }),
  )
}

/** GET JSON and decode it with an Effect Schema (unknown keys are ignored). */
export const fetchJson = <S extends Schema.Top>(
  url: string,
  schema: S,
  options: FetchOptions,
): Effect.Effect<S["Type"], ExternalApiError, S["DecodingServices"]> =>
  fetchResponse(url, options).pipe(
    Effect.flatMap((res) =>
      Effect.tryPromise({
        try: () => res.json() as Promise<unknown>,
        catch: (cause) => new ExternalApiError({ source: options.source, url, cause }),
      }),
    ),
    Effect.flatMap((body) =>
      Schema.decodeUnknownEffect(schema)(body).pipe(
        Effect.mapError((cause) => new ExternalApiError({ source: options.source, url, cause })),
      ),
    ),
  )

/** GET text (HTML scraping, e.g. SteamCharts). */
export const fetchText = (url: string, options: FetchOptions): Effect.Effect<string, ExternalApiError> =>
  fetchResponse(url, options).pipe(
    Effect.flatMap((res) =>
      Effect.tryPromise({
        try: () => res.text(),
        catch: (cause) => new ExternalApiError({ source: options.source, url, cause }),
      }),
    ),
  )

/** POST a GraphQL query (Epic Games Store). */
export const postGraphql = <S extends Schema.Top>(
  url: string,
  query: string,
  schema: S,
  options: Omit<FetchOptions, "init">,
): Effect.Effect<S["Type"], ExternalApiError, S["DecodingServices"]> =>
  fetchJson(url, schema, {
    ...options,
    init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) },
  })
