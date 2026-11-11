import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import type { Effect } from "effect"
import type { AppError } from "@/lib/effect/errors"
import { runAction, runEffect, type ActionResult, type AppServices } from "@/lib/effect/runtime"
import { readSessionCookie, validateSessionToken, type SessionUser } from "./session"

export type { SessionUser } from "./session"

/**
 * The signed-in user for this request (memoised per request), or null.
 * Works in Server Components, Server Actions and Route Handlers.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = await readSessionCookie()
  if (!token) return null
  try {
    return await runEffect(validateSessionToken(token))
  } catch (error) {
    console.error("[auth] session lookup failed", error)
    return null
  }
})

/** For protected pages: redirects to /sign-in?next=<path> when signed out. */
export async function requireUser(nextPath: string): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(safeNextPath(nextPath))}`)
  return user
}

/**
 * Server Action helper: resolves the current user, then runs the Effect built
 * by `f`. Signed-out callers get `{ ok: false, error }` without running anything.
 *
 *   export async function toggleWishlist(gameId: number) {
 *     return runAuthedAction((user) => setWishlisted(user.id, gameId, true), { successMessage: "Added" })
 *   }
 */
export async function runAuthedAction<A>(
  f: (user: SessionUser) => Effect.Effect<A, AppError, AppServices>,
  options?: { readonly successMessage?: string },
): Promise<ActionResult<A>> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Please sign in to do that." }
  return runAction(f(user), options)
}

/** Only allow same-site relative redirects (prevents open redirects). */
export function safeNextPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string") return fallback
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback
  return next
}
