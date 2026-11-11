"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Horizontal, snap-scrolling strip of posters. Touch users swipe; pointer users
 * get arrow buttons that appear on hover. Edges fade when more content exists.
 */
export function ScrollRow({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const update = () => {
      const start = el.scrollLeft <= 4
      const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    // ResizeObserver fires once on observe, which also performs the initial measurement.
    const observer = new ResizeObserver(update)
    observer.observe(el)
    el.addEventListener("scroll", update, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener("scroll", update)
    }
  }, [])

  const scrollBy = (direction: 1 | -1) => {
    const el = scroller.current
    if (!el) return
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 200), behavior: "smooth" })
  }

  return (
    <div className={cn("group/row relative", className)}>
      <div
        ref={scroller}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={cn(
          "scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 py-3 outline-none sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6",
          "focus-visible:ring-2 focus-visible:ring-ring/50 *:snap-start",
        )}
      >
        {children}
      </div>

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 -left-4 w-10 bg-gradient-to-r from-background to-transparent transition-opacity duration-300 sm:-left-6",
          edges.start ? "opacity-0" : "opacity-100",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 -right-4 w-10 bg-gradient-to-l from-background to-transparent transition-opacity duration-300 sm:-right-6",
          edges.end ? "opacity-0" : "opacity-100",
        )}
      />

      <ArrowButton side="left" hidden={edges.start} onClick={() => scrollBy(-1)} />
      <ArrowButton side="right" hidden={edges.end} onClick={() => scrollBy(1)} />
    </div>
  )
}

function ArrowButton({ side, hidden, onClick }: { side: "left" | "right"; hidden: boolean; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeftIcon : ChevronRightIcon
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      aria-label={side === "left" ? "Scroll left" : "Scroll right"}
      className={cn(
        "absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-background/80 text-foreground shadow-lg backdrop-blur md:flex",
        "opacity-0 transition-all duration-200 group-hover/row:opacity-100 hover:scale-110 hover:border-primary/60 hover:bg-primary hover:text-primary-foreground",
        side === "left" ? "-left-3" : "-right-3",
        hidden && "pointer-events-none group-hover/row:opacity-0",
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}
