import { DatabaseIcon, ExternalLinkIcon, GlobeIcon, ShoppingBagIcon, StoreIcon, type LucideIcon } from "lucide-react"
import type { Game } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

type StoreLink = {
  readonly key: string
  readonly label: string
  readonly href: string
  readonly icon: LucideIcon
  readonly className: string
}

/** Only plain http(s) links from the catalog snapshot are rendered (never `javascript:` & co). */
const safeUrl = (value: string | null | undefined): string | null => {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null
  } catch {
    return null
  }
}

/** Where to get the game: Steam, Epic Games Store, Nintendo eShop (+ SteamDB and the official site). */
export function StoreLinks({
  game: raw,
  className,
}: {
  game: Pick<Game, "storeLinks" | "steamAppId" | "website">
  className?: string
}) {
  const game = {
    steamAppId: raw.steamAppId && Number.isInteger(raw.steamAppId) && raw.steamAppId > 0 ? raw.steamAppId : null,
    website: safeUrl(raw.website),
    storeLinks: {
      steam: safeUrl(raw.storeLinks.steam),
      epic: safeUrl(raw.storeLinks.epic),
      nintendo: safeUrl(raw.storeLinks.nintendo),
    },
  }
  const links: StoreLink[] = []
  if (game.storeLinks.steam) {
    links.push({
      key: "steam",
      label: "Steam",
      href: game.storeLinks.steam,
      icon: StoreIcon,
      className:
        "border-steam-blue/30 bg-steam-bg text-steam-text hover:border-steam-blue hover:bg-steam-panel-2 hover:text-white hover:shadow-[0_0_24px_-8px_var(--steam-blue)]",
    })
  }
  if (game.storeLinks.epic) {
    links.push({
      key: "epic",
      label: "Epic Games Store",
      href: game.storeLinks.epic,
      icon: ShoppingBagIcon,
      className: "border-white/15 bg-black/40 text-foreground hover:border-foreground hover:bg-foreground hover:text-background",
    })
  }
  if (game.storeLinks.nintendo) {
    links.push({
      key: "nintendo",
      label: "Nintendo eShop",
      href: game.storeLinks.nintendo,
      icon: ShoppingBagIcon,
      className:
        "border-liked/40 bg-liked/10 text-foreground hover:border-liked hover:bg-liked hover:text-white hover:shadow-[0_0_24px_-8px_var(--liked)]",
    })
  }
  if (game.steamAppId) {
    links.push({
      key: "steamdb",
      label: "SteamDB",
      href: `https://steamdb.info/app/${game.steamAppId}/`,
      icon: DatabaseIcon,
      className: "border-white/10 bg-white/5 text-muted-foreground hover:border-white/30 hover:bg-white/10 hover:text-foreground",
    })
  }
  if (game.website) {
    links.push({
      key: "website",
      label: "Official site",
      href: game.website,
      icon: GlobeIcon,
      className: "border-white/10 bg-white/5 text-muted-foreground hover:border-white/30 hover:bg-white/10 hover:text-foreground",
    })
  }
  if (links.length === 0) return null

  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Stores and links">
      {links.map(({ key, label, href, icon: Icon, className: tone }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group/store inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold backdrop-blur-sm",
              "transition-all duration-200 ease-out hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              tone,
            )}
          >
            <Icon className="size-4" />
            {label}
            <ExternalLinkIcon className="size-3 opacity-50 transition-all duration-200 group-hover/store:translate-x-0.5 group-hover/store:-translate-y-0.5 group-hover/store:opacity-100" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
