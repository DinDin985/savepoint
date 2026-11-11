import Image from "next/image"
import Link from "next/link"
import { CalendarDaysIcon, MapPinIcon, PencilIcon } from "lucide-react"
import { FollowButton } from "@/components/social/follow-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user/user-avatar"
import { formatCompact } from "@/lib/format"
import type { Profile } from "@/lib/profile/types"
import { cn } from "@/lib/utils"

const joinedLabel = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })

/**
 * Shared header for every /u/[username] route: hero-art backdrop with a
 * gradient fade (slow zoom on hover), avatar, names, bio, meta, counters and
 * the follow / edit button.
 */
export function ProfileHeader({
  profile,
  viewerId,
  viewerFollows,
}: {
  profile: Profile
  viewerId: string | null
  viewerFollows: boolean
}) {
  const isOwn = viewerId === profile.id
  const base = `/u/${profile.username}`
  const h = profile.avatarHue
  const { stats } = profile

  return (
    <section className="group/header relative isolate">
      {/* Backdrop */}
      <div className="relative h-44 overflow-hidden sm:h-60 lg:h-72">
        {profile.banner ? (
          <Image
            src={profile.banner.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_30%] transition-transform duration-[2500ms] ease-out group-hover/header:scale-[1.06]"
          />
        ) : (
          <div
            className="absolute inset-0 transition-transform duration-[2500ms] ease-out group-hover/header:scale-[1.06]"
            style={{
              background: `radial-gradient(120% 140% at 15% 0%, oklch(0.5 0.15 ${h} / 70%), transparent 60%), radial-gradient(100% 120% at 100% 20%, oklch(0.45 0.14 ${(h + 60) % 360} / 55%), transparent 65%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/5" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/30" />
        {profile.banner && (
          <Link
            href={`/games/${profile.banner.slug}`}
            className="absolute top-3 right-4 z-10 rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white/80 opacity-0 backdrop-blur transition-all duration-300 group-hover/header:opacity-100 hover:scale-105 hover:bg-black/60 hover:text-primary focus-visible:opacity-100"
          >
            Backdrop · {profile.banner.title}
          </Link>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative -mt-16 flex flex-col gap-4 sm:-mt-20 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 items-end gap-4 sm:gap-5">
            <UserAvatar
              user={profile}
              size="xl"
              className="shadow-2xl shadow-black/60 ring-4 ring-background transition-transform duration-300 hover:scale-105 max-sm:size-20"
            />
            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{profile.displayName}</h1>
                {isOwn && (
                  <Badge variant="outline" className="font-pixel text-[10px] tracking-wider">
                    YOU
                  </Badge>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:pb-1">
            {isOwn ? (
              <Button asChild variant="secondary">
                <Link href="/settings">
                  <PencilIcon data-icon="inline-start" />
                  Edit profile
                </Link>
              </Button>
            ) : (
              <FollowButton
                key={`${profile.id}:${viewerFollows}`}
                userId={profile.id}
                username={profile.username}
                initialFollowing={viewerFollows}
                signedIn={viewerId !== null}
              />
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            {profile.bio ? (
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90 sm:text-base">{profile.bio}</p>
            ) : (
              isOwn && (
                <p className="text-sm text-muted-foreground">
                  No bio yet.{" "}
                  <Link href="/settings" className="text-primary underline-offset-4 hover:underline">
                    Tell people what you play
                  </Link>
                </p>
              )
            )}
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
              {profile.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="size-3.5" />
                  {profile.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <CalendarDaysIcon className="size-3.5" />
                Joined {joinedLabel(profile.joinedAt)}
              </span>
            </p>
          </div>

          <nav
            aria-label="Profile stats"
            className="grid grid-cols-5 divide-x divide-border rounded-xl border border-border bg-card/50 backdrop-blur sm:inline-grid sm:w-auto"
          >
            <Stat href={`${base}/games`} value={stats.games} label="Games" />
            <Stat href={`${base}/stats`} value={stats.thisYear} label="This year" />
            <Stat href={`${base}/reviews`} value={stats.reviews} label="Reviews" />
            <Stat href={`${base}/following`} value={stats.following} label="Following" />
            <Stat href={`${base}/followers`} value={stats.followers} label="Followers" />
          </nav>
        </div>
      </div>
    </section>
  )
}

function Stat({ href, value, label }: { href: string; value: number; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group/stat flex min-w-0 flex-col-reverse items-center justify-center px-1 py-2.5 text-center transition-all duration-200 first:rounded-l-xl last:rounded-r-xl sm:px-5",
        "hover:bg-accent/60",
      )}
    >
      <span className="max-w-full truncate text-[10px] font-medium text-muted-foreground uppercase transition-colors group-hover/stat:text-primary sm:text-[11px] sm:tracking-wide">
        {label}
      </span>
      <span className="text-lg font-bold tabular-nums transition-transform duration-200 group-hover/stat:scale-110 group-hover/stat:text-primary sm:text-xl">
        {formatCompact(value)}
      </span>
    </Link>
  )
}
