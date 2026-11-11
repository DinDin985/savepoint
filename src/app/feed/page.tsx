import type { Metadata } from "next"
import Link from "next/link"
import { Effect } from "effect"
import { RssIcon, UsersIcon, WindIcon } from "lucide-react"
import { FeedList } from "@/components/social/feed-list"
import { FeedOwnToggle } from "@/components/social/feed-own-toggle"
import { MemberCard } from "@/components/social/member-card"
import { SectionHeading } from "@/components/profile/section-heading"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { requireUser } from "@/lib/auth/current-user"
import { runEffect } from "@/lib/effect/runtime"
import { getFeed } from "@/lib/social/feed"
import { countFollowing } from "@/lib/social/follows"
import { suggestedMembers } from "@/lib/social/members"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Friends activity",
  description: "What the players you follow are rating, reviewing and playing.",
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const viewer = await requireUser("/feed")
  const sp = await searchParams
  const includeOwn = sp.own === "1"

  const { page, following, suggestions } = await runEffect(
    Effect.all(
      {
        page: getFeed(viewer.id, { includeOwn }),
        following: countFollowing(viewer.id),
        suggestions: suggestedMembers(viewer.id, 6),
      },
      { concurrency: "unbounded" },
    ),
  )
  const followsNobody = following === 0
  // the "follow nobody" empty state already lists popular members in the main column
  const popularInMain = page.items.length === 0 && followsNobody
  const showSidebar = !popularInMain && suggestions.length > 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-pixel text-[10px] tracking-widest text-primary uppercase">Party chat</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <RssIcon className="size-6 text-primary" />
            Friends activity
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {followsNobody
              ? "Follow players to fill this page with their ratings, reviews and Top 10 updates."
              : following === 1
                ? "What the player you follow has been up to."
                : `What the ${following} players you follow have been up to.`}
          </p>
        </div>
        <FeedOwnToggle includeOwn={includeOwn} />
      </header>

      <div className={cn("grid gap-10", showSidebar && "lg:grid-cols-[minmax(0,1fr)_320px]")}>
        <div className="min-w-0">
          {page.items.length > 0 ? (
            <FeedList
              key={includeOwn ? "own" : "friends"}
              initialPage={page}
              includeOwn={includeOwn}
              viewerId={viewer.id}
            />
          ) : followsNobody ? (
            <div className="space-y-8">
              <Empty className="border border-dashed border-border bg-card/30 py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UsersIcon />
                  </EmptyMedia>
                  <EmptyTitle className="text-base">Your feed is waiting for friends</EmptyTitle>
                  <EmptyDescription>
                    Savepoint is better with company. Follow a few players and every rating, review, &ldquo;now
                    playing&rdquo; and Top 10 shuffle they make shows up here.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent className="flex-row justify-center">
                  <Button asChild>
                    <Link href="/members">Browse members</Link>
                  </Button>
                  {!includeOwn && (
                    <Button asChild variant="outline">
                      <Link href="/feed?own=1">See my activity</Link>
                    </Button>
                  )}
                </EmptyContent>
              </Empty>
              {suggestions.length > 0 && (
                <section aria-labelledby="popular-heading">
                  <SectionHeading id="popular-heading" kicker="Start here" title="Popular members" href="/members" />
                  <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3">
                    {suggestions.map((m) => (
                      <MemberCard key={m.id} member={m} signedIn />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <Empty className="border border-dashed border-border bg-card/30 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <WindIcon />
                </EmptyMedia>
                <EmptyTitle className="text-base">Quiet in the lobby</EmptyTitle>
                <EmptyDescription>
                  The players you follow haven&apos;t logged anything yet. Follow a few more, or kick things off
                  yourself.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="flex-row justify-center">
                <Button asChild>
                  <Link href="/games">Rate a game</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/members">Find more players</Link>
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </div>

        {showSidebar && (
          <aside aria-label="Who to follow" className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <SectionHeading title={<span className="text-base">Who to follow</span>} href="/members" className="mb-3" />
            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-1">
              {suggestions.slice(0, 3).map((m) => (
                <MemberCard key={m.id} member={m} signedIn />
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
