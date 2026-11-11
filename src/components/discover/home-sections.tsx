import "server-only"
import type { ComponentProps } from "react"
import { FlameIcon, MessageSquareTextIcon, PaletteIcon } from "lucide-react"
import {
  categoryShowcases,
  criticallyAcclaimed,
  featuredGames,
  marqueeGames,
  newAndUpcoming,
  nintendoSpotlight,
  popularThisWeek,
  tierHighlights,
  topRatedByCommunity,
} from "@/lib/catalog/queries"
import { recentCommunityReviews, siteStats, userHomeSnapshot } from "@/lib/catalog/community"
import { loadSafely, type Loaded } from "@/lib/catalog/load"
import { browseHref } from "@/lib/catalog/params"
import type { SessionUser } from "@/lib/auth/current-user"
import { categoryHref } from "@/lib/taxonomy"
import { formatReleaseDate } from "@/lib/format"
import type { GameSummary } from "@/lib/games/core"
import { CategoryTile, CategoryTileSkeleton } from "./category-tile"
import { FeaturedCarousel } from "./featured-carousel"
import { FreshReviews } from "./fresh-reviews"
import { SignedInHero } from "./home-hero"
import { PosterMarquee, toMarqueeRows } from "./poster-marquee"
import { PosterBadge, PosterRow } from "./poster-row"
import { SectionHeader } from "./section-header"
import { LoadError } from "./states"
import { StatsStrip } from "./stats-strip"

const ROW_SIZE = 14

/* Each section is an async Server Component wrapped in <Suspense> by the home
 * page, so the page streams in progressively and a failing query only affects
 * its own section. */

export async function HeroMarqueeSection() {
  const result = await loadSafely("home.marquee", marqueeGames(45))
  if (!result.ok || result.data.length === 0) return <MarqueeSkeleton animate={false} />
  return <PosterMarquee rows={toMarqueeRows(result.data, 3)} className="pb-10 sm:pb-14" />
}

