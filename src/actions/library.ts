"use server"

import { revalidatePath } from "next/cache"
import { Effect } from "effect"
import { runAuthedAction, type SessionUser } from "@/lib/auth/current-user"
import type { AppError } from "@/lib/effect/errors"
import type { ActionResult, AppServices } from "@/lib/effect/runtime"
import { validate } from "@/lib/effect/validation"
import { deleteReview, setFlag, setRating, upsertReview } from "@/lib/library/entries"
import { GameRefInput, SetFlagInput, SetRatingInput } from "@/lib/library/schemas"
import type { LibraryFlag, LibraryState, ReviewDraft } from "@/lib/library/types"

/**
 * Library Server Actions. Every action:
 *  - requires a signed-in user and only ever touches that user's rows,
 *  - validates its (untrusted) arguments with Effect Schema,
 *  - returns the updated `LibraryState` so the client can reconcile its optimistic UI,
 *  - revalidates the game page and the user's profile pages.
 */

async function libraryAction(
  build: (user: SessionUser) => Effect.Effect<LibraryState, AppError, AppServices>,
): Promise<ActionResult<LibraryState>> {
  const result = await runAuthedAction((user) =>
    build(user).pipe(Effect.map((state) => ({ state, username: user.username }))),
  )
  if (!result.ok) return result
  const { state, username } = result.data
  revalidatePath(`/games/${state.slug}`)
  revalidatePath(`/u/${username}`)
  // profile sub-pages (games, reviews, wishlist, playing, stats…) share the /u/[username] layout
  revalidatePath("/u/[username]", "layout")
  return { ok: true, data: state, message: result.message }
}

export async function setRatingAction(gameId: number, rating: number | null): Promise<ActionResult<LibraryState>> {
  return libraryAction((user) =>
    Effect.gen(function* () {
      const input = yield* validate(SetRatingInput, { gameId, rating })
      return yield* setRating(user.id, input.gameId, input.rating)
    }),
  )
}

export async function setLibraryFlagAction(
  gameId: number,
  flag: LibraryFlag,
  value: boolean,
  options?: { readonly finished?: boolean },
): Promise<ActionResult<LibraryState>> {
  return libraryAction((user) =>
    Effect.gen(function* () {
      const input = yield* validate(SetFlagInput, { gameId, flag, value, finished: options?.finished })
      return yield* setFlag(user.id, input.gameId, input.flag, input.value, { finished: input.finished })
    }),
  )
}

export async function saveReviewAction(gameId: number, draft: ReviewDraft): Promise<ActionResult<LibraryState>> {
  return libraryAction((user) =>
    Effect.gen(function* () {
      const input = yield* validate(GameRefInput, { gameId })
      // the draft itself is validated (trim, lengths, hours range) by upsertReview
      return yield* upsertReview(user.id, input.gameId, draft)
    }),
  )
}

export async function deleteReviewAction(gameId: number): Promise<ActionResult<LibraryState>> {
  return libraryAction((user) =>
    Effect.gen(function* () {
      const input = yield* validate(GameRefInput, { gameId })
      return yield* deleteReview(user.id, input.gameId)
    }),
  )
}
