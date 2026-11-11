"use client"

import Link from "next/link"
import { useEffect, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react"
import { CheckIcon, LogInIcon, PenLineIcon, PencilIcon, SquareIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"
import { toast } from "sonner"
import { deleteReviewAction, saveReviewAction, setLibraryFlagAction, setRatingAction } from "@/actions/library"
import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import type { ActionResult } from "@/lib/effect/runtime"
import { formatDate, ratingToStars, timeAgo } from "@/lib/format"
import { applyChange, flagConflict, type LibraryChange } from "@/lib/library/rules"
import { EMPTY_ENTRY, LIBRARY_PANEL_ID, WRITE_REVIEW_HASH, type LibraryFlag, type LibraryState, type ReviewDraft } from "@/lib/library/types"
import { cn } from "@/lib/utils"
import { WRITE_REVIEW_EVENT } from "@/components/reviews/review-utils"
import { RatingInput } from "./rating-input"
import { ReviewDialog } from "./review-dialog"
import { StatusToggle } from "./status-toggle"
import { formatUtcDate, useHydrated } from "./use-hydrated"

export type LibraryPanelGame = {
  readonly id: number
  readonly slug: string
  readonly title: string
}

type Result = ActionResult<LibraryState>

const NETWORK_ERROR: Result = { ok: false, error: "Couldn't reach Savepoint. Check your connection and try again." }
/**
 * The viewer's log for one game: Played / Playing / Wishlist / Like toggles,
 * a half-star rating and the review editor. Updates are optimistic
 * (useOptimistic + useTransition), serialised, confirmed with a toast and
 * rolled back when the server says no. Signed-out viewers get the same
 * controls, disabled, plus a sign-in CTA.
 */
export function LibraryPanel({
  game,
  initialState,
  signInHref,
  className,
}: {
  game: LibraryPanelGame
  /** null = signed out */
  initialState: LibraryState | null
  signInHref: string
  className?: string
}) {
  if (!initialState) return <SignedOutPanel game={game} signInHref={signInHref} className={className} />
  return <SignedInPanel game={game} initialState={initialState} className={className} />
}

/* ── Signed in ─────────────────────────────────────────────────────────── */

function SignedInPanel({
  game,
  initialState,
  className,
}: {
  game: LibraryPanelGame
  initialState: LibraryState
  className?: string
}) {
  // server-confirmed state; re-synced whenever the server re-renders the page (revalidatePath)
  const [confirmed, setConfirmed] = useState(initialState)
  const [syncedFrom, setSyncedFrom] = useState(initialState)
  if (syncedFrom !== initialState) {
    setSyncedFrom(initialState)
    setConfirmed(initialState)
  }

  const [state, addOptimistic] = useOptimistic(confirmed, applyChange)
  const [isPending, startTransition] = useTransition()
  const [askFinished, setAskFinished] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const playingAnchor = useRef<HTMLDivElement>(null)
  const hydrated = useHydrated()

  // The review editor opens from anywhere on the page:
  //  - the reviews section's "Write a review" / "Edit your review" CTAs dispatch WRITE_REVIEW_EVENT,
  //  - any `<a href="#write-review">` (also when arriving from another page with that hash).
  useEffect(() => {
    const openEditor = () => setReviewOpen(true)
    const fromHash = () => {
      if (window.location.hash !== WRITE_REVIEW_HASH) return
      // drop the hash so the same link works again and a refresh doesn't reopen the editor
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search)
      openEditor()
    }
    const frame = window.requestAnimationFrame(fromHash)
    window.addEventListener("hashchange", fromHash)
    window.addEventListener(WRITE_REVIEW_EVENT, openEditor)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("hashchange", fromHash)
      window.removeEventListener(WRITE_REVIEW_EVENT, openEditor)
    }
  }, [])

  // run server calls one after another so rapid clicks can't race each other
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const toastId = `library-${game.id}`

  const mutate = (
    change: LibraryChange | null,
    call: () => Promise<Result>,
    success: string | null,
    options: { readonly inlineFieldErrors?: boolean } = {},
  ) =>
    new Promise<Result>((resolve) => {
      startTransition(async () => {
        if (change) addOptimistic(change)
        const run = queue.current.then(call, call)
        queue.current = run.catch(() => undefined)
        const result = await run.catch(() => NETWORK_ERROR)
        if (result.ok) {
          startTransition(() => setConfirmed(result.data))
          if (success) toast.success(success, { id: toastId })
        } else if (!(options.inlineFieldErrors && result.fieldErrors && Object.keys(result.fieldErrors).length > 0)) {
          // the optimistic change is dropped automatically when this transition ends → rollback
          toast.error(result.error, { id: toastId })
        }
        resolve(result)
      })
    })

  const { entry, review } = state

  const setFlag = (flag: LibraryFlag, value: boolean, finished?: boolean) => {
    const conflict = flagConflict(state, flag, value, game.title)
    if (conflict) {
      toast.error(conflict, { id: toastId })
      return
    }
    void mutate(
      { kind: "flag", flag, value, finished },
      () => setLibraryFlagAction(game.id, flag, value, { finished }),
      flagMessage(flag, value, game.title, { finished, clearedRating: flag === "played" && !value && (entry.rating !== null || entry.liked) }),
    )
  }

  const onToggle = (flag: LibraryFlag) => {
    if (flag === "playing" && entry.playing) {
      // clicking Playing again while the question is open closes it
      setAskFinished((open) => !open)
      return
    }
    setFlag(flag, !entry[flag])
  }

  const rate = (rating: number | null) => {
    void mutate(
      { kind: "rating", rating },
      () => setRatingAction(game.id, rating),
      rating === null ? `Removed your rating of ${game.title}` : `Rated ${game.title} ${ratingToStars(rating)}`,
    )
  }

  const saveReview = (draft: ReviewDraft) =>
    mutate(null, () => saveReviewAction(game.id, draft), review ? "Review updated" : `Review of ${game.title} published`, {
      inlineFieldErrors: true,
    })

  const deleteReview = () => mutate({ kind: "review", review: null }, () => deleteReviewAction(game.id), "Review deleted")

  return (
    <PanelShell className={className} pending={isPending}>
      <div className="grid grid-cols-4 gap-1.5">
        <StatusToggle flag="played" active={entry.played} onClick={() => onToggle("played")} />
        <Popover open={askFinished && entry.playing} onOpenChange={setAskFinished}>
          <PopoverAnchor asChild>
            <div ref={playingAnchor}>
              <StatusToggle
                flag="playing"
                active={entry.playing}
                aria-haspopup={entry.playing ? "dialog" : undefined}
                aria-expanded={entry.playing ? askFinished : undefined}
                onClick={() => onToggle("playing")}
              />
            </div>
          </PopoverAnchor>
          <PopoverContent
            side="bottom"
            align="center"
            collisionPadding={16}
            className="w-64 max-w-[calc(100vw-2rem)]"
            onInteractOutside={(event) => {
              // a click on the Playing toggle is handled by onToggle (it toggles the popover);
              // without this the popover would close on pointerdown and reopen on click
              const target = event.detail.originalEvent.target
              if (target instanceof Node && playingAnchor.current?.contains(target)) event.preventDefault()
            }}
          >
            <PopoverHeader>
              <PopoverTitle>Did you finish it?</PopoverTitle>
              <PopoverDescription className="text-xs">
                Finishing {game.title} also marks it as played.
              </PopoverDescription>
            </PopoverHeader>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                className="bg-played text-primary-foreground hover:bg-played/90"
                onClick={() => {
                  setAskFinished(false)
                  setFlag("playing", false, true)
                }}
              >
                <CheckIcon /> Finished
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setAskFinished(false)
                  setFlag("playing", false, false)
                }}
              >
                <SquareIcon /> Just stopped
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <StatusToggle flag="wishlisted" active={entry.wishlisted} onClick={() => onToggle("wishlisted")} />
        <StatusToggle flag="liked" active={entry.liked} onClick={() => onToggle("liked")} />
      </div>

      {entry.playing && entry.startedPlayingAt && (
        <p className="mt-2 text-center text-xs text-playing animate-in fade-in">
          Playing since{" "}
          <time dateTime={new Date(entry.startedPlayingAt).toISOString()}>
            {/* UTC on the server / during hydration, the viewer's local date afterwards */}
            {hydrated ? formatDate(entry.startedPlayingAt) : formatUtcDate(entry.startedPlayingAt)}
          </time>
        </p>
      )}

      <Separator className="my-4" />

      <RatingInput value={entry.rating} onChange={rate} />

      <Separator className="my-4" />

      {review ? (
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          className="group/review w-full rounded-lg border bg-muted/30 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/60"
        >
          <span className="flex items-center justify-between gap-2 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 font-semibold",
                review.recommended ? "text-steam-blue" : "text-foreground",
              )}
            >
              {review.recommended ? (
                <ThumbsUpIcon className="size-3.5" />
              ) : (
                <ThumbsDownIcon className="size-3.5 text-steam-negative" />
              )}
              {review.recommended ? "You recommend this" : "You don't recommend this"}
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground transition-colors group-hover/review:text-primary">
              <PencilIcon className="size-3" /> Edit
            </span>
          </span>
          <span className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{review.body}</span>
          <span className="mt-1.5 block text-[11px] text-muted-foreground/80">
            {review.hoursPlayed !== null && `${review.hoursPlayed.toLocaleString("en-US")} hrs · `}
            {review.updatedAt > review.createdAt + 1000 ? "edited " : ""}
            <time dateTime={new Date(review.updatedAt).toISOString()}>
              {/* relative time depends on "now": only after hydration */}
              {hydrated ? timeAgo(review.updatedAt) : formatUtcDate(review.updatedAt)}
            </time>
          </span>
        </button>
      ) : (
        <Button variant="secondary" className="w-full" size="lg" onClick={() => setReviewOpen(true)}>
          <PenLineIcon /> Write a review
        </Button>
      )}

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        gameTitle={game.title}
        review={review}
        ratingSlot={<RatingInput value={entry.rating} onChange={rate} size="md" />}
        onSave={saveReview}
        onDelete={deleteReview}
      />
    </PanelShell>
  )
}

