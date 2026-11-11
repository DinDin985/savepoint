import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileTabs } from "@/components/profile/profile-tabs"
import { getCurrentUser } from "@/lib/auth/current-user"
import { runEffect } from "@/lib/effect/runtime"
import { loadProfile } from "@/lib/profile/cached"
import { isFollowing } from "@/lib/social/follows"

type Params = Promise<{ username: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params
  const profile = await loadProfile(username)
  if (!profile) return { title: "Player not found" }
  const { stats } = profile
  return {
    title: { default: `${profile.displayName} (@${profile.username})`, template: `%s · ${profile.displayName} · Savepoint` },
    description:
      profile.bio ||
      `${profile.displayName} has logged ${stats.games} games and written ${stats.reviews} reviews on Savepoint.`,
    openGraph: profile.banner ? { images: [{ url: profile.banner.image }] } : undefined,
  }
}

/** Shared header + tab nav for every /u/[username] route (incl. /stats). */
export default async function ProfileLayout({ children, params }: { children: ReactNode; params: Params }) {
  const { username } = await params
  const [profile, viewer] = await Promise.all([loadProfile(username), getCurrentUser()])
  if (!profile) notFound()

  const viewerFollows =
    viewer && viewer.id !== profile.id ? await runEffect(isFollowing(viewer.id, profile.id)) : false

  return (
    <div className="pb-16">
      <ProfileHeader profile={profile} viewerId={viewer?.id ?? null} viewerFollows={viewerFollows} />
      <ProfileTabs
        username={profile.username}
        counts={{
          games: profile.stats.games,
          reviews: profile.stats.reviews,
          wishlist: profile.stats.wishlist,
          playing: profile.stats.playing,
          followers: profile.stats.followers,
          following: profile.stats.following,
        }}
      />
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">{children}</div>
    </div>
  )
}
