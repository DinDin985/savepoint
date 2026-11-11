import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Gamepad2Icon } from "lucide-react"
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
  return { title: profile ? "Playing" : "Player not found" }
}

export default async function ProfilePlayingPage({ params }: Props) {
  const { username } = await params
  const [profile, viewer] = await Promise.all([loadProfile(username), getCurrentUser()])
  if (!profile) notFound()

  const items = await runEffect(listLibrary(profile.id, { status: "playing", sort: "recent" }))
  const isOwn = viewer?.id === profile.id

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Gamepad2Icon className="size-5 text-playing" />
          {isOwn ? "You're playing" : `${profile.displayName} is playing`}
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">{items.length} games</p>
      </div>
      {items.length ? (
        <LibraryGrid items={items} caption="playing-since" />
      ) : (
        <Empty className="border border-dashed border-border bg-card/30 py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Gamepad2Icon className="text-playing" />
            </EmptyMedia>
            <EmptyTitle>Nothing in the console</EmptyTitle>
            <EmptyDescription>
              {isOwn
                ? "Mark a game as playing from its page to let friends know what you're on."
                : `${profile.displayName} isn't playing anything right now.`}
            </EmptyDescription>
          </EmptyHeader>
          {isOwn && (
            <EmptyContent>
              <Button asChild>
                <Link href="/games">Pick something to play</Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      )}
    </div>
  )
}
