import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MemberList } from "@/components/social/member-list"
import { getCurrentUser } from "@/lib/auth/current-user"
import { runEffect } from "@/lib/effect/runtime"
import { loadProfile } from "@/lib/profile/cached"
import { listFollowers } from "@/lib/social/follows"

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const profile = await loadProfile(username)
  return { title: profile ? "Followers" : "Player not found" }
}

export default async function ProfileFollowersPage({ params }: Props) {
  const { username } = await params
  const [profile, viewer] = await Promise.all([loadProfile(username), getCurrentUser()])
  if (!profile) notFound()

  const members = await runEffect(listFollowers(profile.id, viewer?.id ?? null))
  const isOwn = viewer?.id === profile.id

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">{isOwn ? "Your followers" : `Following ${profile.displayName}`}</h2>
        <p className="text-sm text-muted-foreground tabular-nums">{members.length} players</p>
      </div>
      <MemberList
        members={members}
        signedIn={viewer !== null}
        emptyTitle="No followers yet"
        emptyDescription={
          isOwn
            ? "Rate, review and pin your Top 10 — players with great taste get found."
            : `Be the first to follow ${profile.displayName}.`
        }
        emptyCta={isOwn ? { href: "/settings/top-games", label: "Polish your Top 10" } : undefined}
      />
    </div>
  )
}
