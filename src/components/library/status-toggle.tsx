"use client"

import type { ComponentProps } from "react"
import {
  BookmarkCheckIcon,
  BookmarkIcon,
  CircleCheckIcon,
  EyeIcon,
  Gamepad2Icon,
  HeartIcon,
  type LucideIcon,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { LibraryFlag } from "@/lib/library/types"
import { cn } from "@/lib/utils"

type ToggleConfig = {
  readonly label: string
  readonly activeLabel: string
  readonly icon: LucideIcon
  readonly activeIcon: LucideIcon
  /** fill the active icon (heart / bookmark) */
  readonly fill: boolean
  readonly hint: readonly [off: string, on: string]
  /** literal class strings so Tailwind can see them */
  readonly activeClass: string
  readonly hoverClass: string
}

export const STATUS_TOGGLES: Record<LibraryFlag, ToggleConfig> = {
  played: {
    label: "Played",
    activeLabel: "Played",
    icon: EyeIcon,
    activeIcon: CircleCheckIcon,
    fill: false,
    hint: ["Mark as played", "Remove from played"],
    activeClass: "bg-played/15 text-played ring-played/40 shadow-[0_0_20px_-8px_var(--played)]",
    hoverClass: "hover:text-played hover:bg-played/10",
  },
  playing: {
    label: "Playing",
    activeLabel: "Playing",
    icon: Gamepad2Icon,
    activeIcon: Gamepad2Icon,
    fill: false,
    hint: ["I'm playing this now", "Stop playing…"],
    activeClass: "bg-playing/15 text-playing ring-playing/40 shadow-[0_0_20px_-8px_var(--playing)]",
    hoverClass: "hover:text-playing hover:bg-playing/10",
  },
  wishlisted: {
    label: "Wishlist",
    activeLabel: "Wishlisted",
    icon: BookmarkIcon,
    activeIcon: BookmarkCheckIcon,
    fill: false,
    hint: ["Add to your wishlist", "Remove from your wishlist"],
    activeClass: "bg-wishlist/15 text-wishlist ring-wishlist/40 shadow-[0_0_20px_-8px_var(--wishlist)]",
    hoverClass: "hover:text-wishlist hover:bg-wishlist/10",
  },
  liked: {
    label: "Like",
    activeLabel: "Liked",
    icon: HeartIcon,
    activeIcon: HeartIcon,
    fill: true,
    hint: ["Like this game", "Unlike"],
    activeClass: "bg-liked/15 text-liked ring-liked/40 shadow-[0_0_20px_-8px_var(--liked)]",
    hoverClass: "hover:text-liked hover:bg-liked/10",
  },
}

/**
 * One of the four colour-coded library toggles (Played / Playing / Wishlist / Like).
 * Pops its icon when switched on; lifts + scales on hover, squashes on press.
 */
export function StatusToggle({
  flag,
  active,
  disabled,
  className,
  ...props
}: { flag: LibraryFlag; active: boolean } & Omit<ComponentProps<"button">, "children">) {
  const config = STATUS_TOGGLES[flag]
  const Icon = active ? config.activeIcon : config.icon
  const button = (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        "group/toggle relative flex w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg px-1 py-2.5 text-[11px] font-semibold ring-1 ring-transparent outline-none select-none",
        "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 active:scale-90",
        "focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        active ? config.activeClass : cn("text-muted-foreground", config.hoverClass),
        className,
      )}
      {...props}
    >
      <Icon
        // re-mount on change so the "pop" animation replays
        key={active ? "on" : "off"}
        className={cn(
          "size-6 transition-transform duration-200 ease-out group-hover/toggle:scale-110",
          active && "animate-in zoom-in-50 spin-in-12 duration-300",
          active && config.fill && "fill-current",
        )}
        strokeWidth={active ? 2.25 : 1.75}
      />
      <span className="truncate">{active ? config.activeLabel : config.label}</span>
    </button>
  )
  if (disabled) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom">{config.hint[active ? 1 : 0]}</TooltipContent>
    </Tooltip>
  )
}
