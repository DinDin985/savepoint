"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useOptimistic, useState, useTransition, type ReactNode } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EyeOffIcon,
  ExternalLinkIcon,
  GiftIcon,
  HammerIcon,
  LaughIcon,
  Gamepad2Icon,
  PencilLineIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UserIcon,
} from "lucide-react"
import { toast } from "sonner"
import { voteReview } from "@/actions/reviews"
import { RatingStars } from "@/components/game/rating-stars"
import { UserAvatar } from "@/components/user/user-avatar"
import { formatHours, formatNumber } from "@/lib/format"
import { bodyLength } from "@/lib/reviews/bbcode"
import type { ReviewCardData, ReviewVoteCounts, ReviewVoteKind, ViewerVote } from "@/lib/reviews/types"
import { cn } from "@/lib/utils"
import { formatPostedDate, plural, REVIEW_FORM_IDS, scrollToReviewForm } from "./review-utils"

const CLAMP_CHARS = 560
const CLAMP_LINES = 9

type VoteState = { readonly votes: ReviewVoteCounts; readonly viewerVote: ViewerVote }

/** Same toggle rules as the server (optimistic preview). */
function applyVote(state: VoteState, kind: ReviewVoteKind): VoteState {
  const { votes, viewerVote } = state
  let helpful = votes.helpful
  let unhelpful = votes.unhelpful
  let funny = votes.funny
  let nextHelpful = viewerVote.helpful
  let nextFunny = viewerVote.funny
  if (kind === "funny") {
    nextFunny = !viewerVote.funny
    funny += nextFunny ? 1 : -1
  } else {
    const target = kind === "helpful" ? 1 : -1
    if (viewerVote.helpful === 1) helpful -= 1
    if (viewerVote.helpful === -1) unhelpful -= 1
    nextHelpful = viewerVote.helpful === target ? null : target
    if (nextHelpful === 1) helpful += 1
    if (nextHelpful === -1) unhelpful += 1
  }
  return {
    votes: { helpful: Math.max(0, helpful), unhelpful: Math.max(0, unhelpful), funny: Math.max(0, funny) },
    viewerVote: { helpful: nextHelpful, funny: nextFunny },
  }
}

/**
 * Steam-style review card used for every source (Savepoint community, Steam).
 * Left: author column. Right: verdict header, meta, body (clamped, spoilers
 * blurred) and the "Was this review helpful?" footer.
 */
export function ReviewCard({
  review,
  signedIn,
  signInHref,
}: {
  review: ReviewCardData
  signedIn: boolean
  signInHref: string
}) {
  return (
    <article
      className={cn(
        "group/review flex flex-col overflow-hidden rounded-md bg-steam-panel text-steam-text ring-1 ring-white/5",
        "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 hover:ring-steam-blue/30",
        "sm:flex-row",
      )}
    >
      <AuthorColumn review={review} />
      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        <VerdictHeader review={review} />
        <MetaLine review={review} />
        <ReviewBody review={review} />
        {review.source === "community" ? (
          <CommunityFooter review={review} signedIn={signedIn} signInHref={signInHref} />
        ) : (
          <SteamFooter review={review} />
        )}
      </div>
    </article>
  )
}

/* ── Author ─────────────────────────────────────────────────────────────── */

