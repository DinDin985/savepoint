"use server"

import { revalidatePath } from "next/cache"
import { Effect } from "effect"
import { runAuthedAction } from "@/lib/auth/current-user"
import type { ActionResult } from "@/lib/effect/runtime"
import { formToObject } from "@/lib/effect/validation"
import { replaceTopGames, updateProfile } from "@/lib/profile/mutations"
import type { ProfileFormState } from "@/lib/profile/types"

/** Profile settings form (useActionState). Only ever edits the signed-in user. */
export async function updateProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const submittedAt = Date.now()
  // server actions are public endpoints: don't trust the argument's shape
  if (!(formData instanceof FormData)) return { ok: false, error: "Invalid form submission.", submittedAt }
  const input = formToObject(formData)
  const result = await runAuthedAction((user) => updateProfile(user.id, input))
  if (!result.ok) {
    return { ok: false, error: result.error, fieldErrors: result.fieldErrors, submittedAt }
  }
  // display name / avatar show up everywhere (header, feed, reviews…)
  revalidatePath("/", "layout")
  return { ok: true, message: "Profile saved", username: result.data.username, submittedAt }
}

/** Replace the signed-in user's Top 10 with `gameIds` (in rank order). */
export async function saveTopGames(
  gameIds: readonly number[],
): Promise<ActionResult<{ count: number; username: string }>> {
  const result = await runAuthedAction(
    (user) =>
      replaceTopGames(user.id, { gameIds }).pipe(Effect.map(({ count }) => ({ count, username: user.username }))),
    { successMessage: "Top 10 saved" },
  )
  if (result.ok) {
    // own profile (showcase + backdrop fallback) and every follower/following list showing their covers
    revalidatePath("/u/[username]", "layout")
    revalidatePath("/settings/top-games")
    revalidatePath("/members")
    revalidatePath("/feed")
  }
  return result
}
