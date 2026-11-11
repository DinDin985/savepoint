import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignInForm } from "@/components/auth/auth-forms"
import { getCurrentUser, safeNextPath } from "@/lib/auth/current-user"

export const metadata: Metadata = { title: "Sign in" }

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams
  const nextPath = typeof next === "string" ? safeNextPath(next) : undefined
  if (await getCurrentUser()) redirect(nextPath ?? "/")
  return (
    <AuthShell title="Welcome back" subtitle="Continue where you left off.">
      <SignInForm next={nextPath} />
    </AuthShell>
  )
}
