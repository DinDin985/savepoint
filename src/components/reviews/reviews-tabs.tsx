"use client"

import { Gamepad2Icon, MessagesSquareIcon, StoreIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCompact } from "@/lib/format"
import type {
  CommunityOverview,
  CommunityReviewPage,
  EpicRatings,
  SteamOverview,
  SteamReviewPage,
} from "@/lib/reviews/types"
import { cn } from "@/lib/utils"
import { CommunityReviewsPanel, type StoreWithoutReviews } from "./community-reviews-panel"
import { EpicRatingsPanel } from "./epic-ratings-panel"
import { SteamReviewsPanel } from "./steam-reviews-panel"

export type ReviewsTabId = "savepoint" | "steam" | "epic"

export type ReviewsTabsProps = {
  readonly defaultTab: ReviewsTabId
  readonly game: { readonly id: number; readonly title: string }
  readonly signedIn: boolean
  readonly signInHref: string
  readonly community: {
    /** null when our DB couldn't be read */
    readonly overview: CommunityOverview | null
    readonly initialPage: CommunityReviewPage | null
    readonly initialError: string | null
    readonly storeWithoutReviews: StoreWithoutReviews | null
  }
  readonly steam: {
    readonly appId: number
    readonly storeUrl: string
    readonly overview: SteamOverview
    readonly initialPage: SteamReviewPage | null
    readonly initialError: string | null
  } | null
  readonly epic: {
    readonly url: string
    /** snapshot average (0–5) for the tab badge, if known */
    readonly averageRating: number | null
    /** ready-made data (catalog snapshot) when there's nothing live to fetch */
    readonly initial: EpicRatings | null
  } | null
}

// "Folder tab" look: the active tab shares the panel's Steam background and gets a blue top accent.
const triggerClass = cn(
  "group/trigger h-10 flex-none gap-2 rounded-md rounded-b-none px-3 text-sm font-semibold text-muted-foreground",
  "transition-all duration-200 hover:bg-white/5 hover:text-foreground",
  "data-active:text-steam-text dark:data-active:text-steam-text",
  "group-data-[variant=line]/tabs-list:data-active:bg-steam-bg dark:group-data-[variant=line]/tabs-list:data-active:bg-steam-bg",
  "after:bg-steam-blue group-data-horizontal/tabs:after:top-0 group-data-horizontal/tabs:after:bottom-auto",
)

function CountBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white/10 px-1.5 py-px text-[10px] font-semibold text-foreground/80 tabular-nums transition-colors group-hover/trigger:bg-white/15 group-data-active/trigger:bg-steam-blue/20 group-data-active/trigger:text-steam-blue">
      {children}
    </span>
  )
}

/**
 * Source tabs for the reviews area. Panels mount the first time their tab is
 * opened (so Steam/Epic/Savepoint data loads on demand) and then stay mounted,
 * keeping their filters and loaded pages while you switch tabs.
 */
export function ReviewsTabs({ defaultTab, game, signedIn, signInHref, community, steam, epic }: ReviewsTabsProps) {
  const [tab, setTab] = useState<ReviewsTabId>(defaultTab)
  const [visited, setVisited] = useState<ReadonlySet<ReviewsTabId>>(() => new Set([defaultTab]))

  const select = (value: string) => {
    const next = value as ReviewsTabId
    setTab(next)
    setVisited((prev) => (prev.has(next) ? prev : new Set([...prev, next])))
  }

  const panelClass = "mt-0 rounded-lg rounded-tl-none bg-steam-bg p-3 text-steam-text ring-1 ring-white/5 data-[state=inactive]:hidden sm:p-4"

  return (
    <Tabs value={tab} onValueChange={select} className="gap-0">
      <TabsList
        variant="line"
        aria-label="Review sources"
        className="scrollbar-none h-auto w-full justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-none p-0 group-data-horizontal/tabs:h-auto"
      >
        <TabsTrigger value="savepoint" className={triggerClass}>
          <MessagesSquareIcon className="transition-transform duration-200 group-hover/trigger:scale-110" aria-hidden />
          Savepoint
          {community.overview ? <CountBadge>{formatCompact(community.overview.overall.total)}</CountBadge> : null}
        </TabsTrigger>
        {steam ? (
          <TabsTrigger value="steam" className={triggerClass}>
            <Gamepad2Icon className="transition-transform duration-200 group-hover/trigger:scale-110" aria-hidden />
            Steam
            {steam.overview.overall ? <CountBadge>{formatCompact(steam.overview.overall.total)}</CountBadge> : null}
          </TabsTrigger>
        ) : null}
        {epic ? (
          <TabsTrigger value="epic" className={triggerClass}>
            <StoreIcon className="transition-transform duration-200 group-hover/trigger:scale-110" aria-hidden />
            Epic Games
            {epic.averageRating ? <CountBadge>{epic.averageRating.toFixed(1)}★</CountBadge> : null}
          </TabsTrigger>
        ) : null}
      </TabsList>

      <TabsContent value="savepoint" forceMount className={panelClass}>
        {visited.has("savepoint") ? (
          <CommunityReviewsPanel
            // remount with fresh server data when reviews are added / edited
            key={community.overview?.version ?? "unavailable"}
            gameId={game.id}
            gameTitle={game.title}
            overview={community.overview}
            initialPage={community.initialPage}
            initialError={community.initialError}
            signedIn={signedIn}
            signInHref={signInHref}
            storeWithoutReviews={community.storeWithoutReviews}
          />
        ) : null}
      </TabsContent>

      {steam ? (
        <TabsContent value="steam" forceMount className={panelClass}>
          {visited.has("steam") ? (
            <SteamReviewsPanel
              appId={steam.appId}
              overview={steam.overview}
              initialPage={steam.initialPage}
              initialError={steam.initialError}
              storeUrl={steam.storeUrl}
              signedIn={signedIn}
              signInHref={signInHref}
            />
          ) : null}
        </TabsContent>
      ) : null}

      {epic ? (
        <TabsContent value="epic" forceMount className={panelClass}>
          {visited.has("epic") ? <EpicRatingsPanel gameId={game.id} epicUrl={epic.url} initial={epic.initial} /> : null}
        </TabsContent>
      ) : null}
    </Tabs>
  )
}
