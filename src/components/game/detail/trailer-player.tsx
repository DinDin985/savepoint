"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { ExternalLinkIcon, FilmIcon, PlayIcon, TriangleAlertIcon } from "lucide-react"
import type { Trailer } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

export const trailerPoster = (trailer: Trailer, fallback: string | null) =>
  trailer.youtubeId
    ? `https://i.ytimg.com/vi/${encodeURIComponent(trailer.youtubeId)}/hqdefault.jpg`
    : (trailer.thumbnail ?? fallback)

/**
 * 16:9 trailer stage. Shows the poster + a play button until clicked (no autoplay).
 * Steam trailers are HLS streams: native playback where supported (Safari, iOS),
 * otherwise hls.js loaded on demand. YouTube trailers embed youtube-nocookie only
 * after the click. Re-mount (key) per trailer so players are torn down on switch.
 */
export function TrailerPlayer({
  trailer,
  fallbackPoster,
  storeUrl,
}: {
  trailer: Trailer
  fallbackPoster: string | null
  /** where to send people when a stream can't be played */
  storeUrl: string | null
}) {
  const [playing, setPlaying] = useState(false)
  const poster = trailerPoster(trailer, fallbackPoster)
  const playable = Boolean(trailer.youtubeId || trailer.hls)

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
      {playing && trailer.youtubeId ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.youtubeId)}?autoplay=1&rel=0&modestbranding=1`}
          title={trailer.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      ) : playing && trailer.hls ? (
        <HlsVideo src={trailer.hls} poster={poster} title={trailer.name} storeUrl={storeUrl} />
      ) : (
        <button
          type="button"
          onClick={() => playable && setPlaying(true)}
          disabled={!playable}
          aria-label={`Play trailer: ${trailer.name}`}
          className="group/poster absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset disabled:cursor-not-allowed"
        >
          {poster ? (
            <Image
              src={poster}
              alt=""
              fill
              sizes="(min-width: 1024px) 800px, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover/poster:scale-105"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center bg-muted">
              <FilmIcon className="size-10 text-muted-foreground" />
            </span>
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10 transition-opacity duration-300 group-hover/poster:opacity-70" />
          <span
            className={cn(
              "absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white ring-2 ring-white/70 backdrop-blur-sm sm:size-20",
              "transition-all duration-300 ease-out group-hover/poster:scale-110 group-hover/poster:bg-primary group-hover/poster:text-primary-foreground group-hover/poster:ring-primary group-hover/poster:shadow-[0_0_40px_-6px_var(--primary)]",
            )}
          >
            <PlayIcon className="ml-1 size-7 fill-current sm:size-8" />
          </span>
          <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 text-left sm:p-4">
            <span className="line-clamp-2 text-sm font-semibold text-white drop-shadow sm:text-base">{trailer.name}</span>
            <span className="shrink-0 rounded bg-black/60 px-1.5 py-0.5 font-pixel text-[9px] tracking-widest text-white/80">
              {trailer.youtubeId ? "YOUTUBE" : "TRAILER"}
            </span>
          </span>
        </button>
      )}
    </div>
  )
}

type HlsInstance = import("hls.js").default

function HlsVideo({
  src,
  poster,
  title,
  storeUrl,
}: {
  src: string
  poster: string | null
  title: string
  storeUrl: string | null
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let hls: HlsInstance | null = null
    let cancelled = false
    const play = () => {
      // the click that mounted us counts as the user gesture; if the browser still blocks it, controls are there
      video.play().catch(() => undefined)
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src
      play()
    } else {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled) return
          if (!Hls.isSupported()) {
            setFailed(true)
            return
          }
          const instance = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 20 })
          hls = instance
          instance.on(Hls.Events.MANIFEST_PARSED, play)
          instance.on(Hls.Events.ERROR, (_event, data) => {
            if (!data.fatal) return
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              instance.recoverMediaError()
              return
            }
            setFailed(true)
            instance.destroy()
            hls = null
          })
          instance.loadSource(src)
          instance.attachMedia(video)
        })
        .catch(() => {
          if (!cancelled) setFailed(true)
        })
    }

    return () => {
      cancelled = true
      hls?.destroy()
      hls = null
      video.pause()
      video.removeAttribute("src")
      video.load()
    }
  }, [src])

  return (
    <>
      <video
        ref={videoRef}
        controls
        playsInline
        preload="none"
        poster={poster ?? undefined}
        aria-label={title}
        onError={(e) => {
          if (e.currentTarget.error) setFailed(true)
        }}
        className="absolute inset-0 size-full bg-black object-contain"
      />
      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-black/85 p-6 text-center animate-in fade-in">
          <div className="space-y-3">
            <TriangleAlertIcon className="mx-auto size-8 text-star" />
            <p className="text-sm text-white/90">This trailer can&apos;t be played here right now.</p>
            {storeUrl && (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground"
              >
                Watch on the store page <ExternalLinkIcon className="size-3.5" />
              </a>
            )}
          </div>
        </div>
      )}
    </>
  )
}
