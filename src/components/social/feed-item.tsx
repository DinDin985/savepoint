import Link from "next/link"
import {
  BookmarkIcon,
  CircleCheckBigIcon,
  EyeOffIcon,
  Gamepad2Icon,
  HeartIcon,
  MessageSquareTextIcon,
  StarIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  TrophyIcon,
  UserPlusIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { GameCard } from "@/components/game/game-card"
import { CoverArt } from "@/components/profile/cover-art"
import { RatingStars } from "@/components/game/rating-stars"
import { UserAvatar } from "@/components/user/user-avatar"
import type { ActivityKind } from "@/lib/db/schema"
import type { PublicUser } from "@/lib/profile/types"
import type { FeedItem } from "@/lib/social/types"
import { cn } from "@/lib/utils"

const kindMeta: Record<ActivityKind, { icon: typeof StarIcon; className: string; label: string }> = {
  rated: { icon: StarIcon, className: "text-star bg-star/10", label: "Rating" },
  reviewed: { icon: MessageSquareTextIcon, className: "text-primary bg-primary/10", label: "Review" },
  played: { icon: CircleCheckBigIcon, className: "text-played bg-played/10", label: "Played" },
  playing: { icon: Gamepad2Icon, className: "text-playing bg-playing/10", label: "Playing" },
  wishlisted: { icon: BookmarkIcon, className: "text-wishlist bg-wishlist/10", label: "Wishlist" },
  liked: { icon: HeartIcon, className: "text-liked bg-liked/10", label: "Like" },
  followed: { icon: UserPlusIcon, className: "text-foreground bg-foreground/10", label: "Follow" },
  top_games: { icon: TrophyIcon, className: "text-star bg-star/10", label: "Top 10" },
}

function UserLink({ user, viewerId }: { user: PublicUser; viewerId: string }) {
  return (
    <Link
      href={`/u/${user.username}`}
      className="font-semibold text-foreground transition-colors duration-200 hover:text-primary hover:underline underline-offset-4"
    >
      {user.id === viewerId ? "You" : user.displayName}
    </Link>
  )
}

function GameLink({ item }: { item: FeedItem }) {
  if (!item.game) return null
  return (
    <Link
      href={`/games/${item.game.slug}`}
      className="font-semibold text-foreground transition-colors duration-200 hover:text-primary hover:underline underline-offset-4"
    >
      {item.game.title}
    </Link>
  )
}

function Sentence({ item, viewerId }: { item: FeedItem; viewerId: string }) {
  const actor = <UserLink user={item.actor} viewerId={viewerId} />
  const game = <GameLink item={item} />
  const parts: Record<ActivityKind, ReactNode> = {
    rated: (
      <>
        {actor} rated {game}
      </>
    ),
    reviewed: (
      <>
        {actor} reviewed {game}
      </>
    ),
    played: (
      <>
        {actor} played {game}
      </>
    ),
    playing: (
      <>
        {actor} started playing {game}
      </>
    ),
    wishlisted: (
      <>
        {actor} wishlisted {game}
      </>
    ),
    liked: (
      <>
        {actor} liked {game}
      </>
    ),
    followed: (
      <>
        {actor} followed{" "}
        {item.target ? (
          item.target.id === viewerId ? (
            <span className="font-semibold text-primary">you</span>
          ) : (
            <UserLink user={item.target} viewerId={viewerId} />
          )
        ) : (
          "someone"
        )}
      </>
    ),
    top_games: (
      <>
        {actor} updated {item.actor.id === viewerId ? "your" : "their"}{" "}
        <Link
          href={`/u/${item.actor.username}`}
          className="font-semibold text-foreground transition-colors hover:text-primary hover:underline underline-offset-4"
        >
          Top 10
        </Link>
      </>
    ),
  }
  return <p className="text-sm leading-relaxed text-muted-foreground">{parts[item.kind]}</p>
}

/** One activity in the friends feed: avatar, sentence with links, extras, small poster. */
export function FeedItemView({ item, viewerId }: { item: FeedItem; viewerId: string }) {
  const meta = kindMeta[item.kind]
  const Icon = meta.icon
  return (
    <li className="group/feed relative flex gap-3 rounded-xl border border-transparent p-3 transition-all duration-200 hover:border-border hover:bg-card/70 sm:gap-4 sm:p-4">
      <Link
        href={`/u/${item.actor.username}`}
        className="relative h-fit shrink-0 rounded-full transition-transform duration-200 hover:scale-110"
        aria-label={item.actor.displayName}
      >
        <UserAvatar user={item.actor} size="md" />
        <span
          className={cn(
            "absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full ring-2 ring-background",
            meta.className,
          )}
          aria-hidden
        >
          <Icon className="size-3" fill={item.kind === "liked" || item.kind === "rated" ? "currentColor" : "none"} />
        </span>
      </Link>

      <div className="min-w-0 flex-1 space-y-1.5">
        <Sentence item={item} viewerId={viewerId} />

        {item.kind === "rated" && item.rating !== null && <RatingStars rating={item.rating} size="sm" />}

        {item.kind === "reviewed" && item.review && (
          <Link
            href={item.game ? `/games/${item.game.slug}#reviews` : "#"}
            className="group/snippet block rounded-lg border-l-2 border-primary/40 bg-muted/40 px-3 py-2 transition-colors duration-200 hover:border-primary hover:bg-muted/70"
          >
            <span className="mb-1 flex items-center gap-2 text-xs font-medium">
              {item.review.recommended ? (
                <span className="inline-flex items-center gap-1 text-steam-blue">
                  <ThumbsUpIcon className="size-3.5" /> Recommended
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <ThumbsDownIcon className="size-3.5" /> Not recommended
                </span>
              )}
              {item.rating !== null && <RatingStars rating={item.rating} size="xs" />}
              {item.review.containsSpoilers && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <EyeOffIcon className="size-3" /> Spoilers
                </span>
              )}
            </span>
            <span
              className={cn(
                "line-clamp-2 text-sm text-foreground/85 transition-[filter] duration-300",
                item.review.containsSpoilers && "blur-[3px] group-hover/snippet:blur-none group-focus-visible/snippet:blur-none",
              )}
            >
              {item.review.snippet}
            </span>
          </Link>
        )}

        {item.kind === "top_games" && item.topGames.length > 0 && (
          <div className="flex gap-1.5 pt-0.5">
            {item.topGames.map((g, i) => (
              <Link
                key={g.id}
                href={`/games/${g.slug}`}
                className="group/mini relative aspect-[2/3] w-9 overflow-hidden rounded bg-muted ring-1 ring-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 hover:ring-primary sm:w-11"
                title={`#${i + 1} ${g.title}`}
              >
                <CoverArt
                  src={g.coverImage}
                  alt={g.title}
                  sizes="44px"
                  className="transition-transform duration-300 group-hover/mini:scale-110"
                />
                <span className="absolute top-0 left-0.5 font-pixel text-[10px] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                  {i + 1}
                </span>
              </Link>
            ))}
          </div>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
          <time dateTime={new Date(item.createdAt).toISOString()}>{item.timeLabel}</time>
          <span aria-hidden>·</span>
          <span>{meta.label}</span>
        </p>
      </div>

      {item.game && <GameCard game={item.game} size="xs" showMeta={false} className="self-start" />}
      {!item.game && item.kind === "followed" && item.target && (
        <Link
          href={`/u/${item.target.username}`}
          className="self-start rounded-full transition-transform duration-200 hover:scale-110"
          aria-label={item.target.displayName}
        >
          <UserAvatar user={item.target} size="lg" />
        </Link>
      )}
    </li>
  )
}
