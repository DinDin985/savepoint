"use client"

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react"
import { StarIcon, XIcon } from "lucide-react"
import { ratingToStars } from "@/lib/format"
import { cn } from "@/lib/utils"

const starSize = {
  md: "size-6",
  lg: "size-8",
} as const

/** Keyboard edits are committed after this idle time (so arrowing through values = one save). */
const KEYBOARD_COMMIT_MS = 550

/**
 * Interactive 5-star rating on the 1–10 half-star scale.
 *
 * - Pointer: hover previews half / full stars (left / right half of a star), click sets.
 *   Clicking the current value — or the × button — removes the rating.
 * - Keyboard (`role="slider"`): ←/↓ −½, →/↑ +½, Home ½★, End 5★, 1–5 full stars,
 *   Delete / Backspace / 0 clears.
 */
export function RatingInput({
  value,
  onChange,
  disabled = false,
  size = "lg",
  label = "Your rating",
  className,
  showReadout = true,
}: {
  value: number | null
  onChange: (rating: number | null) => void
  disabled?: boolean
  size?: keyof typeof starSize
  label?: string
  className?: string
  showReadout?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  /** keyboard value not committed yet (undefined = none pending) */
  const [draft, setDraft] = useState<number | null | undefined>(undefined)
  const timer = useRef<number | undefined>(undefined)
  // the debounced keyboard commit runs later: read the latest props, not the ones from the keypress render
  const latest = useRef({ value, onChange })
  useEffect(() => {
    latest.current = { value, onChange }
  })

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const current = draft === undefined ? value : draft
  const display = hover ?? current ?? 0

  const fromPointer = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
    return Math.min(10, Math.max(1, Math.ceil(ratio * 10)))
  }

  const commit = (next: number | null) => {
    window.clearTimeout(timer.current)
    setDraft(undefined)
    if (next !== latest.current.value) latest.current.onChange(next)
  }

  const scheduleCommit = (next: number | null) => {
    setDraft(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => commit(next), KEYBOARD_COMMIT_MS)
  }

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    const next = fromPointer(e.clientX, e.currentTarget)
    commit(next === value ? null : next)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.pointerType === "touch") return
    setHover(fromPointer(e.clientX, e.currentTarget))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const base = current ?? 0
    let next: number | null | undefined
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = Math.min(10, base + 1)
        break
      case "ArrowLeft":
      case "ArrowDown":
        next = base - 1 <= 0 ? null : base - 1
        break
      case "Home":
        next = 1
        break
      case "End":
        next = 10
        break
      case "Delete":
      case "Backspace":
      case "0":
        next = null
        break
      default:
        if (/^[1-5]$/.test(e.key)) next = Number(e.key) * 2
    }
    if (next === undefined) return
    e.preventDefault()
    scheduleCommit(next)
  }

  const previewing = hover !== null
  const hoveredStar = hover === null ? -1 : Math.ceil(hover / 2) - 1

  let readout: string
  if (previewing) readout = hover === value ? "Click to remove" : ratingToStars(hover)
  else if (current) readout = `Rated ${ratingToStars(current)}`
  else readout = disabled ? "Not rated" : "Rate it"

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="flex items-center gap-1">
        <span aria-hidden className="size-9 shrink-0" />
        <div
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={(current ?? 0) / 2}
          aria-valuetext={current ? `${current / 2} out of 5 stars` : "Not rated"}
          aria-disabled={disabled || undefined}
          onClick={handleClick}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (draft !== undefined) commit(draft)
          }}
          className={cn(
            "inline-grid grid-cols-5 rounded-md outline-none select-none touch-manipulation",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          )}
        >
          {Array.from({ length: 5 }, (_, i) => {
            const fill = Math.max(0, Math.min(2, display - i * 2))
            return (
              <span
                key={i}
                aria-hidden
                className={cn(
                  "relative block px-0.5 py-0.5 transition-transform duration-150 ease-out",
                  i === hoveredStar && "scale-125",
                )}
              >
                <StarIcon className={cn(starSize[size], "text-white/15")} fill="currentColor" strokeWidth={0} />
                {fill > 0 && (
                  <StarIcon
                    className={cn(
                      starSize[size],
                      "absolute top-0.5 left-0.5 text-star transition-[filter] duration-150",
                      previewing && "drop-shadow-[0_0_6px_var(--star)]",
                    )}
                    style={fill === 1 ? { clipPath: "inset(0 50% 0 0)" } : undefined}
                    fill="currentColor"
                    strokeWidth={0}
                  />
                )}
              </span>
            )
          })}
        </div>
        {!disabled && current !== null ? (
          <button
            type="button"
            onClick={() => commit(null)}
            aria-label="Remove rating"
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-all duration-200 hover:scale-110 hover:bg-destructive/15 hover:text-destructive animate-in fade-in zoom-in-75"
          >
            <XIcon className="size-4" />
          </button>
        ) : (
          // keeps the stars from shifting when the clear button appears
          <span aria-hidden className="size-9 shrink-0" />
        )}
      </div>
      {showReadout && (
        <p
          aria-live="polite"
          className={cn(
            "min-h-5 text-xs font-medium tabular-nums transition-colors",
            previewing || current ? "text-star" : "text-muted-foreground",
          )}
        >
          {readout}
        </p>
      )}
    </div>
  )
}
