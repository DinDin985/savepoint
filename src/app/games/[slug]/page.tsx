import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache, Suspense } from "react"
import { Effect } from "effect"
import { AboutSection } from "@/components/game/detail/about-section"
import { CommunityStatsBlock } from "@/components/game/detail/community-stats"
import { FriendsLogged } from "@/components/game/detail/friends-logged"
import { backdropImage, GameHero } from "@/components/game/detail/game-hero"
import { MediaSection } from "@/components/game/detail/media-section"
import { SectionHeading } from "@/components/game/detail/section-heading"
import { SimilarGames } from "@/components/game/detail/similar-games"
import { PlayerStats } from "@/components/game/player-stats"
import { LibraryPanel } from "@/components/library/library-panel"
import { ReviewsSection } from "@/components/reviews/reviews-section"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/current-user"
import { runEffect } from "@/lib/effect/runtime"
import { getGameBySlug } from "@/lib/games/core"
import { getEntry, getCommunityStats, getFriendsWhoLogged, getSimilarGames } from "@/lib/library"
import type { FriendLog } from "@/lib/library/types"
import { categoryHref, categoryLabel } from "@/lib/taxonomy"

type Props = { params: Promise<{ slug: string }> }

/** One DB lookup per request, shared by generateMetadata and the page. */
const loadGame = cache((slug: string) => runEffect(getGameBySlug(slug)))

const truncate = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const game = await loadGame(slug)
  if (!game) return { title: "Game not found" }
  const title = game.releaseYear ? `${game.title} (${game.releaseYear})` : game.title
  const description = truncate(
    game.shortDescription || game.about[0] || `Rate, review and log ${game.title} on Savepoint.`,
    200,
  )
  const image = game.heroImage ?? game.coverImage
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Savepoint",
      images: [{ url: image, alt: game.title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  }
}

export default async function GamePage({ params }: Props) {
  const { slug } = await params
  const [game, user] = await Promise.all([loadGame(slug), getCurrentUser()])
  if (!game) notFound()

  const { library, stats, friends, similar } = await runEffect(
    Effect.all(
      {
        library: user ? getEntry(user.id, game.id) : Effect.succeed(null),
        stats: getCommunityStats(game.id),
        // social + recommendations are nice-to-have: never take the page down
        friends: user
          ? getFriendsWhoLogged(user.id, game.id).pipe(Effect.orElseSucceed((): FriendLog[] => []))
          : Effect.succeed<FriendLog[]>([]),
        similar: getSimilarGames(game.id).pipe(Effect.orElseSucceed(() => [])),
      },
      { concurrency: "unbounded" },
    ),
  )

  const signedIn = user !== null
  const signInHref = `/sign-in?next=${encodeURIComponent(`/games/${game.slug}`)}`
  const primaryGenre = game.genres[0]
  const storeUrl = game.storeLinks.steam ?? game.storeLinks.epic ?? game.storeLinks.nintendo
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    image: game.coverImage,
    description: game.shortDescription,
    datePublished: game.releaseDate ?? undefined,
    author: game.developers.map((name) => ({ "@type": "Organization", name })),
    publisher: game.publishers.map((name) => ({ "@type": "Organization", name })),
    gamePlatform: game.platforms.map((p) => categoryLabel("platform", p)),
    aggregateRating:
      stats.avgRating !== null
        ? { "@type": "AggregateRating", ratingValue: (stats.avgRating / 2).toFixed(1), bestRating: 5, worstRating: 0.5, ratingCount: stats.ratingCount }
        : undefined,
  }

  return (
    <article className="pb-16">
      <script
        type="application/ld+json"
        // escape "<" so a title can never close the script tag
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <GameHero game={game} community={stats} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/*
          Phone: log → about/media/community/friends → player stats (DOM order).
          Desktop: main column on the left spanning both rows; log + player stats stacked on the right.
          (Not sticky: log + player stats are ~960px, taller than most laptop viewports.)
        */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-6">
          <div className="min-w-0 lg:col-start-2 lg:row-start-1">
            <LibraryPanel
              // fresh optimistic state / dialogs per game on client-side navigation ("More like this")
              key={game.id}
              game={{ id: game.id, slug: game.slug, title: game.title }}
              initialState={library}
              signInHref={signInHref}
            />
          </div>

          <aside aria-label="Player stats" className="min-w-0 self-start lg:col-start-2 lg:row-start-2">
            <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
              <PlayerStats game={game} />
            </Suspense>
          </aside>

          <div className="min-w-0 space-y-12 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            {game.about.length > 0 && (
              <section aria-labelledby="about-heading">
                <SectionHeading id="about-heading" kicker="THE GAME" title={`About ${game.title}`} />
                <AboutSection
                  paragraphs={game.about}
                  source={game.source}
                  wikipediaTitle={game.wikipediaTitle}
                  steamUrl={game.storeLinks.steam}
                />
              </section>
            )}

            <section aria-labelledby="media-heading">
              <SectionHeading
                id="media-heading"
                kicker="MEDIA"
                title="Trailers & screenshots"
              />
              <MediaSection
                title={game.title}
                trailers={game.trailers}
                screenshots={game.screenshots}
                fallbackPoster={backdropImage(game)}
                storeUrl={storeUrl}
              />
            </section>

            <section id="community" aria-labelledby="community-heading" className="scroll-mt-20">
              <SectionHeading id="community-heading" kicker="SAVEPOINT" title="Community" />
              <CommunityStatsBlock
                stats={stats}
                friends={friends}
                gameTitle={game.title}
                signedIn={signedIn}
                signInHref={signInHref}
              />
            </section>

            <section id="friends" aria-labelledby="friends-heading" className="scroll-mt-20">
              <SectionHeading
                id="friends-heading"
                kicker="YOUR CIRCLE"
                title="Friends who logged it"
                action={
                  friends.length > 0 ? (
                    <span className="text-xs text-muted-foreground tabular-nums">{friends.length}</span>
                  ) : undefined
                }
              />
              <FriendsLogged friends={friends} gameTitle={game.title} signedIn={signedIn} signInHref={signInHref} />
            </section>
          </div>
        </div>

        <div className="mt-14 scroll-mt-20">
          <Suspense fallback={<ReviewsSkeleton />}>
            <ReviewsSection game={game} currentUserId={user?.id ?? null} />
          </Suspense>
        </div>

        <section aria-labelledby="similar-heading" className="mt-14">
          <SectionHeading id="similar-heading" kicker="DISCOVER" title="More like this" />
          <SimilarGames
            games={similar}
            browseHref={primaryGenre ? categoryHref("genre", primaryGenre) : "/categories"}
            browseLabel={primaryGenre ? `${categoryLabel("genre", primaryGenre)} games` : "categories"}
          />
        </section>
      </div>
    </article>
  )
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-full max-w-md" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  )
}
