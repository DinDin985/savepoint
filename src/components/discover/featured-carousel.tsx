"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ArrowRightIcon } from "lucide-react"
import { RatingStars } from "@/components/game/rating-stars"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import type { FeaturedGame } from "@/lib/catalog/queries"
import { cn } from "@/lib/utils"
import { CoverArt } from "./cover-art"

/** Hero rotation of featured games (manual navigation only — no autoplay). */
export function FeaturedCarousel({ games }: { games: readonly FeaturedGame[] }) {
  const [api, setApi] = useState<CarouselApi>()
  const [selected, setSelected] = useState(0)

  const onSelect = useCallback((carousel: NonNullable<CarouselApi>) => {
    setSelected(carousel.selectedScrollSnap())
  }, [])

  useEffect(() => {
    if (!api) return
    api.on("select", onSelect)
    api.on("reInit", onSelect)
    return () => {
      api.off("select", onSelect)
      api.off("reInit", onSelect)
    }
  }, [api, onSelect])

  if (games.length === 0) return null

  return (
    <section aria-label="Featured games" className="group/featured">
      <Carousel setApi={setApi} opts={{ loop: games.length > 1, align: "start" }} className="relative">
        <CarouselContent>
          {games.map((game, index) => (
            <CarouselItem key={game.id}>
              <FeaturedSlide game={game} priority={index === 0} active={index === selected} />
            </CarouselItem>
          ))}
        </CarouselContent>
        {games.length > 1 && (
          <>
            <CarouselPrevious
              variant="secondary"
              size="icon-lg"
              className="top-auto bottom-4 left-auto right-16 my-0 border border-white/10 bg-background/70 backdrop-blur hover:bg-primary hover:text-primary-foreground sm:inset-y-0 sm:left-4 sm:right-auto sm:my-auto sm:opacity-0 sm:group-hover/featured:opacity-100 sm:focus-visible:opacity-100"
            />
            <CarouselNext
              variant="secondary"
              size="icon-lg"
              className="top-auto right-4 bottom-4 my-0 border border-white/10 bg-background/70 backdrop-blur hover:bg-primary hover:text-primary-foreground sm:inset-y-0 sm:my-auto sm:opacity-0 sm:group-hover/featured:opacity-100 sm:focus-visible:opacity-100"
            />
          </>
        )}
      </Carousel>

      {games.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center justify-center" aria-label="Choose featured game">
          {games.map((game, index) => (
            // 36px hit area around a small pill
            <button
              key={game.id}
              type="button"
              aria-current={index === selected ? "true" : undefined}
              aria-label={`Show ${game.title} (${index + 1} of ${games.length})`}
              onClick={() => api?.scrollTo(index)}
              className="group/dot flex h-9 min-w-6 items-center justify-center px-[3px] focus-visible:outline-none"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-300 group-hover/dot:scale-125 group-hover/dot:bg-primary/70 group-focus-visible/dot:ring-2 group-focus-visible/dot:ring-ring",
                  index === selected ? "w-6 bg-primary" : "w-1.5 bg-white/25",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function FeaturedSlide({ game, priority, active }: { game: FeaturedGame; priority: boolean; active: boolean }) {
  return (
    <article className="group/slide relative isolate overflow-hidden rounded-2xl bg-card ring-1 ring-white/10">
      <div className="relative aspect-[4/5] w-full sm:aspect-[16/8] lg:aspect-[16/6.5]">
        <Image
          src={game.backdrop}
          alt=""
          fill
          preload={priority}
          sizes="(max-width: 1280px) 100vw, 1280px"
          className={cn(
            "-z-10 object-cover transition-transform duration-[1.2s] ease-out group-hover/slide:scale-105",
            game.lowResBackdrop && "scale-105 blur-[2px] brightness-75 group-hover/slide:scale-110",
          )}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/10 sm:bg-gradient-to-r sm:from-background/95 sm:via-background/60 sm:to-transparent"
        />

        <div className="absolute inset-0 flex items-end gap-6 p-5 pb-16 sm:items-center sm:p-10 lg:p-14">
          <div
            // off-screen slides keep their links out of the tab order
            inert={!active}
            className={cn(
              "max-w-xl min-w-0 transition-all duration-700 ease-out",
              active ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
            )}
          >
            <p className="font-pixel text-[10px] tracking-[0.25em] text-primary uppercase">
              {game.nintendo && game.lowResBackdrop ? "Nintendo spotlight" : "Featured"}
            </p>
            <h2 className="mt-2 text-2xl leading-tight font-bold tracking-tight text-balance drop-shadow-lg sm:text-4xl lg:text-5xl">
              {game.title}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {game.chips.map((chip) => (
                <Link
                  key={chip.href}
                  href={chip.href}
                  // the ::after extends the tap target vertically without changing the look
                  className="relative rounded-full border border-white/15 bg-black/30 px-2.5 py-0.5 text-xs font-medium text-white/85 backdrop-blur transition-all duration-200 after:absolute after:inset-x-0 after:-inset-y-2 hover:scale-105 hover:border-primary/60 hover:bg-primary/20 hover:text-primary"
                >
                  {chip.label}
                </Link>
              ))}
              {game.releaseYear && <span className="px-1 text-xs text-white/60">{game.releaseYear}</span>}
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-white/75 sm:text-base">{game.shortDescription}</p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="h-10 px-4">
                <Link href={`/games/${game.slug}`}>
                  View game
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
              {game.avgRating !== null ? (
                <span className="flex items-center gap-2 text-xs text-white/70">
                  <RatingStars rating={game.avgRating} size="sm" />
                  {game.ratingCount} {game.ratingCount === 1 ? "rating" : "ratings"}
                </span>
              ) : game.developer ? (
                <span className="text-xs text-white/60">by {game.developer}</span>
              ) : null}
            </div>
          </div>

          <Link
            href={`/games/${game.slug}`}
            aria-label={game.title}
            tabIndex={-1}
            className="relative ml-auto hidden aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-lg bg-muted shadow-2xl shadow-black/60 ring-1 ring-white/15 transition-all duration-500 group-hover/slide:-translate-y-1 group-hover/slide:rotate-1 hover:scale-105 hover:ring-2 hover:ring-primary md:block lg:w-52"
          >
            <CoverArt src={game.coverImage} sizes="208px" />
          </Link>
        </div>
      </div>
    </article>
  )
}

export function FeaturedCarouselSkeleton() {
  return (
    <div aria-hidden>
      <div className="relative aspect-[4/5] w-full animate-pulse overflow-hidden rounded-2xl bg-muted sm:aspect-[16/8] lg:aspect-[16/6.5]">
        <div className="absolute bottom-6 left-5 space-y-3 sm:top-1/2 sm:bottom-auto sm:left-10 sm:-translate-y-1/2">
          <div className="h-2.5 w-20 rounded bg-white/10" />
          <div className="h-9 w-64 rounded bg-white/10" />
          <div className="h-4 w-80 max-w-[70vw] rounded bg-white/10" />
          <div className="h-10 w-32 rounded-lg bg-white/10" />
        </div>
      </div>
      <div className="mt-2 flex h-9 items-center justify-center gap-1.5">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={cn("h-1.5 rounded-full bg-white/15", i === 0 ? "w-6" : "w-1.5")} />
        ))}
      </div>
    </div>
  )
}
