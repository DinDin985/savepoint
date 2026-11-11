import Link from "next/link"
import { browseHref, type BrowseFilters } from "@/lib/catalog/params"
import { cn } from "@/lib/utils"

const PICKS: readonly { label: string; filters: Partial<BrowseFilters>; accent?: boolean }[] = [
  { label: "Nintendo", filters: { platform: "nintendo" }, accent: true },
  { label: "Indie", filters: { tier: "indie" } },
  { label: "Triple-A", filters: { tier: "aaa" } },
  { label: "Pixel art", filters: { artStyles: ["pixel-art"] } },
  { label: "Roguelike", filters: { genres: ["roguelike"] } },
  { label: "Soulslike", filters: { genres: ["soulslike"] } },
  { label: "Open world", filters: { genres: ["open-world"] } },
  { label: "Party", filters: { genres: ["party"] } },
  { label: "Newest", filters: { sort: "newest" } },
]

/** One-tap starting points shown when no filters are active. */
export function QuickPicks({ className }: { className?: string }) {
  return (
    <div className={cn("scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0", className)}>
      <span className="shrink-0 font-pixel text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Try</span>
      {PICKS.map((pick) => (
        <Link
          key={pick.label}
          href={browseHref(pick.filters)}
          className={cn(
            "inline-flex h-9 shrink-0 items-center rounded-full border border-white/10 bg-card/60 px-3 text-xs font-medium transition-all duration-200 sm:h-8",
            "hover:scale-105 hover:border-primary/50 hover:bg-primary/10 hover:text-primary",
            pick.accent && "border-liked/40 bg-liked/10 text-liked hover:border-liked/70 hover:bg-liked/20 hover:text-liked",
          )}
        >
          {pick.label}
        </Link>
      ))}
    </div>
  )
}
