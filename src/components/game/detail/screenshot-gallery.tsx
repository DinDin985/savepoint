"use client"

import Image from "next/image"
import { useRef, useState, type KeyboardEvent, type TouchEvent } from "react"
import { ChevronLeftIcon, ChevronRightIcon, MaximizeIcon, XIcon } from "lucide-react"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/** Tiles shown in the grid before collapsing the rest into a "+N" tile. */
const GRID_LIMIT = 6

/**
 * Responsive screenshot grid (hover zoom) that opens a lightbox with
 * prev / next buttons, ←/→ keys, swipe on touch screens and a counter.
 */
export function ScreenshotGallery({ screenshots, title }: { screenshots: readonly string[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null)
  const visible = screenshots.slice(0, GRID_LIMIT)
  const hidden = screenshots.length - visible.length

  return (
    <>
      <ul
        className={cn(
          "grid gap-2 sm:gap-3",
          screenshots.length === 1 ? "grid-cols-1" : screenshots.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3",
          // an odd number of tiles on the 2-column phone grid → the first one goes full width (no orphan)
          visible.length % 2 === 1 && visible.length > 1 && "[&>li:first-child]:col-span-2 sm:[&>li:first-child]:col-span-1",
        )}
      >
        {visible.map((src, i) => {
          const isMoreTile = hidden > 0 && i === visible.length - 1
          return (
            <li key={`${i}:${src}`}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={isMoreTile ? `View all ${screenshots.length} screenshots` : `View screenshot ${i + 1} of ${screenshots.length}`}
                className={cn(
                  "group/shot relative block aspect-video w-full overflow-hidden rounded-lg bg-muted ring-1 ring-white/10 outline-none",
                  "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/50 hover:ring-2 hover:ring-primary/70 focus-visible:ring-2 focus-visible:ring-primary",
                )}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover/shot:scale-110"
                />
                {isMoreTile ? (
                  <span className="absolute inset-0 grid place-items-center bg-black/60 text-lg font-bold text-white backdrop-blur-[2px] transition-colors duration-300 group-hover/shot:bg-black/40">
                    +{hidden + 1}
                  </span>
                ) : (
                  <span className="absolute right-1.5 bottom-1.5 grid size-7 scale-75 place-items-center rounded-md bg-black/60 text-white opacity-0 transition-all duration-300 group-hover/shot:scale-100 group-hover/shot:opacity-100">
                    <MaximizeIcon className="size-3.5" />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <Lightbox
        screenshots={screenshots}
        title={title}
        index={index}
        onIndexChange={setIndex}
      />
    </>
  )
}

function Lightbox({
  screenshots,
  title,
  index,
  onIndexChange,
}: {
  screenshots: readonly string[]
  title: string
  index: number | null
  onIndexChange: (index: number | null) => void
}) {
  const touchStartX = useRef<number | null>(null)
  const count = screenshots.length
  const open = index !== null
  const current = index ?? 0
  const src = screenshots[current]

  const go = (delta: number) => {
    if (index === null || count < 2) return
    onIndexChange((index + delta + count) % count)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      go(-1)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      go(1)
    } else if (e.key === "Home") {
      e.preventDefault()
      onIndexChange(0)
    } else if (e.key === "End") {
      e.preventDefault()
      onIndexChange(count - 1)
    }
  }

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStartX.current
    touchStartX.current = null
    const end = e.changedTouches[0]?.clientX
    if (start === null || end === undefined) return
    const dx = end - start
    if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <DialogContent
        onKeyDown={onKeyDown}
        showCloseButton={false}
        className="max-w-[calc(100%-1rem)] gap-0 overflow-hidden border-0 bg-black/95 p-0 ring-white/10 sm:max-w-6xl"
      >
        <DialogTitle className="sr-only">
          {title} — screenshot {current + 1} of {count}
        </DialogTitle>
        <DialogDescription className="sr-only">Use the arrow keys or the buttons to browse screenshots.</DialogDescription>

        <div className="relative aspect-video w-full select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {src && (
            <Image
              key={src}
              src={src}
              alt={`${title} screenshot ${current + 1}`}
              fill
              sizes="(min-width: 1152px) 1152px, 100vw"
              className="object-contain animate-in fade-in-0 zoom-in-95 duration-300"
            />
          )}

          <span className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-1 font-pixel text-[10px] tracking-widest text-white/90 tabular-nums">
            {current + 1} / {count}
          </span>

          <DialogClose
            aria-label="Close"
            className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-black/70 text-white ring-1 ring-white/20 backdrop-blur-sm transition-all duration-200 outline-none hover:scale-110 hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-primary"
          >
            <XIcon className="size-4" />
          </DialogClose>

          {count > 1 && (
            <>
              <LightboxNav side="left" onClick={() => go(-1)} />
              <LightboxNav side="right" onClick={() => go(1)} />
            </>
          )}
        </div>

        {count > 1 && (
          <div className="hidden gap-1.5 overflow-x-auto bg-black p-2 scrollbar-none sm:flex">
            {screenshots.map((s, i) => (
              <button
                key={`${i}:${s}`}
                type="button"
                onClick={() => onIndexChange(i)}
                aria-label={`Show screenshot ${i + 1}`}
                aria-current={i === current}
                className={cn(
                  "relative aspect-video w-24 shrink-0 overflow-hidden rounded ring-1 transition-all duration-200 hover:scale-105",
                  i === current ? "opacity-100 ring-2 ring-primary" : "opacity-50 ring-white/10 hover:opacity-100",
                )}
              >
                <Image src={s} alt="" fill sizes="96px" className="object-cover transition-transform duration-300 hover:scale-110" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function LightboxNav({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeftIcon : ChevronRightIcon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous screenshot" : "Next screenshot"}
      className={cn(
        "absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/20 backdrop-blur-sm sm:size-12",
        "transition-all duration-200 hover:scale-110 hover:bg-primary hover:text-primary-foreground hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        side === "left" ? "left-2 sm:left-3" : "right-2 sm:right-3",
      )}
    >
      <Icon className="size-5 sm:size-6" />
    </button>
  )
}
