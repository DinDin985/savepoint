import "server-only"
import { Duration, Effect, Schema } from "effect"
import type { EpicInfo } from "@/lib/db/schema"
import { ExternalApiError } from "@/lib/effect/errors"
import { postGraphql } from "@/lib/effect/http"
import type { EpicPollResult, EpicRatings } from "./types"

const EPIC_GRAPHQL = "https://store.epicgames.com/graphql"

const PollRow = Schema.Struct({
  id: Schema.optional(Schema.Union([Schema.Number, Schema.String])),
  total: Schema.Number,
  localizations: Schema.Struct({
    resultEmoji: Schema.optional(Schema.NullOr(Schema.String)),
    resultTitle: Schema.String,
    resultText: Schema.optional(Schema.NullOr(Schema.String)),
  }),
})

const EpicRatingsResponse = Schema.Struct({
  data: Schema.optional(
    Schema.NullOr(
      Schema.Struct({
        RatingsPolls: Schema.optional(
          Schema.NullOr(
            Schema.Struct({
              getProductResult: Schema.optional(
                Schema.NullOr(
                  Schema.Struct({
                    averageRating: Schema.optional(Schema.NullOr(Schema.Number)),
                    pollResult: Schema.optional(Schema.NullOr(Schema.Array(PollRow))),
                  }),
                ),
              ),
            }),
          ),
        ),
      }),
    ),
  ),
})

const safeEmoji = (url: string | null | undefined) =>
  url && /^https:\/\/[a-z0-9.-]+\.epicgames\.com\//i.test(url) ? url : null

const sortPolls = (polls: EpicPollResult[]) => polls.filter((p) => p.votes > 0).sort((a, b) => b.votes - a.votes)

/** Catalog snapshot → EpicRatings (used when the live call fails). */
export const epicSnapshot = (epic: EpicInfo): EpicRatings => ({
  averageRating: epic.averageRating,
  polls: sortPolls(
    (epic.polls ?? []).map((p, i) => ({
      id: `snapshot-${i}`,
      title: p.title,
      text: p.text,
      emoji: safeEmoji(p.emoji),
      votes: p.votes,
    })),
  ),
  url: epic.url,
  live: false,
})

/** Live Epic Games Store player rating + poll results for a product namespace. */
export const getEpicRatingsLive = Effect.fn("reviews.epic.ratings")(function* (epic: EpicInfo) {
  const namespace = epic.namespace
  if (!namespace) return yield* new ExternalApiError({ source: "epic", url: EPIC_GRAPHQL })
  // JSON.stringify escapes quotes/backslashes → a valid GraphQL string literal
  const query = `query { RatingsPolls { getProductResult(sandboxId: ${JSON.stringify(namespace)}, locale: "en-US") { averageRating pollResult { id total localizations { resultEmoji resultTitle resultText } } } } }`
  const res = yield* postGraphql(EPIC_GRAPHQL, query, EpicRatingsResponse, {
    source: "epic",
    revalidate: 3600,
    timeout: Duration.seconds(6),
  })
  const result = res.data?.RatingsPolls?.getProductResult
  if (!result) return yield* new ExternalApiError({ source: "epic", url: EPIC_GRAPHQL })
  return {
    averageRating: typeof result.averageRating === "number" && result.averageRating > 0 ? result.averageRating : null,
    polls: sortPolls(
      (result.pollResult ?? []).map((p, i) => ({
        id: String(p.id ?? i),
        title: p.localizations.resultTitle,
        text: p.localizations.resultText ?? "This game has",
        emoji: safeEmoji(p.localizations.resultEmoji),
        votes: p.total,
      })),
    ),
    url: epic.url,
    live: true,
  } satisfies EpicRatings
})

/**
 * Epic ratings for a game: live when possible, otherwise the catalog snapshot.
 * Without a product namespace there's nothing to ask Epic, so the (possibly
 * empty) snapshot is returned. Fails only when the live call fails and the
 * snapshot is empty (so the UI can offer "Try again").
 */
export const getEpicRatings = (epic: EpicInfo) =>
  !epic.namespace
    ? Effect.succeed(epicSnapshot(epic))
    : getEpicRatingsLive(epic).pipe(
        Effect.catchTag("ExternalApiError", (error) => {
          const snapshot = epicSnapshot(epic)
          return snapshot.averageRating !== null || snapshot.polls.length > 0
            ? Effect.succeed(snapshot)
            : Effect.fail(error)
        }),
      )
