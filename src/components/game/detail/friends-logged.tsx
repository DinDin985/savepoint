import Link from "next/link"
import { BookmarkIcon, Gamepad2Icon, HeartIcon, LogInIcon, MessageSquareTextIcon, UserPlusIcon, UsersIcon } from "lucide-react"
import { RatingStars } from "@/components/game/rating-stars"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UserAvatar } from "@/components/user/user-avatar"
import { timeAgo } from "@/lib/format"
import type { FriendLog } from "@/lib/library/types"
import { cn } from "@/lib/utils"
import { friendSummary } from "./community-stats"

/** People the viewer follows who logged this game: avatar, rating and status icons. */
export function FriendsLogged({
  friends,
  gameTitle,
  signedIn,
  signInHref,
}: {
  friends: readonly FriendLog[]
  gameTitle: string
  signedIn: boolean
  signInHref: string
}) {
  if (!signedIn) {
    return (
      <Empty className="border border-dashed bg-card/40">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>See what your friends think</EmptyTitle>
          <EmptyDescription>Sign in to see who you follow has played, rated or wishlisted {gameTitle}.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="lg">
            <Link href={signInHref}>
              <LogInIcon /> Sign in
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (friends.length === 0) {
    return (
      <Empty className="border border-dashed bg-card/40">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>No friends have logged it yet</EmptyTitle>
          <EmptyDescription>Follow more players to see their ratings and reviews of games like {gameTitle}.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="lg" variant="outline">
            <Link href="/members">
              <UserPlusIcon /> Find people to follow
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-3">
      {friends.map((f) => (
        <li key={f.username}>
          <Link
            href={`/u/${f.username}`}
            title={friendSummary(f)}
            className="group/friend flex items-center gap-3 rounded-lg border border-transparent bg-card/50 p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/10 hover:bg-card"
          >
            <UserAvatar user={f} size="md" className="transition-transform duration-200 group-hover/friend:scale-110" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold transition-colors group-hover/friend:text-primary">
                {f.displayName}
              </span>
              <span className="mt-0.5 flex items-center gap-2">
                {f.rating ? (
                  <RatingStars rating={f.rating} size="xs" />
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    {f.playing ? "Playing" : f.played ? "Played" : f.wishlisted ? "Wishlisted" : "Logged"}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground/70">{timeAgo(f.updatedAt)}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {f.playing && <StatusIcon icon={Gamepad2Icon} className="text-playing" label="Playing now" />}
              {f.wishlisted && <StatusIcon icon={BookmarkIcon} className="text-wishlist" label="On their wishlist" />}
              {f.liked && <StatusIcon icon={HeartIcon} className="fill-current text-liked" label="Liked" />}
              {f.reviewed && (
                <StatusIcon
                  icon={MessageSquareTextIcon}
                  className={f.recommended ? "text-steam-blue" : "text-steam-negative"}
                  label={f.recommended ? "Recommends it" : "Doesn't recommend it"}
                />
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function StatusIcon({
  icon: Icon,
  className,
  label,
}: {
  icon: typeof HeartIcon
  className: string
  label: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Icon className={cn("size-3.5", className)} aria-hidden />
          <span className="sr-only">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
