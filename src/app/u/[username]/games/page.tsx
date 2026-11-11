import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Gamepad2Icon } from "lucide-react"
import { LibraryFilters } from "@/components/profile/library-filters"
import { LibraryGrid } from "@/components/profile/library-grid"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { getCurrentUser } from "@/lib/auth/current-user"
import { runEffect } from "@/lib/effect/runtime"
import { loadProfile } from "@/lib/profile/cached"
import { listLibrary } from "@/lib/profile/queries"
import { isLibraryFilter, isLibrarySort, type LibraryFilter } from "@/lib/profile/types"

type Props = {
  params: Promise<{ username: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const profile = await loadProfile(username)
  return { title: profile ? "Games" : "Player not found" }
}

const EMPTY_COPY: Record<LibraryFilter, { own: string; other: string }> = {
  all: { own: "Log a game you've played and it'll appear here.", other: "hasn't logged any games yet." },
  played: { own: "Mark games as played to build your collection.", other: "hasn't marked any games as played." },
  playing: { own: "Nothing on the go? Mark a game as playing.", other: "isn't playing anything right now." },
  liked: { own: "Hit the heart on games you love.", other: "hasn't liked any games yet." },
  rated: { own: "Give a game some stars to see it here.", other: "hasn't rated any games yet." },
}

export default async function ProfileGamesPage({ params, searchParams }: Props) {
  const [{ username }, sp] = await Promise.all([params, searchParams])
  const [profile, viewer] = await Promise.all([loadProfile(username), getCurrentUser()])
  if (!profile) notFound()

  const filter: LibraryFilter = isLibraryFilter(sp.filter) ? sp.filter : "all"
  const sort = isLibrarySort(sp.sort) ? sp.sort : "recent"
  const items = await runEffect(listLibrary(profile.id, { status: filter, sort }))
  const isOwn = viewer?.id === profile.id
  const base = `/u/${profile.username}/games`
  const { stats } = profile

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">{isOwn ? "Your games" : `${profile.displayName}'s games`}</h2>
        <p className="text-sm text-muted-foreground tabular-nums">{items.length} shown</p>
      </div>
      <LibraryFilters
        base={base}
        filter={filter}
        sort={sort}
        counts={{ all: stats.games, played: stats.played, playing: stats.playing, liked: stats.liked, rated: stats.rated }}
      />
      {items.length ? (
        <LibraryGrid items={items} />
      ) : (
        <Empty className="border border-dashed border-border bg-card/30 py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Gamepad2Icon />
            </EmptyMedia>
            <EmptyTitle>Nothing here yet</EmptyTitle>
            <EmptyDescription>
              {isOwn ? EMPTY_COPY[filter].own : `${profile.displayName} ${EMPTY_COPY[filter].other}`}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center">
            {filter !== "all" && (
              <Button asChild variant="outline">
                <Link href={base}>Show all games</Link>
              </Button>
            )}
            {isOwn && (
              <Button asChild>
                <Link href="/games">Browse the catalog</Link>
              </Button>
            )}
          </EmptyContent>
        </Empty>
      )}
    </div>
  )
}
