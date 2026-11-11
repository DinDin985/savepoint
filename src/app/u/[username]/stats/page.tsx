import { cache } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { UserStatsEmpty, UserStatsView } from "@/components/stats/user-stats-view"
import { getCurrentUser } from "@/lib/auth/current-user"
import { runEffect } from "@/lib/effect/runtime"
import { getStatsUser, getUserStats } from "@/lib/stats/user-stats"

type Props = { params: Promise<{ username: string }> }

const normalise = (raw: string) => {
  let value = raw
  try {
    value = decodeURIComponent(raw)
  } catch {
    // malformed escape sequence: fall back to the raw segment (it simply won't match a user)
  }
  return value.trim().toLowerCase()
}

/** Memoised per request: shared by generateMetadata and the page. */
const loadUser = cache((username: string) => runEffect(getStatsUser(normalise(username))))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await loadUser(username)
  if (!user) return { title: "Player not found" }
  return {
    // the profile layout's title template appends " · <displayName> · Savepoint"
    title: "Stats",
    description: `${user.displayName}'s Savepoint stats: ratings, genres, platforms, studio sizes and monthly activity.`,
  }
}

export default async function UserStatsPage({ params }: Props) {
  const { username } = await params
  const [user, viewer] = await Promise.all([loadUser(username), getCurrentUser()])
  if (!user) notFound()

  const stats = await runEffect(getUserStats(user.id))
  const isOwner = viewer?.id === user.id
  const statsViewer = viewer ? { username: viewer.username } : null

  if (stats.totals.logged === 0 && stats.totals.reviews === 0) {
    return <UserStatsEmpty user={user} viewer={statsViewer} isOwner={isOwner} />
  }
  return <UserStatsView user={user} stats={stats} viewer={statsViewer} isOwner={isOwner} />
}
