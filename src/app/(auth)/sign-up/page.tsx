import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignUpForm } from "@/components/auth/auth-forms"
import { getCurrentUser, safeNextPath } from "@/lib/auth/current-user"

export const metadata: Metadata = { title: "Create account" }

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { next } = await searchParams
  const nextPath = typeof next === "string" ? safeNextPath(next) : undefined
  if (await getCurrentUser()) redirect(nextPath ?? "/")
  return (
    <AuthShell title="Join Savepoint" subtitle="Track what you play, rate it, and see what your friends are into.">
      <SignUpForm next={nextPath} />
    </AuthShell>
  )
}
