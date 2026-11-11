import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MemberList } from "@/components/social/member-list"
import { getCurrentUser } from "@/lib/auth/current-user"
import { runEffect } from "@/lib/effect/runtime"
import { loadProfile } from "@/lib/profile/cached"
import { listFollowing } from "@/lib/social/follows"

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const profile = await loadProfile(username)
  return { title: profile ? "Following" : "Player not found" }
}

export default async function ProfileFollowingPage({ params }: Props) {
  const { username } = await params
  const [profile, viewer] = await Promise.all([loadProfile(username), getCurrentUser()])
  if (!profile) notFound()

  const members = await runEffect(listFollowing(profile.id, viewer?.id ?? null))
  const isOwn = viewer?.id === profile.id

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">
          {isOwn ? "People you follow" : `${profile.displayName} follows`}
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">{members.length} players</p>
      </div>
      <MemberList
        members={members}
        signedIn={viewer !== null}
        emptyTitle="Not following anyone"
        emptyDescription={
          isOwn
            ? "Follow players to see their ratings, reviews and Top 10 updates in your feed."
            : `${profile.displayName} isn't following anyone yet.`
        }
        emptyCta={isOwn ? { href: "/members", label: "Find players to follow" } : undefined}
      />
    </div>
  )
}
