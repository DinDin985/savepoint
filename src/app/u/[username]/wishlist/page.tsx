import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BookmarkIcon } from "lucide-react"
import { LibraryGrid } from "@/components/profile/library-grid"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { getCurrentUser } from "@/lib/auth/current-user"
import { runEffect } from "@/lib/effect/runtime"
import { loadProfile } from "@/lib/profile/cached"
import { listLibrary } from "@/lib/profile/queries"

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const profile = await loadProfile(username)
  return { title: profile ? "Wishlist" : "Player not found" }
}

export default async function ProfileWishlistPage({ params }: Props) {
  const { username } = await params
  const [profile, viewer] = await Promise.all([loadProfile(username), getCurrentUser()])
  if (!profile) notFound()

  const items = await runEffect(listLibrary(profile.id, { status: "wishlisted", sort: "recent" }))
  const isOwn = viewer?.id === profile.id

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <BookmarkIcon className="size-5 text-wishlist" fill="currentColor" />
          {isOwn ? "Your wishlist" : `${profile.displayName}'s wishlist`}
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">{items.length} games</p>
      </div>
      {items.length ? (
        <LibraryGrid items={items} showRating={false} caption="added" />
      ) : (
        <Empty className="border border-dashed border-border bg-card/30 py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookmarkIcon className="text-wishlist" />
            </EmptyMedia>
            <EmptyTitle>Wishlist is empty</EmptyTitle>
            <EmptyDescription>
              {isOwn
                ? "Bookmark games you want to play next — Steam, Epic and Nintendo alike."
                : `${profile.displayName} hasn't wishlisted anything yet.`}
            </EmptyDescription>
          </EmptyHeader>
          {isOwn && (
            <EmptyContent>
              <Button asChild>
                <Link href="/games">Discover games</Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      )}
    </div>
  )
}
