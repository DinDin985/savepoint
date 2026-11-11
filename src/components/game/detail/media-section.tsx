"use client"

import Image from "next/image"
import { useState } from "react"
import { ImageOffIcon, PlayIcon, SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { Trailer } from "@/lib/db/schema"
import { cn } from "@/lib/utils"
import { ScreenshotGallery } from "./screenshot-gallery"
import { TrailerPlayer, trailerPoster } from "./trailer-player"

/**
 * Trailers (HLS / YouTube player + thumbnail strip to switch) and the
 * screenshot grid with lightbox. Nintendo / Wikipedia games often have only a
 * couple of screenshots and YouTube trailers — or none — so every part degrades
 * gracefully, down to an empty state that points to YouTube.
 */
export function MediaSection({
  title,
  trailers,
  screenshots,
  fallbackPoster,
  storeUrl,
}: {
  title: string
  trailers: readonly Trailer[]
  screenshots: readonly string[]
  fallbackPoster: string | null
  storeUrl: string | null
}) {
  const [active, setActive] = useState(0)
  const playable = trailers.filter((t) => t.hls || t.youtubeId)
  const current = playable[Math.min(active, playable.length - 1)]
  const youtubeSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer`)}`

  if (playable.length === 0 && screenshots.length === 0) {
    return (
      <Empty className="border border-dashed bg-card/40">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ImageOffIcon />
          </EmptyMedia>
          <EmptyTitle>No trailers or screenshots yet</EmptyTitle>
          <EmptyDescription>We haven&apos;t captured any media for {title}.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline" size="lg">
            <a href={youtubeSearch} target="_blank" rel="noopener noreferrer">
              <SearchIcon /> Find trailers on YouTube
            </a>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="space-y-6">
      {current ? (
        <div className="space-y-3">
          {/* key → a new player per trailer, so the previous hls.js instance / iframe is torn down */}
          <TrailerPlayer
            key={`${active}:${current.hls ?? current.youtubeId}`}
            trailer={current}
            fallbackPoster={fallbackPoster}
            storeUrl={storeUrl}
          />
          {playable.length > 1 && (
            <ul className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pt-1 pb-2 scrollbar-none" aria-label="Trailers">
              {playable.map((trailer, i) => {
                const poster = trailerPoster(trailer, fallbackPoster)
                const selected = trailer === current
                return (
                  <li key={`${i}:${trailer.name}`} className="snap-start">
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      aria-current={selected}
                      className={cn(
                        "group/thumb w-36 text-left outline-none sm:w-44",
                        "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105",
                      )}
                    >
                      <span
                        className={cn(
                          "relative block aspect-video overflow-hidden rounded-md bg-muted ring-1 transition-all duration-200",
                          selected ? "ring-2 ring-primary" : "ring-white/10 group-hover/thumb:ring-white/40 group-focus-visible/thumb:ring-primary",
                        )}
                      >
                        {poster && (
                          <Image
                            src={poster}
                            alt=""
                            fill
                            sizes="176px"
                            className={cn(
                              "object-cover transition-all duration-500 group-hover/thumb:scale-110",
                              !selected && "opacity-70 group-hover/thumb:opacity-100",
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            "absolute inset-0 grid place-items-center transition-opacity duration-200",
                            selected ? "opacity-0" : "opacity-0 group-hover/thumb:opacity-100",
                          )}
                        >
                          <span className="grid size-8 place-items-center rounded-full bg-black/60 text-white">
                            <PlayIcon className="ml-0.5 size-4 fill-current" />
                          </span>
                        </span>
                        {selected && (
                          <span className="absolute top-1 left-1 rounded bg-primary px-1 py-0.5 font-pixel text-[8px] tracking-widest text-primary-foreground">
                            NOW
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "mt-1 line-clamp-1 text-xs transition-colors",
                          selected ? "font-semibold text-foreground" : "text-muted-foreground group-hover/thumb:text-foreground",
                        )}
                      >
                        {trailer.name}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <span>No trailers captured for {title} yet.</span>
          <Button asChild variant="ghost" size="lg">
            <a href={youtubeSearch} target="_blank" rel="noopener noreferrer">
              <SearchIcon /> Search YouTube
            </a>
          </Button>
        </div>
      )}

      {screenshots.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            Screenshots <span className="font-normal tabular-nums">· {screenshots.length}</span>
          </h3>
          <ScreenshotGallery screenshots={screenshots} title={title} />
        </div>
      )}
    </div>
  )
}
