import Link from "next/link"
import { Logo } from "./logo"

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/5 bg-black/20">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            Log every run. Rate every game. Find your next obsession — and see what your friends are playing.
          </p>
        </div>
        <FooterCol
          title="Explore"
          links={[
            ["/games", "All games"],
            ["/categories", "Categories"],
            ["/categories/tier/indie", "Indie"],
            ["/categories/platform/nintendo", "Nintendo"],
          ]}
        />
        <FooterCol
          title="Community"
          links={[
            ["/members", "Members"],
            ["/feed", "Activity"],
          ]}
        />
        <FooterCol
          title="Data"
          links={[
            ["https://store.steampowered.com/", "Steam"],
            ["https://store.epicgames.com/", "Epic Games Store"],
            ["https://steamdb.info/", "SteamDB"],
            ["https://www.wikipedia.org/", "Wikipedia"],
          ]}
        />
      </div>
      <p className="mx-auto max-w-7xl px-4 pb-8 text-xs text-muted-foreground/70 sm:px-6">
        Game art, descriptions and store reviews belong to their respective owners and are shown via public Steam, Epic
        Games Store and Wikipedia data. Savepoint is a fan-made project and is not affiliated with Valve, Epic Games or
        Nintendo.
      </p>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</p>
      <ul className="space-y-2 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link
              href={href}
              className="text-foreground/80 transition-colors hover:text-primary"
              {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
