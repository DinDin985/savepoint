"use client"

import { useMemo, useState, useSyncExternalStore, useTransition } from "react"
import { ChevronDownIcon, CircleCheckIcon } from "lucide-react"
import { toast } from "sonner"
import { loadMoreFeed } from "@/actions/social"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { timeAgo } from "@/lib/format"
import { dayKeyOf, dayLabelOf } from "@/lib/social/time"
import type { FeedCursor, FeedItem, FeedPage } from "@/lib/social/types"
import { FeedItemView } from "./feed-item"

type DayGroup = { key: string; label: string; items: FeedItem[] }

const groupByDay = (items: readonly FeedItem[]): DayGroup[] => {
  const groups: DayGroup[] = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (last && last.key === item.dayKey) last.items.push(item)
    else groups.push({ key: item.dayKey, label: item.dayLabel, items: [item] })
  }
  return groups
}

/* A minute-resolution clock as an external store: null on the server and while
 * hydrating (so markup matches), then the browser's "now", refreshed every minute
 * so relative times and "Today" headings stay current in the viewer's time zone. */
let nowSnapshot = 0
const subscribeNow = (onChange: () => void) => {
  nowSnapshot = Date.now() // React re-reads the snapshot right after subscribing
  const id = window.setInterval(() => {
    nowSnapshot = Date.now()
    onChange()
  }, 60_000)
  return () => window.clearInterval(id)
}
const getNow = () => nowSnapshot || (nowSnapshot = Date.now())
const getServerNow = () => null

const useClientNow = (): number | null => useSyncExternalStore(subscribeNow, getNow, getServerNow)

/** Day-grouped activity list with cursor-based "Load more". */
export function FeedList({
  initialPage,
  includeOwn,
  viewerId,
}: {
  initialPage: FeedPage
  includeOwn: boolean
  viewerId: string
}) {
  const [items, setItems] = useState<readonly FeedItem[]>(initialPage.items)
  const [cursor, setCursor] = useState<FeedCursor | null>(initialPage.nextCursor)
  const [pending, startTransition] = useTransition()
  const now = useClientNow()

  // once hydrated, re-label in the viewer's own time zone ("Today", "3 minutes ago"…)
  const localItems = useMemo(
    () =>
      now === null
        ? items
        : items.map((item) => ({
            ...item,
            timeLabel: timeAgo(item.createdAt),
            dayKey: dayKeyOf(item.createdAt),
            dayLabel: dayLabelOf(item.createdAt, now),
          })),
    [now, items],
  )

  const loadMore = () => {
    if (cursor === null) return
    startTransition(async () => {
      const result = await loadMoreFeed({ ...cursor, includeOwn })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id))
        return [...prev, ...result.data.items.filter((i) => !seen.has(i.id))]
      })
      setCursor(result.data.nextCursor)
    })
  }

  return (
    <div className="space-y-8">
      {groupByDay(localItems).map((group, index) => {
        // the same day can only repeat if an event's time was refreshed mid-scroll; keep keys unique anyway
        const key = `${group.key}_${index}`
        return (
          <section key={key} aria-labelledby={`day-${key}`}>
            <h2
              id={`day-${key}`}
              className="sticky top-14 z-10 -mx-1 mb-2 flex items-center gap-3 bg-background/85 px-1 py-2 font-pixel text-xs tracking-widest text-muted-foreground uppercase backdrop-blur"
            >
              {group.label}
              <span className="h-px flex-1 bg-border" />
            </h2>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <FeedItemView key={item.id} item={item} viewerId={viewerId} />
              ))}
            </ul>
          </section>
        )
      })}

      <div className="flex justify-center pt-2">
        {cursor !== null ? (
          <Button variant="outline" size="lg" onClick={loadMore} disabled={pending} className="min-w-40">
            {pending ? <Spinner /> : <ChevronDownIcon data-icon="inline-start" />}
            {pending ? "Loading…" : "Load more"}
          </Button>
        ) : (
          items.length > 0 && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleCheckIcon className="size-4 text-primary" /> You&apos;re all caught up.
            </p>
          )
        )}
      </div>
    </div>
  )
}
