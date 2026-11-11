"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

type Tab = { href: string; label: string; count?: number; exact?: boolean }

/**
 * Sticky, horizontally scrollable tab bar for the profile routes. The active
 * tab is underlined in the primary colour and scrolled into view on mobile.
 */
export function ProfileTabs({
  username,
  counts,
}: {
  username: string
  counts: { games: number; reviews: number; wishlist: number; playing: number; followers: number; following: number }
}) {
  const pathname = (usePathname() ?? "").toLowerCase()
  const base = `/u/${username}`
  const tabs: Tab[] = [
    { href: base, label: "Profile", exact: true },
    { href: `${base}/games`, label: "Games", count: counts.games },
    { href: `${base}/reviews`, label: "Reviews", count: counts.reviews },
    { href: `${base}/wishlist`, label: "Wishlist", count: counts.wishlist },
    { href: `${base}/playing`, label: "Playing", count: counts.playing },
    { href: `${base}/stats`, label: "Stats" },
    { href: `${base}/followers`, label: "Followers", count: counts.followers },
    { href: `${base}/following`, label: "Following", count: counts.following },
  ]
  const isActive = (tab: Tab) =>
    tab.exact ? pathname === tab.href || pathname === `${tab.href}/` : pathname.startsWith(tab.href)

  const listRef = useRef<HTMLUListElement>(null)
  const activeRef = useRef<HTMLAnchorElement>(null)
  // keep the active tab centred in the horizontal strip (mobile) without scrolling the page
  useEffect(() => {
    const list = listRef.current
    const active = activeRef.current
    if (!list || !active || list.scrollWidth <= list.clientWidth) return
    const a = active.getBoundingClientRect()
    const l = list.getBoundingClientRect()
    list.scrollBy({ left: a.left + a.width / 2 - (l.left + l.width / 2), behavior: "smooth" })
  }, [pathname])

  return (
    <div className="sticky top-14 z-30 mt-6 border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
      <nav aria-label="Profile sections" className="mx-auto max-w-7xl px-4 sm:px-6">
        <ul ref={listRef} className="scrollbar-none -mb-px flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const active = isActive(tab)
            return (
              <li key={tab.href} className="shrink-0">
                <Link
                  ref={active ? activeRef : undefined}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group/tab relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200",
                    "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:transition-all after:duration-300",
                    active
                      ? "text-foreground after:bg-primary"
                      : "text-muted-foreground after:scale-x-0 after:bg-primary/60 hover:text-primary hover:after:scale-x-100",
                  )}
                >
                  <span className="transition-transform duration-200 group-hover/tab:scale-105">{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-px text-[10px] tabular-nums transition-colors",
                        active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground group-hover/tab:bg-primary/10",
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
