"use server"

import { revalidatePath } from "next/cache"
import { runAuthedAction } from "@/lib/auth/current-user"
import type { ActionResult } from "@/lib/effect/runtime"
import { getFeedPage } from "@/lib/social/feed"
import { followUser as follow, unfollowUser as unfollow } from "@/lib/social/follows"
import type { FeedCursor, FeedPage, FollowResult } from "@/lib/social/types"

function revalidateSocial() {
  // follower counts + follow buttons live in the profile layout of both users
  revalidatePath("/u/[username]", "layout")
  revalidatePath("/feed")
  revalidatePath("/members")
}

export async function followUser(userId: string): Promise<ActionResult<FollowResult>> {
  const result = await runAuthedAction((viewer) => follow(viewer.id, { userId }))
  if (result.ok) {
    revalidateSocial()
    return { ...result, message: `You're now following @${result.data.username}` }
  }
  return result
}

export async function unfollowUser(userId: string): Promise<ActionResult<FollowResult>> {
  const result = await runAuthedAction((viewer) => unfollow(viewer.id, { userId }))
  if (result.ok) {
    revalidateSocial()
    return { ...result, message: `Unfollowed @${result.data.username}` }
  }
  return result
}

/** "Load more" for /feed — read-only, keyset paginated by (time, activity id). Input is validated server-side. */
export async function loadMoreFeed(input: FeedCursor & { includeOwn: boolean }): Promise<ActionResult<FeedPage>> {
  return runAuthedAction((viewer) => getFeedPage(viewer.id, input))
}
