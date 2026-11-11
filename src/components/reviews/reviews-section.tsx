import { Effect, Result } from "effect"
import { ExternalLinkIcon, LogInIcon } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import type { Game } from "@/lib/db/schema"
import { userMessage, type AppError } from "@/lib/effect/errors"
import { runEffect } from "@/lib/effect/runtime"
import { getCommunityOverview, listCommunityReviews } from "@/lib/reviews/community"
import { epicSnapshot } from "@/lib/reviews/epic"
import { getSteamOverview, getSteamReviews, steamStoreUrl } from "@/lib/reviews/steam"
import { cn } from "@/lib/utils"
import { ReviewsBodySkeleton, StoreNotice } from "./review-states"
import { ReviewsTabs, type ReviewsTabId, type ReviewsTabsProps } from "./reviews-tabs"

/**
 * The game page's reviews area (id="reviews"), styled like Steam's:
 * tabs for Savepoint community reviews, live Steam reviews and Epic Games
 * Store player ratings, with summary rows, a positive/negative histogram,
 * filters and "Load more". The default tab (Steam when the game is on Steam,
 * otherwise Savepoint) is server-rendered; other tabs load on demand.
 */
export function ReviewsSection({ game, currentUserId }: { game: Game; currentUserId: string | null }) {
  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-pixel text-[11px] tracking-widest text-primary uppercase">Reviews</p>
          <h2 id="reviews-heading" className="mt-1 text-2xl font-bold tracking-tight">
            What players think
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StoreLinks game={game} />
          {currentUserId ? null : (
            <Link
              href={signInHrefFor(game.slug)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:scale-105 hover:shadow-[0_0_18px_-6px_var(--primary)] active:scale-95 sm:h-8"
            >
              <LogInIcon className="size-3.5" aria-hidden />
              Sign in to review &amp; vote
            </Link>
          )}
        </div>
      </div>
      <Suspense fallback={<ReviewsBodySkeleton />}>
        <ReviewsBody game={game} currentUserId={currentUserId} />
      </Suspense>
    </section>
  )
}

const errorText = (error: AppError) => userMessage(error)

const signInHrefFor = (slug: string) => `/sign-in?next=${encodeURIComponent(`/games/${slug}#reviews`)}`

async function ReviewsBody({ game, currentUserId }: { game: Game; currentUserId: string | null }) {
  const appId = game.steamAppId
  const defaultTab: ReviewsTabId = appId ? "steam" : "savepoint"

  const loaded = await runEffect(
    Effect.all(
      [
        Effect.result(getCommunityOverview(game.id)),
        // Savepoint is only server-rendered when it is the default tab
        defaultTab === "savepoint"
          ? Effect.result(
              listCommunityReviews({ gameId: game.id, viewerId: currentUserId, sort: "helpful", type: "all" }),
            )
          : Effect.succeed(null),
        appId ? getSteamOverview(game) : Effect.succeed(null),
        appId ? Effect.result(getSteamReviews(appId, { sort: "helpful", type: "all" })) : Effect.succeed(null),
      ] as const,
      { concurrency: "unbounded" },
    ),
  ).catch((error: unknown) => {
    // typed failures are already captured above; this is a defect — keep the rest of the game page alive
    console.error("[reviews] section failed to load", error)
    return null
  })

  if (!loaded) {
    return (
      <StoreNotice
        className="bg-steam-bg"
        title="Reviews couldn't be loaded"
        description="Something went wrong on our side. Refresh the page to try again."
        href={appId ? (game.storeLinks.steam ?? steamStoreUrl(appId)) : (game.storeLinks.epic ?? game.storeLinks.nintendo)}
        linkLabel="Open store page"
      />
    )
  }
  const [community, communityFirst, steamOverview, steamFirst] = loaded

  if (Result.isFailure(community) && !appId) {
    // our own DB is down and there's nothing else to show
    return (
      <StoreNotice
        className="bg-steam-bg"
        title="Reviews couldn't be loaded"
        description={`${errorText(community.failure)} Refresh the page to try again.`}
      />
    )
  }

  // Nintendo eShop has no public player reviews: when there's no Steam either,
  // Savepoint is the only place for written reviews — say so (with a store link).
  const nintendoUrl = !appId ? game.storeLinks.nintendo : null
  const props: ReviewsTabsProps = {
    defaultTab,
    game: { id: game.id, title: game.title },
    signedIn: currentUserId !== null,
    signInHref: signInHrefFor(game.slug),
    community: {
      overview: Result.isSuccess(community) ? community.success : null,
      initialPage: communityFirst && Result.isSuccess(communityFirst) ? communityFirst.success : null,
      initialError:
        communityFirst && Result.isFailure(communityFirst)
          ? errorText(communityFirst.failure)
          : Result.isFailure(community)
            ? errorText(community.failure)
            : null,
      storeWithoutReviews: nintendoUrl ? { name: "Nintendo eShop", url: nintendoUrl } : null,
    },
    steam:
      appId && steamOverview
        ? {
            appId,
            storeUrl: game.storeLinks.steam ?? steamStoreUrl(appId),
            overview: steamOverview,
            initialPage: steamFirst && Result.isSuccess(steamFirst) ? steamFirst.success : null,
            initialError: steamFirst && Result.isFailure(steamFirst) ? errorText(steamFirst.failure) : null,
          }
        : null,
    epic: game.epic
      ? {
          url: game.epic.url || game.storeLinks.epic || "https://store.epicgames.com/",
          averageRating: game.epic.averageRating,
          // without a product namespace there's nothing live to ask Epic: hand the
          // snapshot straight to the tab instead of a pointless request + skeleton
          initial: game.epic.namespace ? null : epicSnapshot(game.epic),
        }
      : null,
  }

  return <ReviewsTabs {...props} />
}

/** Store pages for this game (Steam / Epic / Nintendo eShop) as hoverable chips. */
function StoreLinks({ game }: { game: Game }) {
  const links = [
    { name: "Steam", url: game.storeLinks.steam ?? (game.steamAppId ? steamStoreUrl(game.steamAppId) : null) },
    { name: "Epic Games Store", url: game.storeLinks.epic ?? game.epic?.url ?? null },
    { name: "Nintendo eShop", url: game.storeLinks.nintendo },
  ].filter((l): l is { name: string; url: string } => Boolean(l.url))
  if (links.length === 0) return null
  return (
    <nav aria-label="Store pages" className="flex flex-wrap gap-1.5">
      {links.map((link) => (
        <a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-card px-3 text-xs font-medium text-muted-foreground sm:h-8",
            "transition-all duration-200 hover:scale-105 hover:border-primary/40 hover:text-primary",
          )}
        >
          {link.name}
          <ExternalLinkIcon className="size-3" aria-hidden />
        </a>
      ))}
    </nav>
  )
}
