import Link from "next/link"
import { Gamepad2Icon, MessageSquareTextIcon, StarIcon, UsersIcon } from "lucide-react"
import type { SiteStats } from "@/lib/catalog/community"
import { formatCompact, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Site-wide counters (games, members, ratings, reviews). */
export function StatsStrip({ stats }: { stats: SiteStats }) {
  const items = [
    { label: "Games", value: stats.games, href: "/games", icon: Gamepad2Icon, tone: "text-primary" },
    { label: "Members", value: stats.members, href: "/members", icon: UsersIcon, tone: "text-liked" },
    { label: "Ratings", value: stats.ratings, href: "/games?sort=rating", icon: StarIcon, tone: "text-star" },
    { label: "Reviews", value: stats.reviews, href: "/games", icon: MessageSquareTextIcon, tone: "text-playing" },
  ] as const
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/5 bg-card/40 sm:grid-cols-4">
      {items.map((item, i) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            "group/stat flex flex-col items-center gap-1 border-white/5 px-4 py-5 text-center transition-all duration-200 hover:bg-white/[0.03] sm:py-7",
            i % 2 === 0 && "border-r",
            i < 2 && "border-b sm:border-b-0",
            i === 1 && "sm:border-r",
          )}
        >
          <item.icon className={cn("size-4 transition-transform duration-300 group-hover/stat:scale-125", item.tone)} />
          <span
            className="text-2xl font-bold tracking-tight tabular-nums transition-transform duration-300 group-hover/stat:scale-110 sm:text-3xl"
            title={formatNumber(item.value)}
          >
            {item.value >= 10_000 ? formatCompact(item.value) : formatNumber(item.value)}
          </span>
          <span className="font-pixel text-[10px] tracking-[0.2em] text-muted-foreground uppercase transition-colors group-hover/stat:text-foreground">
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  )
}
