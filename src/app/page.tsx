import { Suspense } from "react"
import { FeaturedCarouselSkeleton } from "@/components/discover/featured-carousel"
import { FeatureGrid } from "@/components/discover/feature-grid"
import { FreshReviewsSkeleton } from "@/components/discover/fresh-reviews"
import { SignedInHero, SignedOutHero } from "@/components/discover/home-hero"
import {
  ArtStyleSection,
  ArtStyleSkeleton,
  FeaturedSection,
  FreshReviewsSection,
  HeroMarqueeSection,
  MarqueeSkeleton,
  NewAndUpcomingSection,
  NintendoSection,
  PopularThisWeekSection,
  SignedInHeroSection,
  StatsSection,
  TierRowSection,
  TopRatedSection,
} from "@/components/discover/home-sections"
import { PosterRowSkeleton } from "@/components/discover/poster-row"
import { getCurrentUser } from "@/lib/auth/current-user"

export default async function HomePage() {
  const user = await getCurrentUser()

  return (
    <>
      {user ? (
        <Suspense fallback={<SignedInHero user={user} snapshot={null} />}>
          <SignedInHeroSection user={user} />
        </Suspense>
      ) : (
        <SignedOutHero
          marquee={
            <Suspense fallback={<MarqueeSkeleton />}>
              <HeroMarqueeSection />
            </Suspense>
          }
        />
      )}

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:space-y-16 sm:px-6 sm:py-10">
        <Suspense fallback={<FeaturedCarouselSkeleton />}>
          <FeaturedSection />
        </Suspense>

        <Suspense fallback={<PosterRowSkeleton />}>
          <PopularThisWeekSection />
        </Suspense>

        <Suspense fallback={<PosterRowSkeleton />}>
          <TopRatedSection />
        </Suspense>

        <Suspense fallback={<PosterRowSkeleton />}>
          <NintendoSection />
        </Suspense>

        <Suspense fallback={<PosterRowSkeleton />}>
          <TierRowSection tier="indie" />
        </Suspense>

        <Suspense fallback={<PosterRowSkeleton />}>
          <TierRowSection tier="aaa" />
        </Suspense>

        <Suspense fallback={<PosterRowSkeleton />}>
          <NewAndUpcomingSection />
        </Suspense>

        <Suspense fallback={<ArtStyleSkeleton />}>
          <ArtStyleSection />
        </Suspense>

        <Suspense fallback={<FreshReviewsSkeleton />}>
          <FreshReviewsSection />
        </Suspense>

        {!user && <FeatureGrid />}

        <Suspense fallback={null}>
          <StatsSection />
        </Suspense>
      </div>
    </>
  )
}
