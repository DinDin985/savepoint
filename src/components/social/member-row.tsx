import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/user/user-avatar"
import { formatCompact } from "@/lib/format"
import type { MemberSummary } from "@/lib/social/types"
import { CoverArt } from "@/components/profile/cover-art"
import { FollowButton } from "./follow-button"

/** Compact member row for follower / following lists. */
export function MemberRow({ member, signedIn }: { member: MemberSummary; signedIn: boolean }) {
  const href = `/u/${member.username}`
  return (
    <li className="group/row relative flex items-center gap-3 rounded-xl border border-transparent bg-card/60 p-3 transition-all duration-200 hover:border-primary/30 hover:bg-card sm:gap-4 sm:p-4">
      <UserAvatar user={member} size="md" className="transition-transform duration-200 group-hover/row:scale-110 sm:size-12" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <Link
            href={href}
            className="truncate font-semibold tracking-tight outline-none transition-colors after:absolute after:inset-0 after:content-[''] group-hover/row:text-primary focus-visible:underline"
          >
            {member.displayName}
          </Link>
          <span className="truncate text-xs text-muted-foreground">@{member.username}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatCompact(member.gamesCount)} games · {formatCompact(member.reviewsCount)} reviews ·{" "}
          {formatCompact(member.followersCount)} followers
        </p>
        {member.bio && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground/90">{member.bio}</p>}
      </div>
      {member.covers.length > 0 && (
        <div className="hidden shrink-0 -space-x-3 md:flex" aria-hidden>
          {member.covers.slice(0, 3).map((g, i) => (
            <span
              key={g.id}
              className="relative aspect-[2/3] w-9 overflow-hidden rounded bg-muted ring-2 ring-card transition-transform duration-300 group-hover/row:-translate-y-1 group-hover/row:scale-110"
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <CoverArt src={g.coverImage} sizes="36px" />
            </span>
          ))}
        </div>
      )}
      <div className="relative z-10 shrink-0">
        {member.isViewer ? (
          <Badge variant="secondary">You</Badge>
        ) : (
          <FollowButton
            key={`${member.id}:${member.viewerFollows}`}
            userId={member.id}
            username={member.username}
            initialFollowing={member.viewerFollows}
            signedIn={signedIn}
            size="sm"
            className="min-w-24"
          />
        )}
      </div>
    </li>
  )
}
