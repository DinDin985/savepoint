import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Effect } from "effect"
import { Gamepad2Icon, HistoryIcon, MessageSquareTextIcon } from "lucide-react"
import { ActivityDiary } from "@/components/profile/activity-diary"
import { RatingHistogram } from "@/components/profile/rating-histogram"
import { ReviewCard } from "@/components/profile/review-card"
import { SectionHeading } from "@/components/profile/section-heading"
import { SignInCta } from "@/components/profile/sign-in-cta"
import { TopTenShowcase } from "@/components/profile/top-ten-showcase"
import { WelcomeCard } from "@/components/profile/welcome-card"
import { GameCard } from "@/components/game/game-card"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UserAvatar } from "@/components/user/user-avatar"
import { getCurrentUser } from "@/lib/auth/current-user"
import { runEffect } from "@/lib/effect/runtime"
import { timeAgo } from "@/lib/format"
import { loadProfile } from "@/lib/profile/cached"
import { getTopGames, listLibrary, ratingHistogram, recentActivity, userReviews } from "@/lib/profile/queries"
import { listFollowing } from "@/lib/social/follows"

export default async function ProfileOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ username }, sp] = await Promise.all([params, searchParams])
  const [profile, viewer] = await Promise.all([loadProfile(username), getCurrentUser()])
  if (!profile) notFound()

  const isOwn = viewer?.id === profile.id
  const base = `/u/${profile.username}`
  const { top, playing, diary, reviews, histogram, following } = await runEffect(
    Effect.all(
      {
        top: getTopGames(profile.id),
        playing: listLibrary(profile.id, { status: "playing", sort: "recent", limit: 12 }),
        diary: recentActivity(profile.id, 8),
        reviews: userReviews(profile.id, 3),
        histogram: ratingHistogram(profile.id),
        following: listFollowing(profile.id, viewer?.id ?? null, 12),
      },
      { concurrency: "unbounded" },
    ),
  )
  const showWelcome = isOwn && sp.welcome === "1"

  return (
    <div className="space-y-10">
      {showWelcome && (
        <WelcomeCard
          displayName={profile.displayName}
          done={{ rated: profile.stats.rated > 0, topGames: top.length > 0, following: profile.stats.following > 0 }}
        />
      )}

      <TopTenShowcase games={top} isOwn={isOwn} displayName={profile.displayName} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-10">
          {playing.length > 0 && (
            <section aria-labelledby="playing-heading">
              <SectionHeading
                id="playing-heading"
                kicker="Now loading"
                title="Currently playing"
                href={playing.length > 8 ? `${base}/playing` : undefined}
              />
              <ul className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pt-1 pb-2 sm:mx-0 sm:px-0">
                {playing.slice(0, 8).map((item) => (
                  <li key={item.game.id} className="w-24 shrink-0 sm:w-28">
                    <GameCard
                      game={item.game}
                      fluid
                      badge={
                        <span className="flex size-5 items-center justify-center rounded-full bg-playing text-background shadow">
                          <Gamepad2Icon className="size-3" />
                        </span>
                      }
                    />
                    <p className="mt-1 truncate text-center text-[11px] text-muted-foreground">
                      {timeAgo(item.startedPlayingAt ?? item.updatedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="activity-heading">
            <SectionHeading
              id="activity-heading"
              kicker="Diary"
              title="Recent activity"
              href={diary.length ? `${base}/games` : undefined}
              linkLabel="All games"
            />
            {diary.length ? (
              <ActivityDiary items={diary} />
            ) : (
              <Empty className="border border-dashed border-border bg-card/30 py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HistoryIcon />
                  </EmptyMedia>
                  <EmptyTitle>{isOwn ? "Your diary is empty" : "Nothing logged yet"}</EmptyTitle>
                  <EmptyDescription>
                    {isOwn
                      ? "Rate, like or mark a game as playing and it'll show up here."
                      : `${profile.displayName} hasn't logged any games yet.`}
                  </EmptyDescription>
                </EmptyHeader>
                {isOwn && (
                  <EmptyContent>
                    <Button asChild>
                      <Link href="/games">Browse games</Link>
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            )}
          </section>

          <section aria-labelledby="reviews-heading">
            <SectionHeading
              id="reviews-heading"
              kicker="Hot takes"
              title="Recent reviews"
              href={profile.stats.reviews > reviews.length ? `${base}/reviews` : undefined}
            />
            {reviews.length ? (
              <div className="grid gap-3">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} lines={3} />
                ))}
              </div>
            ) : (
              <Empty className="border border-dashed border-border bg-card/30 py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageSquareTextIcon />
                  </EmptyMedia>
                  <EmptyTitle>No reviews yet</EmptyTitle>
                  <EmptyDescription>
                    {isOwn
                      ? "Recommend (or roast) a game you've played — your review appears on its page and here."
                      : `${profile.displayName} hasn't written any reviews yet.`}
                  </EmptyDescription>
                </EmptyHeader>
                {isOwn && (
                  <EmptyContent>
                    <Button asChild variant="outline">
                      <Link href={diary[0] ? `/games/${diary[0].game.slug}#reviews` : "/games"}>Write a review</Link>
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            )}
          </section>
        </div>

        <aside className="space-y-8">
          {!viewer && (
            <SignInCta
              next={base}
              title={`Follow ${profile.displayName}`}
              description="Sign in to follow players, log your own games and build your Top 10."
            />
          )}

          <section aria-label="Rating distribution">
            <RatingHistogram histogram={histogram} />
          </section>

          <section aria-labelledby="following-heading">
            <SectionHeading
              id="following-heading"
              title={<span className="text-base">Following</span>}
              href={profile.stats.following ? `${base}/following` : undefined}
              linkLabel={`All ${profile.stats.following}`}
              className="mb-3"
            />
            {following.length ? (
              <ul className="flex flex-wrap gap-2">
                {following.map((m) => (
                  <li key={m.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={`/u/${m.username}`}
                          className="block rounded-full transition-all duration-200 hover:scale-115 hover:ring-2 hover:ring-primary"
                          aria-label={m.displayName}
                        >
                          <UserAvatar user={m} size="md" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        {m.displayName} · @{m.username}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isOwn ? (
                  <>
                    Not following anyone yet.{" "}
                    <Link href="/members" className="text-primary underline-offset-4 hover:underline">
                      Find players
                    </Link>
                  </>
                ) : (
                  "Not following anyone yet."
                )}
              </p>
            )}
          </section>

          {profile.banner && (
            <Link
              href={`/games/${profile.banner.slug}`}
              className="group/fav relative block aspect-[16/7] overflow-hidden rounded-xl ring-1 ring-white/10 transition-all duration-300 hover:ring-primary/60"
            >
              <Image
                src={profile.banner.image}
                alt=""
                fill
                sizes="300px"
                className="object-cover transition-transform duration-700 group-hover/fav:scale-110"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <span className="absolute inset-x-3 bottom-2.5">
                <span className="block font-pixel text-[9px] tracking-widest text-primary uppercase">
                  {profile.banner.chosen ? "Backdrop" : "#1 all-time"}
                </span>
                <span className="block truncate text-sm font-semibold text-white">{profile.banner.title}</span>
              </span>
            </Link>
          )}
        </aside>
      </div>
    </div>
  )
}
