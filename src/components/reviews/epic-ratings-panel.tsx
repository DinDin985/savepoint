"use client"

import { InfoIcon, StarIcon, UsersIcon } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { RatingStars } from "@/components/game/rating-stars"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber } from "@/lib/format"
import type { EpicPollResult, EpicRatings } from "@/lib/reviews/types"
import { cn } from "@/lib/utils"
import { StoreLinkButton, StoreNotice } from "./review-states"
import { getJson, isAbortError } from "./review-utils"

type State =
  | { readonly phase: "loading" }
  | { readonly phase: "ready"; readonly data: EpicRatings }
  | { readonly phase: "error"; readonly error: string }

/** Epic's 0–5 average → a word, like the store shows next to the stars. */
const ratingWord = (avg: number) =>
  avg >= 4.5 ? "Exceptional" : avg >= 4 ? "Excellent" : avg >= 3.5 ? "Great" : avg >= 3 ? "Good" : avg >= 2 ? "Mixed" : "Poor"

/**
 * Epic Games tab (loaded on demand). Epic has no written reviews: we show the
 * average player rating and the post-play poll results as Steam-styled cards.
 */
export function EpicRatingsPanel({
  gameId,
  epicUrl,
  initial = null,
}: {
  gameId: number
  epicUrl: string
  /** server-provided data (catalog snapshot) — skips the request entirely */
  initial?: EpicRatings | null
}) {
  const [state, setState] = useState<State>(() => (initial ? { phase: "ready", data: initial } : { phase: "loading" }))
  const controller = useRef<AbortController | null>(null)

  const load = useCallback(() => {
    controller.current?.abort()
    const ac = new AbortController()
    controller.current = ac
    getJson<EpicRatings>(`/api/reviews/epic?gameId=${gameId}`, ac.signal).then(
      (data) => {
        if (!ac.signal.aborted) setState({ phase: "ready", data })
      },
      (error: unknown) => {
        if (ac.signal.aborted || isAbortError(error)) return
        setState({ phase: "error", error: error instanceof Error ? error.message : "Something went wrong." })
      },
    )
  }, [gameId])

  const hasInitial = initial !== null
  useEffect(() => {
    if (!hasInitial) load()
    return () => controller.current?.abort()
  }, [load, hasInitial])

  if (state.phase === "loading") return <EpicSkeleton />

  if (state.phase === "error") {
    return (
      <StoreNotice
        title="Epic Games Store ratings are unavailable right now"
        description={state.error}
        onRetry={() => {
          setState({ phase: "loading" })
          load()
        }}
        href={epicUrl}
        linkLabel="Open on Epic Games Store"
      />
    )
  }

  const { data } = state
  if (data.averageRating === null && data.polls.length === 0) {
    return (
      <StoreNotice
        icon={<StarIcon className="size-5" aria-hidden />}
        title={data.live ? "No player ratings on the Epic Games Store yet" : "Epic player ratings aren't available here yet"}
        description={
          data.live
            ? "Epic only shows ratings once enough players have rated the game."
            : "See the latest player ratings and polls on the store page."
        }
        href={data.url}
        linkLabel="Open on Epic Games Store"
      />
    )
  }

  const maxVotes = data.polls.reduce((m, p) => Math.max(m, p.votes), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-md bg-steam-panel p-4 ring-1 ring-white/5 sm:flex-row sm:items-center">
        {data.averageRating !== null ? (
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-md bg-black/30 ring-1 ring-white/10">
              <span className="text-2xl leading-none font-bold text-steam-text tabular-nums">
                {data.averageRating.toFixed(1)}
                <span className="text-xs font-medium text-steam-muted">/5</span>
              </span>
              <span className="mt-1 text-[10px] text-steam-muted">avg. rating</span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wider text-steam-muted uppercase">Player rating</p>
              <p className="mt-0.5 text-base font-semibold text-steam-blue">{ratingWord(data.averageRating)}</p>
              <RatingStars rating={data.averageRating * 2} size="md" className="mt-1" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-steam-muted">Not enough ratings for an average yet.</p>
        )}
        <div className="flex flex-col gap-2 sm:ml-auto sm:items-end">
          <StoreLinkButton href={data.url}>Open on Epic Games Store</StoreLinkButton>
          <p className="inline-flex items-center gap-1 text-[11px] text-steam-muted">
            <InfoIcon className="size-3.5" aria-hidden />
            {data.live ? "Live from the Epic Games Store" : "Cached snapshot · Epic couldn't be reached"}
          </p>
        </div>
      </div>

      {data.polls.length > 0 ? (
        <>
          <p className="text-xs text-steam-muted">
            Epic doesn&apos;t publish written reviews — after playing, players answer quick polls about the game:
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} maxVotes={maxVotes} />
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}

function PollCard({ poll, maxVotes }: { poll: EpicPollResult; maxVotes: number }) {
  const width = maxVotes > 0 ? Math.max(4, (poll.votes / maxVotes) * 100) : 0
  return (
    <li
      className={cn(
        "group/poll flex items-center gap-3 rounded-md bg-steam-panel p-3 ring-1 ring-white/5",
        "transition-all duration-300 hover:-translate-y-0.5 hover:bg-steam-panel-2 hover:shadow-lg hover:shadow-black/40 hover:ring-steam-blue/30",
      )}
    >
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/30">
        {poll.emoji ? (
          <Image
            src={poll.emoji}
            alt=""
            width={32}
            height={32}
            className="size-8 transition-transform duration-300 group-hover/poll:scale-125 group-hover/poll:-rotate-6"
          />
        ) : (
          <StarIcon className="size-6 text-steam-mixed transition-transform duration-300 group-hover/poll:scale-125" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-steam-muted">{poll.text}</p>
        <p className="truncate text-sm font-semibold text-steam-text transition-colors group-hover/poll:text-steam-blue">
          {poll.title}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
            <span
              className="block h-full rounded-full bg-steam-positive/80 transition-[width] duration-700"
              style={{ width: `${width}%` }}
            />
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-steam-muted tabular-nums">
            <UsersIcon className="size-3" aria-hidden />
            {formatNumber(poll.votes)} {poll.votes === 1 ? "player" : "players"}
          </span>
        </div>
      </div>
    </li>
  )
}

function EpicSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading Epic Games Store ratings">
      <div className="flex items-center gap-4 rounded-md bg-steam-panel p-4 ring-1 ring-white/5">
        <Skeleton className="size-16 rounded-md bg-white/10" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 bg-white/5" />
          <Skeleton className="h-4 w-28 bg-white/10" />
          <Skeleton className="h-4 w-32 bg-white/5" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-md bg-steam-panel p-3 ring-1 ring-white/5">
            <Skeleton className="size-12 rounded-md bg-white/10" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-20 bg-white/5" />
              <Skeleton className="h-3.5 w-32 bg-white/10" />
              <Skeleton className="h-1.5 w-full bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