function AuthorColumn({ review }: { review: ReviewCardData }) {
  const { author } = review
  const avatar =
    author.avatar.kind === "savepoint" ? (
      <UserAvatar
        user={{
          username: author.avatar.username,
          displayName: author.avatar.displayName,
          avatarHue: author.avatar.avatarHue,
          avatarImage: author.avatar.avatarImage,
        }}
        size="md"
        className="rounded-sm transition-transform duration-300 group-hover/author:scale-110 [&_img]:transition-transform [&_img]:duration-500 group-hover/author:[&_img]:scale-110"
      />
    ) : (
      <span className="relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-steam-panel-2 ring-1 ring-white/15 transition-transform duration-300 group-hover/author:scale-110">
        {author.avatar.url ? (
          <Image
            src={author.avatar.url}
            alt=""
            fill
            sizes="40px"
            className="object-cover transition-transform duration-500 group-hover/author:scale-110"
          />
        ) : (
          <UserIcon className="size-5 text-steam-muted" aria-hidden />
        )}
      </span>
    )

  const name = (
    <span className="block truncate text-sm font-semibold text-steam-text transition-colors group-hover/author:text-steam-blue">
      {author.name}
    </span>
  )

  const stats = (
    <span className="mt-0.5 block space-y-0.5 text-[11px] leading-tight text-steam-muted">
      {author.productsOwned !== null ? (
        <span className="block">
          {formatNumber(author.productsOwned)}{" "}
          {review.source === "steam"
            ? plural(author.productsOwned, "product") + " in account"
            : plural(author.productsOwned, "game") + " logged"}
        </span>
      ) : null}
      {author.reviewCount !== null ? (
        <span className="block">
          {formatNumber(author.reviewCount)} {plural(author.reviewCount, "review")}
        </span>
      ) : null}
    </span>
  )

  const content = (
    <>
      {avatar}
      <span className="min-w-0 flex-1 sm:w-full sm:flex-none">
        {name}
        {stats}
      </span>
    </>
  )

  const className =
    "group/author flex w-full min-w-0 items-center gap-3 rounded-sm transition-colors sm:flex-col sm:items-start sm:gap-2"

  return (
    <div className="flex shrink-0 items-center border-b border-white/5 bg-black/15 p-3 sm:w-44 sm:items-start sm:border-r sm:border-b-0 md:w-48">
      {author.profileUrl ? (
        author.external ? (
          <a
            href={author.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
            title={`${author.name} on Steam`}
          >
            {content}
          </a>
        ) : (
          <Link href={author.profileUrl} className={className} title={`${author.name}'s profile`}>
            {content}
          </Link>
        )
      ) : (
        <div className={className}>{content}</div>
      )}
    </div>
  )
}

/* ── Header + meta ──────────────────────────────────────────────────────── */

function VerdictHeader({ review }: { review: ReviewCardData }) {
  const Thumb = review.recommended ? ThumbsUpIcon : ThumbsDownIcon
  const playtime =
    review.playtimeMinutes !== null && review.playtimeMinutes > 0
      ? `${formatHours(review.playtimeMinutes)} on record` +
        (review.playtimeAtReviewMinutes !== null &&
        review.playtimeAtReviewMinutes > 0 &&
        Math.abs(review.playtimeAtReviewMinutes - review.playtimeMinutes) >= 6
          ? ` (${formatHours(review.playtimeAtReviewMinutes)} at review time)`
          : "")
      : null

  return (
    <header className="flex items-center gap-3 rounded-sm bg-gradient-to-r from-steam-panel-2 to-steam-panel-2/30 p-2 pr-3">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-sm transition-transform duration-300 group-hover/review:scale-105",
          review.recommended ? "bg-steam-blue/15 text-steam-blue" : "bg-steam-negative/20 text-steam-negative",
        )}
        aria-hidden
      >
        <Thumb className="size-6" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base leading-tight font-semibold text-steam-text">
          {review.recommended ? "Recommended" : "Not Recommended"}
        </p>
        {playtime ? <p className="mt-0.5 truncate text-xs text-steam-muted">{playtime}</p> : null}
      </div>
      {review.authorRating ? (
        <span className="hidden shrink-0 min-[420px]:inline-flex" title="Their Savepoint rating">
          <RatingStars rating={review.authorRating} size="sm" />
        </span>
      ) : null}
    </header>
  )
}

function Badge({ icon, children, className }: { icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm bg-white/5 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-steam-text uppercase ring-1 ring-white/10 transition-colors hover:bg-white/10",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

function MetaLine({ review }: { review: ReviewCardData }) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-steam-muted uppercase">
      <span className="tracking-wide">
        Posted: <time dateTime={new Date(review.createdAt).toISOString()}>{formatPostedDate(review.createdAt)}</time>
      </span>
      {review.updatedAt ? (
        <span className="inline-flex items-center gap-1 tracking-wide">
          <PencilLineIcon className="size-3" aria-hidden />
          Updated: <time dateTime={new Date(review.updatedAt).toISOString()}>{formatPostedDate(review.updatedAt)}</time>
        </span>
      ) : null}
      {review.authorRating ? (
        <span className="inline-flex normal-case min-[420px]:hidden">
          <RatingStars rating={review.authorRating} size="xs" />
        </span>
      ) : null}
      {review.steamDeck ? (
        <Badge icon={<Gamepad2Icon className="size-3" aria-hidden />}>Steam Deck</Badge>
      ) : null}
      {review.earlyAccess ? (
        <Badge icon={<HammerIcon className="size-3" aria-hidden />} className="text-steam-mixed">
          Early Access Review
        </Badge>
      ) : null}
      {review.receivedForFree ? (
        <Badge icon={<GiftIcon className="size-3" aria-hidden />}>Received for free</Badge>
      ) : null}
      {review.containsSpoilers ? (
        <Badge icon={<EyeOffIcon className="size-3" aria-hidden />} className="text-steam-mixed">
          Spoilers
        </Badge>
      ) : null}
    </div>
  )
}

