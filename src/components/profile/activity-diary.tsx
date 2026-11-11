import Image from "next/image"
import Link from "next/link"
import { BookmarkIcon, CircleCheckBigIcon, Gamepad2Icon, HeartIcon, MessageSquareTextIcon } from "lucide-react"
import { RatingStars } from "@/components/game/rating-stars"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { timeAgo } from "@/lib/format"
import type { LibraryItem } from "@/lib/profile/types"
import { cn } from "@/lib/utils"
import { CoverArt } from "./cover-art"

/** Letterboxd-style diary: recent library entries with their status icons. */
export function ActivityDiary({ items }: { items: readonly LibraryItem[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card/40">
      {items.map((item) => (
        <li key={item.game.id}>
          <Link
            href={`/games/${item.game.slug}`}
            className="group/diary flex items-center gap-3 px-3 py-2.5 transition-colors duration-200 hover:bg-accent/50 sm:px-4"
          >
            <span className="relative aspect-[2/3] w-9 shrink-0 overflow-hidden rounded bg-muted ring-1 ring-white/10 transition-all duration-300 group-hover/diary:ring-primary/70">
              <CoverArt
                src={item.game.coverImage}
                sizes="36px"
                className={cn(
                  "transition-all duration-500",
                  item.game.hoverImage !== item.game.coverImage
                    ? "group-hover/diary:opacity-0"
                    : "group-hover/diary:scale-110",
                )}
              />
              {item.game.hoverImage !== item.game.coverImage && (
                <Image
                  src={item.game.hoverImage}
                  alt=""
                  fill
                  sizes="36px"
                  className="scale-125 object-cover opacity-0 transition-all duration-500 group-hover/diary:scale-100 group-hover/diary:opacity-100"
                />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium transition-colors group-hover/diary:text-primary">
                {item.game.title}
                {item.game.releaseYear && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">{item.game.releaseYear}</span>
                )}
              </span>
              <span className="mt-0.5 flex items-center gap-2">
                {item.rating !== null ? (
                  <RatingStars rating={item.rating} size="xs" />
                ) : (
                  <span className="text-[11px] text-muted-foreground">{statusLabel(item)}</span>
                )}
              </span>
            </span>
            <StatusIcons item={item} />
            <span className="w-16 shrink-0 text-right text-[11px] leading-tight text-muted-foreground tabular-nums sm:w-20">
              {timeAgo(item.updatedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

const statusLabel = (item: LibraryItem) =>
  item.playing ? "Playing" : item.played ? "Played" : item.wishlisted ? "Wishlisted" : "Logged"

export function StatusIcons({ item }: { item: Pick<LibraryItem, "liked" | "hasReview" | "playing" | "played" | "wishlisted"> }) {
  const icons = [
    item.playing && { key: "playing", label: "Playing now", node: <Gamepad2Icon className="size-3.5 text-playing" /> },
    item.played && !item.playing && { key: "played", label: "Played", node: <CircleCheckBigIcon className="size-3.5 text-played" /> },
    item.wishlisted && { key: "wishlist", label: "On wishlist", node: <BookmarkIcon className="size-3.5 text-wishlist" fill="currentColor" /> },
    item.liked && { key: "liked", label: "Liked", node: <HeartIcon className="size-3.5 text-liked" fill="currentColor" /> },
    item.hasReview && { key: "review", label: "Reviewed", node: <MessageSquareTextIcon className="size-3.5 text-primary" /> },
  ].filter((x): x is { key: string; label: string; node: React.ReactElement } => Boolean(x))
  if (icons.length === 0) return null
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {icons.map((icon) => (
        <Tooltip key={icon.key}>
          <TooltipTrigger asChild>
            <span className="inline-flex transition-transform duration-200 hover:scale-125" aria-label={icon.label} role="img">
              {icon.node}
            </span>
          </TooltipTrigger>
          <TooltipContent>{icon.label}</TooltipContent>
        </Tooltip>
      ))}
    </span>
  )
}
