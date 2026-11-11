import { Gamepad2Icon, HeartIcon, MessageSquareTextIcon } from "lucide-react"
import { GameCard } from "@/components/game/game-card"
import { timeAgo } from "@/lib/format"
import type { LibraryItem } from "@/lib/profile/types"
import { cn } from "@/lib/utils"

/** Poster grid for a user's library, with their rating under each poster. */
export function LibraryGrid({
  items,
  showRating = true,
  caption,
  className,
}: {
  items: readonly LibraryItem[]
  showRating?: boolean
  /** extra line under each poster */
  caption?: "playing-since" | "added"
  className?: string
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4 md:grid-cols-5 lg:grid-cols-6",
        className,
      )}
    >
      {items.map((item, i) => (
        <li key={item.game.id} className="min-w-0">
          <GameCard
            game={item.game}
            fluid
            priority={i < 6}
            userRating={showRating ? item.rating : undefined}
            badge={<Badges item={item} />}
          />
          {caption && (
            <p className="mt-1 truncate text-center text-[11px] text-muted-foreground">
              {caption === "playing-since"
                ? `Since ${timeAgo(item.startedPlayingAt ?? item.updatedAt)}`
                : `Added ${timeAgo(item.updatedAt)}`}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

function Badges({ item }: { item: LibraryItem }) {
  const marks = [
    item.playing && <Gamepad2Icon key="p" className="size-3 text-playing" aria-label="Playing" />,
    item.liked && <HeartIcon key="l" className="size-3 text-liked" fill="currentColor" aria-label="Liked" />,
    item.hasReview && <MessageSquareTextIcon key="r" className="size-3 text-primary" aria-label="Reviewed" />,
  ].filter(Boolean)
  if (marks.length === 0) return null
  return (
    <span className="flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-1 backdrop-blur-sm">{marks}</span>
  )
}