/* ── Body ───────────────────────────────────────────────────────────────── */

function InlineSpoiler({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false)
  if (revealed) return <span className="rounded-sm bg-white/5">{text}</span>
  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      title="Spoiler — click to reveal"
      className="inline rounded-sm bg-black/40 px-0.5 text-left whitespace-pre-line text-steam-text blur-[5px] transition-all duration-200 select-none hover:bg-black/60 hover:blur-[4px] focus-visible:blur-none focus-visible:outline-1 focus-visible:outline-steam-blue"
    >
      {text}
    </button>
  )
}

function ReviewBody({ review }: { review: ReviewCardData }) {
  const [expanded, setExpanded] = useState(false)
  const [spoilerRevealed, setSpoilerRevealed] = useState(false)
  const newlines = review.body.reduce((n, s) => n + (s.text.match(/\n/g)?.length ?? 0), 0)
  const clampable = bodyLength(review.body) > CLAMP_CHARS || newlines > CLAMP_LINES
  const hidden = review.containsSpoilers && !spoilerRevealed

  if (review.body.length === 0) {
    return <p className="mt-3 text-sm text-steam-muted italic">No written review.</p>
  }

  return (
    <div className={cn("relative mt-3", hidden && "min-h-16")}>
      <p
        className={cn(
          "text-sm/relaxed break-words whitespace-pre-line text-steam-text",
          clampable && !expanded && "line-clamp-8",
          hidden && "pointer-events-none blur-[6px] select-none",
        )}
        aria-hidden={hidden || undefined}
      >
        {review.body.map((segment, i) =>
          segment.spoiler ? (
            <InlineSpoiler key={i} text={segment.text} />
          ) : (
            <span key={i}>{segment.text}</span>
          ),
        )}
      </p>

      {hidden ? (
        <button
          type="button"
          onClick={() => setSpoilerRevealed(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-sm bg-steam-panel/40 text-center transition-colors hover:bg-steam-panel/20"
        >
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-black/60 px-3 py-1.5 text-xs font-semibold tracking-wide text-steam-text uppercase ring-1 ring-white/10 transition-all duration-200 hover:scale-105 hover:bg-steam-blue hover:text-steam-panel">
            <EyeOffIcon className="size-3.5" aria-hidden />
            Contains spoilers — click to reveal
          </span>
        </button>
      ) : null}

      {clampable && !hidden ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-steam-blue transition-all duration-200 hover:translate-x-0.5 hover:text-white sm:mt-1.5 sm:min-h-0"
        >
          {expanded ? (
            <>
              Show less <ChevronUpIcon className="size-3.5" aria-hidden />
            </>
          ) : (
            <>
              Read more <ChevronDownIcon className="size-3.5" aria-hidden />
            </>
          )}
        </button>
      ) : null}
    </div>
  )
}

/* ── Footers ────────────────────────────────────────────────────────────── */

function voteSummary(votes: ReviewVoteCounts) {
  const parts: string[] = []
  if (votes.helpful > 0) {
    parts.push(`${formatNumber(votes.helpful)} ${votes.helpful === 1 ? "person" : "people"} found this review helpful`)
  }
  if (votes.funny > 0) {
    parts.push(
      votes.helpful > 0
        ? `${formatNumber(votes.funny)} found it funny`
        : `${formatNumber(votes.funny)} ${votes.funny === 1 ? "person" : "people"} found this review funny`,
    )
  }
  return parts.join(" · ")
}

function VoteButton({
  active,
  disabled,
  busy,
  onClick,
  icon,
  label,
  activeClass,
  title,
}: {
  active: boolean
  disabled?: boolean
  busy?: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  activeClass: string
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-busy={busy || undefined}
      title={title}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-sm px-3 text-xs font-medium ring-1 transition-all duration-200 sm:h-7 sm:px-2.5",
        "disabled:cursor-not-allowed disabled:opacity-45",
        active
          ? cn("ring-transparent", activeClass)
          : "bg-steam-panel-2 text-steam-text ring-white/10 enabled:hover:scale-105 enabled:hover:bg-steam-blue enabled:hover:text-steam-panel enabled:active:scale-95",
        busy && "cursor-wait",
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function CommunityFooter({
  review,
  signedIn,
  signInHref,
}: {
  review: ReviewCardData
  signedIn: boolean
  signInHref: string
}) {
  const router = useRouter()
  const [confirmed, setConfirmed] = useState<VoteState>({
    votes: review.votes,
    viewerVote: review.viewerVote ?? { helpful: null, funny: false },
  })
  const [optimistic, addOptimistic] = useOptimistic(confirmed, applyVote)
  const [isPending, startTransition] = useTransition()

  const vote = (kind: ReviewVoteKind) => {
    if (!signedIn) {
      toast("Sign in to vote on reviews", {
        description: "Tell other players which reviews helped you.",
        action: { label: "Sign in", onClick: () => router.push(signInHref) },
      })
      return
    }
    if (review.isOwn || isPending) return
    startTransition(async () => {
      addOptimistic(kind)
      // a failed or rejected call simply ends the transition → the optimistic vote rolls back
      const result = await voteReview(review.id, kind).catch(() => null)
      if (result?.ok) {
        startTransition(() => setConfirmed({ votes: result.data.counts, viewerVote: result.data.viewerVote }))
      } else {
        toast.error(result?.error ?? "Couldn't save your vote. Check your connection and try again.", {
          id: `vote-${review.id}`,
        })
      }
    })
  }

  const summary = voteSummary(optimistic.votes)
  const ownTitle = review.isOwn ? "You can't vote on your own review" : undefined

  return (
    <footer className="mt-3 border-t border-white/5 pt-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-xs text-steam-muted">{review.isOwn ? "This is your review" : "Was this review helpful?"}</p>
        <div className="flex flex-wrap gap-1.5">
          <VoteButton
            label="Yes"
            icon={<ThumbsUpIcon className="size-3.5" aria-hidden />}
            active={optimistic.viewerVote.helpful === 1}
            activeClass="bg-steam-blue text-steam-panel"
            disabled={review.isOwn}
            busy={isPending}
            title={ownTitle}
            onClick={() => vote("helpful")}
          />
          <VoteButton
            label="No"
            icon={<ThumbsDownIcon className="size-3.5" aria-hidden />}
            active={optimistic.viewerVote.helpful === -1}
            activeClass="bg-steam-negative text-white"
            disabled={review.isOwn}
            busy={isPending}
            title={ownTitle}
            onClick={() => vote("unhelpful")}
          />
          <VoteButton
            label="Funny"
            icon={<LaughIcon className="size-3.5" aria-hidden />}
            active={optimistic.viewerVote.funny}
            activeClass="bg-steam-mixed text-steam-panel"
            disabled={review.isOwn}
            busy={isPending}
            title={ownTitle}
            onClick={() => vote("funny")}
          />
        </div>
      </div>
      <p className="mt-2 min-h-4 text-xs text-steam-muted" aria-live="polite">
        {summary || (review.isOwn ? "No votes on your review yet" : "No one has rated this review yet")}
        {review.isOwn ? (
          <>
            {" · "}
            <a
              href={`#${REVIEW_FORM_IDS[REVIEW_FORM_IDS.length - 1]}`}
              onClick={(event) => {
                if (scrollToReviewForm()) event.preventDefault()
              }}
              className="inline-flex items-center gap-1 font-medium text-steam-blue transition-colors hover:text-white hover:underline"
            >
              <PencilLineIcon className="size-3" aria-hidden />
              Edit your review
            </a>
          </>
        ) : null}
      </p>
    </footer>
  )
}

function SteamFooter({ review }: { review: ReviewCardData }) {
  const summary = voteSummary(review.votes)
  return (
    <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
      <p className="text-xs text-steam-muted">{summary || "No helpful votes yet"}</p>
      {review.externalUrl ? (
        <a
          href={review.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1 rounded-sm px-2 text-xs font-medium text-steam-blue transition-all duration-200 hover:scale-105 hover:bg-steam-blue/10 hover:text-white sm:h-7 sm:px-1.5"
          aria-label={`View ${review.author.name}'s review on Steam`}
        >
          View on Steam
          <ExternalLinkIcon className="size-3" aria-hidden />
        </a>
      ) : null}
    </footer>
  )
}
