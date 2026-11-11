"use server"

import { redirect } from "next/navigation"
import { runAction } from "@/lib/effect/runtime"
import { formToObject } from "@/lib/effect/validation"
import { safeNextPath } from "@/lib/auth/current-user"
import { signIn, signUp } from "@/lib/auth/accounts"
import { clearSessionCookie, deleteSession, readSessionCookie, setSessionCookie } from "@/lib/auth/session"
import { runEffect } from "@/lib/effect/runtime"

export type AuthFormState = {
  readonly error?: string
  readonly fieldErrors?: Readonly<Record<string, string>>
  /** echo non-secret values back so the form keeps them after an error */
  readonly values?: Readonly<Record<string, string>>
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const input = formToObject(formData)
  const result = await runAction(signUp(input))
  if (!result.ok) {
    return {
      error: result.error,
      fieldErrors: result.fieldErrors,
      values: { username: input.username ?? "", email: input.email ?? "", displayName: input.displayName ?? "" },
    }
  }
  await setSessionCookie(result.data.token, result.data.expiresAt)
  redirect(safeNextPath(input.next, `/u/${result.data.username}?welcome=1`))
}

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const input = formToObject(formData)
  const result = await runAction(signIn(input))
  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors, values: { identifier: input.identifier ?? "" } }
  }
  await setSessionCookie(result.data.token, result.data.expiresAt)
  redirect(safeNextPath(input.next, "/"))
}

export async function signOutAction(): Promise<void> {
  const token = await readSessionCookie()
  if (token) {
    try {
      await runEffect(deleteSession(token))
    } catch (error) {
      console.error("[auth] failed to delete session", error)
    }
  }
  await clearSessionCookie()
  redirect("/")
}
