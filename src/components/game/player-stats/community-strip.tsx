import type { ReactNode } from "react"
import Link from "next/link"
import { BookmarkIcon, CircleCheckIcon, Gamepad2Icon, StarIcon } from "lucide-react"
import { RatingStars } from "@/components/game/rating-stars"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatNumber } from "@/lib/format"
import type { GameCommunityStats } from "@/lib/stats/game-community"

function Chip({ icon, value, label, tooltip }: { icon: ReactNode; value: ReactNode; label: string; tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <li
          tabIndex={0}
          className="group/chip flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 ring-1 ring-white/5 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/70 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary"
        >
          {icon}
          <span className="font-semibold tabular-nums transition-colors group-hover/chip:text-primary">{value}</span>
          <span className="truncate text-xs text-muted-foreground">{label}</span>
        </li>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-60 text-pretty">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Compact "On Savepoint" row shown under the Steam numbers. Signed-out visitors
 * (`signInHref` set) get a nudge to sign in and add their own log.
 */
export function CommunityStrip({ stats, signInHref }: { stats: GameCommunityStats; signInHref?: string | null }) {
  return (
    <section aria-label="Savepoint community" className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-pixel text-[10px] tracking-widest text-muted-foreground uppercase">On Savepoint</h3>
        {signInHref && (
          <Link
            href={signInHref}
            className="text-xs font-medium text-primary underline-offset-4 transition-colors hover:underline"
          >
            Sign in to add yours
          </Link>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-2 @lg:grid-cols-4">
        <Chip
          icon={<Gamepad2Icon className="size-4 shrink-0 text-playing" aria-hidden />}
          value={formatNumber(stats.playing)}
          label="playing"
          tooltip="Savepoint members who've marked this game as currently playing."
        />
        <Chip
          icon={<CircleCheckIcon className="size-4 shrink-0 text-played" aria-hidden />}
          value={formatNumber(stats.played)}
          label="played"
          tooltip="Members who've logged this game as played."
        />
        <Chip
          icon={<BookmarkIcon className="size-4 shrink-0 text-wishlist" aria-hidden />}
          value={formatNumber(stats.wishlisted)}
          label="wishlisted"
          tooltip="Members who want to play it next."
        />
        <Chip
          icon={<StarIcon className="size-4 shrink-0 text-star" fill="currentColor" strokeWidth={0} aria-hidden />}
          value={stats.avgRating === null ? "—" : <RatingStars rating={stats.avgRating} size="xs" />}
          label={stats.ratings === 1 ? "1 rating" : `${formatNumber(stats.ratings)} ratings`}
          tooltip="Average member rating (half-star scale)."
        />
      </ul>
    </section>
  )
}