function flagMessage(
  flag: LibraryFlag,
  value: boolean,
  title: string,
  extra: { readonly finished?: boolean; readonly clearedRating?: boolean },
): string {
  switch (flag) {
    case "played":
      return value
        ? `Marked ${title} as played`
        : `Removed ${title} from played${extra.clearedRating ? " (rating and like cleared)" : ""}`
    case "playing":
      if (value) return `Now playing ${title}`
      return extra.finished ? `Finished ${title} — nice! Marked as played` : `Stopped playing ${title}`
    case "wishlisted":
      return value ? `Added ${title} to your wishlist` : `Removed ${title} from your wishlist`
    case "liked":
      return value ? `Liked ${title}` : `Unliked ${title}`
  }
}

/* ── Signed out ────────────────────────────────────────────────────────── */

function SignedOutPanel({
  game,
  signInHref,
  className,
}: {
  game: LibraryPanelGame
  signInHref: string
  className?: string
}) {
  const entry = EMPTY_ENTRY
  return (
    <PanelShell className={className}>
      <div className="grid grid-cols-4 gap-1.5" aria-disabled>
        <StatusToggle flag="played" active={entry.played} disabled />
        <StatusToggle flag="playing" active={entry.playing} disabled />
        <StatusToggle flag="wishlisted" active={entry.wishlisted} disabled />
        <StatusToggle flag="liked" active={entry.liked} disabled />
      </div>
      <Separator className="my-4" />
      <RatingInput value={null} onChange={() => undefined} disabled />
      <Separator className="my-4" />
      <Button asChild className="w-full" size="lg">
        <Link href={signInHref}>
          <LogInIcon /> Sign in to log, rate or review
        </Link>
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Track {game.title}, rate it and tell other players what you think.
      </p>
    </PanelShell>
  )
}

/* ── Shared chrome ─────────────────────────────────────────────────────── */

function PanelShell({
  className,
  pending = false,
  children,
}: {
  className?: string
  pending?: boolean
  children: ReactNode
}) {
  return (
    <section
      id={LIBRARY_PANEL_ID}
      aria-label="Your log"
      aria-busy={pending}
      className={cn(
        "scroll-mt-24 rounded-xl border bg-card/85 p-4 shadow-xl shadow-black/30 backdrop-blur-md",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-pixel text-[10px] tracking-widest text-muted-foreground">YOUR LOG</h2>
        {pending && <Spinner className="size-3.5 text-muted-foreground" />}
      </div>
      {children}
    </section>
  )
}