export function MarqueeSkeleton({ animate = true }: { animate?: boolean }) {
  return (
    <div className="flex flex-col gap-1 overflow-hidden pb-10 sm:gap-2 sm:pb-14" aria-hidden>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-2 py-3 sm:gap-3" style={{ marginLeft: row === 1 ? -40 : 0 }}>
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              className={`aspect-[2/3] w-20 shrink-0 rounded-md bg-muted sm:w-28 lg:w-32 ${animate ? "animate-pulse" : "opacity-40"}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export async function SignedInHeroSection({ user }: { user: SessionUser }) {
  const result = await loadSafely("home.snapshot", userHomeSnapshot(user.id))
  return <SignedInHero user={user} snapshot={result.ok ? result.data : null} />
}

export async function FeaturedSection() {
  const result = await loadSafely("home.featured", featuredGames(12))
  if (!result.ok) return <LoadError compact title="Couldn't load featured games" retryHref="/" />
  return <FeaturedCarousel games={result.data} />
}

export async function PopularThisWeekSection() {
  const result = await loadSafely("home.popularThisWeek", popularThisWeek(ROW_SIZE))
  return (
    <RowOrError
      result={result}
      kicker="Trending"
      title="Popular this week"
      description="What the community has been logging, rating and reviewing over the last seven days."
      href={browseHref({ sort: "popular" })}
      icon={<FlameIcon className="size-5 text-liked" />}
    />
  )
}

export async function TopRatedSection() {
  const community = await loadSafely("home.topRated", topRatedByCommunity(ROW_SIZE, 1))
  if (community.ok && community.data.length >= 4) {
    return (
      <PosterRow
        kicker="Community favourites"
        title="Top rated by the community"
        description="The highest average ratings from Savepoint members."
        href={browseHref({ sort: "rating" })}
        games={community.data}
      />
    )
  }
  const acclaimed = await loadSafely("home.acclaimed", criticallyAcclaimed(ROW_SIZE))
  if (!acclaimed.ok) return <SectionError title="Critically acclaimed" />
  const scores = new Map(acclaimed.data.map((g) => [g.id, g.metacritic]))
  return (
    <PosterRow
      kicker="Critics' picks"
      title="Critically acclaimed"
      description="The best-reviewed games in the catalog — rate them to shape the community top list."
      href={browseHref({ sort: "rating" })}
      games={acclaimed.data}
      badgeFor={(game) => {
        const score = scores.get(game.id)
        return score ? <PosterBadge tone="star">{score}</PosterBadge> : null
      }}
    />
  )
}

export async function NintendoSection() {
  const result = await loadSafely("home.nintendo", nintendoSpotlight(ROW_SIZE))
  return (
    <section className="relative overflow-hidden rounded-2xl border border-liked/20 bg-gradient-to-br from-liked/12 via-card/50 to-card/20 px-4 pt-5 pb-3 sm:px-6 sm:pt-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-liked/15 blur-3xl"
      />
      <div className="relative">
        {result.ok ? (
          <PosterRow
            kicker="Switch & Switch 2"
            title="Nintendo spotlight"
            description="First-party icons plus the best indies and blockbusters you can play on Nintendo Switch."
            href={categoryHref("platform", "nintendo")}
            games={result.data}
            badgeFor={(game) =>
              result.data.find((g) => g.id === game.id)?.exclusive ? <PosterBadge tone="liked">Exclusive</PosterBadge> : null
            }
          />
        ) : (
          <SectionError title="Nintendo spotlight" />
        )}
      </div>
    </section>
  )
}

export async function TierRowSection({ tier }: { tier: "indie" | "aaa" }) {
  const result = await loadSafely(`home.tier.${tier}`, tierHighlights(tier, ROW_SIZE))
  const copy =
    tier === "indie"
      ? {
          kicker: "Small teams, big ideas",
          title: "Indie darlings",
          description: "Singular visions from independent studios — many of them on Switch too.",
        }
      : {
          kicker: "Blockbusters",
          title: "Triple-A blockbusters",
          description: "The biggest productions from the biggest studios.",
        }
  if (!result.ok) return <SectionError title={copy.title} />
  return <PosterRow {...copy} href={categoryHref("tier", tier)} games={result.data} />
}

export async function NewAndUpcomingSection() {
  const result = await loadSafely("home.newAndUpcoming", newAndUpcoming(ROW_SIZE))
  if (!result.ok) return <SectionError title="New & upcoming" />
  const byId = new Map(result.data.map((g) => [g.id, g]))
  return (
    <PosterRow
      kicker="Release radar"
      title="New & upcoming"
      description="Fresh releases and what's coming next."
      href={browseHref({ sort: "newest" })}
      games={result.data}
      badgeFor={(game) => {
        const entry = byId.get(game.id)
        if (!entry) return null
        if (entry.status === "upcoming")
          return <PosterBadge tone="playing">{formatReleaseDate(entry.releaseDate).replace(/, \d{4}$/, "")}</PosterBadge>
        if (entry.status === "tba") return <PosterBadge tone="playing">TBA</PosterBadge>
        if (entry.status === "new") return <PosterBadge>New</PosterBadge>
        return null
      }}
    />
  )
}

export async function ArtStyleSection() {
  const result = await loadSafely("home.artStyles", categoryShowcases(["art-style"]))
  return (
    <section aria-labelledby="art-styles-title">
      <SectionHeader
        id="art-styles-title"
        kicker="Look & feel"
        title="Explore by art style"
        description="Pixel art, hand-drawn, cel-shaded and more — find games by how they look."
        href="/categories#art-style"
        linkLabel="All categories"
        icon={<PaletteIcon className="size-5 text-wishlist" />}
      />
      {result.ok ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {result.data
            .filter((s) => s.count > 0)
            .map((showcase) => (
              <CategoryTile key={showcase.slug} showcase={showcase} effect="crossfade" />
            ))}
        </div>
      ) : (
        <LoadError compact title="Couldn't load art styles" retryHref="/" />
      )}
    </section>
  )
}

export function ArtStyleSkeleton() {
  return (
    <div>
      <div className="mb-4 h-12" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <CategoryTileSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export async function FreshReviewsSection() {
  const result = await loadSafely("home.freshReviews", recentCommunityReviews(6))
  if (!result.ok || result.data.length === 0) return null
  return (
    <section aria-labelledby="fresh-reviews-title">
      <SectionHeader
        id="fresh-reviews-title"
        kicker="From the community"
        title="Fresh reviews"
        description="The latest takes from Savepoint members."
        href="/members"
        linkLabel="Find players"
        icon={<MessageSquareTextIcon className="size-5 text-primary" />}
      />
      <FreshReviews reviews={result.data} />
    </section>
  )
}

export async function StatsSection() {
  const result = await loadSafely("home.stats", siteStats())
  if (!result.ok) return null
  return <StatsStrip stats={result.data} />
}

/* ── helpers ────────────────────────────────────────────────────────────── */

function RowOrError({
  result,
  ...row
}: {
  result: Loaded<GameSummary[]>
} & Omit<ComponentProps<typeof PosterRow>, "games">) {
  if (!result.ok) return <SectionError title={row.title} />
  return <PosterRow {...row} games={result.data} />
}

function SectionError({ title }: { title: string }) {
  return (
    <section>
      <SectionHeader title={title} />
      <LoadError compact title={`Couldn't load “${title}”`} retryHref="/" />
    </section>
  )
}
