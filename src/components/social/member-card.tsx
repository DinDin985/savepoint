import Image from "next/image"
import Link from "next/link"
import { Gamepad2Icon, MessageSquareTextIcon, UsersIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/user/user-avatar"
import { formatCompact } from "@/lib/format"
import type { MemberSummary } from "@/lib/social/types"
import { cn } from "@/lib/utils"
import { CoverArt } from "@/components/profile/cover-art"
import { FollowButton } from "./follow-button"

/**
 * Member tile for /members and the feed's "who to follow": fanned-out showcase
 * covers that spread on hover, avatar, names, counters and a follow button.
 * The whole card links to the profile (stretched link) — the follow button sits above it.
 */
export function MemberCard({ member, signedIn }: { member: MemberSummary; signedIn: boolean }) {
  const href = `/u/${member.username}`
  return (
    <article className="group/member relative flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 hover-lift hover:ring-primary/40">
      <CoverFan member={member} />
      <div className="relative -mt-8 flex flex-1 flex-col items-center gap-2 px-4 pb-4 text-center">
        <UserAvatar
          user={member}
          size="lg"
          className="ring-4 ring-card transition-transform duration-300 group-hover/member:scale-110"
        />
        <div className="min-w-0 max-w-full">
          <h3 className="truncate font-semibold tracking-tight transition-colors group-hover/member:text-primary">
            <Link href={href} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
              {member.displayName}
            </Link>
          </h3>
          <p className="truncate text-xs text-muted-foreground">@{member.username}</p>
        </div>
        <dl className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <Counter icon={<Gamepad2Icon className="size-3.5" />} value={member.gamesCount} label="games" />
          <Counter icon={<MessageSquareTextIcon className="size-3.5" />} value={member.reviewsCount} label="reviews" />
          <Counter icon={<UsersIcon className="size-3.5" />} value={member.followersCount} label="followers" />
        </dl>
        <div className="relative z-10 mt-auto pt-1">
          {member.isViewer ? (
            <Badge variant="secondary" className="h-7 px-3">
              That&apos;s you
            </Badge>
          ) : (
            <FollowButton
              key={`${member.id}:${member.viewerFollows}`}
              userId={member.id}
              username={member.username}
              initialFollowing={member.viewerFollows}
              signedIn={signedIn}
              size="sm"
            />
          )}
        </div>
      </div>
    </article>
  )
}

function Counter({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1" title={`${value} ${label}`}>
      {icon}
      <dt className="sr-only">{label}</dt>
      <dd className="font-medium text-foreground tabular-nums">{formatCompact(value)}</dd>
    </div>
  )
}

/** Three overlapping covers that fan out (and zoom) when the card is hovered. */
function CoverFan({ member }: { member: MemberSummary }) {
  const covers = member.covers.slice(0, 3)
  const h = member.avatarHue
  return (
    <div
      className="relative h-32 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, oklch(0.42 0.12 ${h} / 60%), oklch(0.25 0.06 ${(h + 60) % 360} / 60%))`,
      }}
      aria-hidden
    >
      {covers.length > 0 && (
        <>
          <Image
            src={covers[0]!.hoverImage}
            alt=""
            fill
            sizes="320px"
            className="scale-110 object-cover opacity-25 blur-[2px] transition-all duration-700 group-hover/member:scale-125 group-hover/member:opacity-40"
          />
          <div className="absolute inset-0 flex items-end justify-center pb-3">
            {covers.map((g, i) => {
              const offset = i - (covers.length - 1) / 2
              return (
                <div
                  key={g.id}
                  className={cn(
                    "relative -mx-2 aspect-[2/3] w-14 overflow-hidden rounded-md bg-muted shadow-lg shadow-black/50 ring-1 ring-white/15",
                    "transition-transform duration-500 ease-out",
                    "[transform:translateY(var(--fan-y))_rotate(var(--fan-r))]",
                    "group-hover/member:[transform:translateX(var(--fan-x))_translateY(calc(var(--fan-y)_-_6px))_rotate(var(--fan-r2))]",
                  )}
                  style={
                    {
                      zIndex: offset === 0 ? 3 : 2,
                      "--fan-y": `${Math.abs(offset) * 6}px`,
                      "--fan-r": `${offset * 8}deg`,
                      "--fan-r2": `${offset * 12}deg`,
                      "--fan-x": `${offset * 14}px`,
                    } as React.CSSProperties
                  }
                >
                  <CoverArt
                    src={g.coverImage}
                    sizes="56px"
                    className="transition-transform duration-500 group-hover/member:scale-110"
                  />
                </div>
              )
            })}
          </div>
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
    </div>
  )
}
