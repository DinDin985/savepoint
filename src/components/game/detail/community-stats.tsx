import Link from "next/link"
import { BookmarkIcon, EyeIcon, Gamepad2Icon, HeartIcon, MessageSquareTextIcon, StarIcon, type LucideIcon } from "lucide-react"
import { RatingStars } from "@/components/game/rating-stars"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UserAvatar } from "@/components/user/user-avatar"
import { formatCompact, formatNumber, ratingToStars } from "@/lib/format"
import { LIBRARY_PANEL_ID, type CommunityStats, type FriendLog } from "@/lib/library/types"
import { cn } from "@/lib/utils"

const FRIEND_AVATARS = 8

/**
 * Letterboxd-style community block: big average, ½★…5★ histogram with
 * tooltips, status counts and the avatars of friends who logged the game.
 */
export function CommunityStatsBlock({
  stats,
  friends,
  gameTitle,
  signedIn,
  signInHref,
}: {
  stats: CommunityStats
  friends: readonly FriendLog[]
  gameTitle: string
  signedIn: boolean
  signInHref: string
}) {
  const max = Math.max(1, ...stats.histogram)
  const hasRatings = stats.ratingCount > 0
  const recommendedPct = stats.reviews > 0 ? Math.round((stats.recommended / stats.reviews) * 100) : null

  return (
    <div className="space-y-5 rounded-xl border bg-card/60 p-4 sm:p-5">
      <div className="grid items-end gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8">
        <div className="flex items-end gap-4 sm:block">
          {hasRatings && stats.avgRating !== null ? (
            <>
              <p className="text-5xl leading-none font-bold tracking-tight tabular-nums">
                {(stats.avgRating / 2).toFixed(1)}
                <span className="ml-1 text-lg font-medium text-muted-foreground">/ 5</span>
              </p>
              <div className="space-y-1 sm:mt-2">
                <RatingStars rating={stats.avgRating} size="md" />
                <p className="text-xs text-muted-foreground">
                  {formatNumber(stats.ratingCount)} rating{stats.ratingCount === 1 ? "" : "s"}
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <StarIcon className="size-4 text-star" /> No ratings yet
              </p>
              <p className="max-w-56 text-xs text-muted-foreground">Be the first to rate {gameTitle}.</p>
              <Button asChild size="lg" variant="outline">
                <Link href={signedIn ? `#${LIBRARY_PANEL_ID}` : signInHref}>{signedIn ? "Rate it" : "Sign in to rate"}</Link>
              </Button>
            </div>
          )}
        </div>

        <div>
          <div
            className="flex h-24 items-end gap-[3px] sm:h-28"
            role="group"
            aria-label={`Rating distribution for ${gameTitle}`}
          >
            {stats.histogram.map((n, i) => {
              const rating = i + 1
              const pct = hasRatings ? Math.round((n / stats.ratingCount) * 100) : 0
              const height = n === 0 ? 4 : Math.max(8, (n / max) * 100)
              return (
                <Tooltip key={rating}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`${ratingToStars(rating)}: ${formatNumber(n)} rating${n === 1 ? "" : "s"} (${pct}%)`}
                      className="group/bar flex h-full min-w-0 flex-1 cursor-default items-end rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        className={cn(
                          "block w-full origin-bottom rounded-t-[3px] transition-all duration-200 ease-out",
                          "group-hover/bar:scale-x-110 group-hover/bar:bg-star group-hover/bar:shadow-[0_0_14px_-2px_var(--star)] group-focus-visible/bar:bg-star",
                          n === 0 ? "bg-white/10" : "bg-muted-foreground/45",
                        )}
                        style={{ height: `${height}%` }}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span className="font-semibold">{ratingToStars(rating)}</span>
                    <span className="opacity-70">
                      {formatNumber(n)} rating{n === 1 ? "" : "s"} · {pct}%
                    </span>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-star">
            <span>½★</span>
            <span>★★★★★</span>
          </div>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:grid-cols-5">
        <StatTile icon={EyeIcon} tone="text-played" value={stats.played} label="Played" />
        <StatTile icon={Gamepad2Icon} tone="text-playing" value={stats.playing} label="Playing now" />
        <StatTile icon={BookmarkIcon} tone="text-wishlist" value={stats.wishlisted} label="Wishlists" />
        <StatTile icon={HeartIcon} tone="text-liked" value={stats.liked} label="Likes" />
        <StatTile
          icon={MessageSquareTextIcon}
          tone="text-steam-blue"
          value={stats.reviews}
          label={recommendedPct === null ? "Reviews" : `Reviews · ${recommendedPct}% positive`}
          href="#reviews"
        />
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
        <p className="text-xs font-semibold text-muted-foreground">Friends</p>
        {!signedIn ? (
          <Link
            href={signInHref}
            className="inline-flex min-h-9 items-center text-xs font-medium text-primary transition-all hover:scale-105 hover:underline"
          >
            Sign in to see what your friends think
          </Link>
        ) : friends.length === 0 ? (
          <Link
            href="/members"
            className="inline-flex min-h-9 items-center text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            None of the people you follow have logged it — find more players
          </Link>
        ) : (
          <div className="flex items-center">
            <ul className="flex -space-x-1.5">
              {friends.slice(0, FRIEND_AVATARS).map((f) => (
                <li key={f.username}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/u/${f.username}`}
                        className="relative block rounded-full ring-2 ring-card transition-all duration-200 hover:z-10 hover:-translate-y-0.5 hover:scale-125 hover:ring-primary"
                      >
                        <UserAvatar user={f} size="xs" />
                        <span className="sr-only">{f.displayName}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>{friendSummary(f)}</TooltipContent>
                  </Tooltip>
                </li>
              ))}
            </ul>
            {friends.length > FRIEND_AVATARS && (
              <a
                href="#friends"
                className="ml-1 inline-flex min-h-9 min-w-9 items-center justify-center rounded-full text-xs text-muted-foreground transition-all hover:scale-110 hover:bg-muted hover:text-primary"
              >
                +{friends.length - FRIEND_AVATARS}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** "Alex · ★★★½ · liked · playing" */
export function friendSummary(f: FriendLog): string {
  const bits = [f.displayName]
  if (f.rating) bits.push(ratingToStars(f.rating))
  if (f.liked) bits.push("liked")
  if (f.playing) bits.push("playing now")
  else if (f.played && !f.rating) bits.push("played")
  if (f.wishlisted) bits.push("wishlisted")
  if (f.reviewed) bits.push(f.recommended ? "recommends it" : "reviewed")
  return bits.join(" · ")
}

function StatTile({
  icon: Icon,
  tone,
  value,
  label,
  href,
}: {
  icon: LucideIcon
  tone: string
  value: number
  label: string
  href?: string
}) {
  const body = (
    <>
      <Icon className={cn("size-4 transition-transform duration-200 group-hover/tile:scale-125", tone)} />
      <span className="text-lg leading-none font-bold tabular-nums">{formatCompact(value)}</span>
      <span className="truncate text-[11px] text-muted-foreground">{label}</span>
    </>
  )
  const className =
    "group/tile flex flex-col items-start gap-1.5 rounded-lg bg-muted/40 p-3 ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-muted hover:ring-white/10"
  return (
    <li>
      {href ? (
        <a href={href} className={cn(className, "w-full")}>
          {body}
        </a>
      ) : (
        <div className={className}>{body}</div>
      )}
    </li>
  )
}
