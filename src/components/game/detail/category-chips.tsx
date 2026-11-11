import Link from "next/link"
import type { CategoryKind, Game } from "@/lib/db/schema"
import { categoryHref, categoryLabel } from "@/lib/taxonomy"
import { cn } from "@/lib/utils"

const kindStyle: Record<CategoryKind, string> = {
  genre: "hover:border-primary/60 hover:bg-primary/10 hover:text-primary",
  "art-style": "hover:border-wishlist/60 hover:bg-wishlist/10 hover:text-wishlist",
  tier: "hover:border-star/60 hover:bg-star/10 hover:text-star",
  platform: "hover:border-playing/60 hover:bg-playing/10 hover:text-playing",
}

const kindDot: Record<CategoryKind, string> = {
  genre: "bg-primary",
  "art-style": "bg-wishlist",
  tier: "bg-star",
  platform: "bg-playing",
}

/** Genre / art style / studio size / platform chips, each linking to its category page. */
export function CategoryChips({ game, className }: { game: Pick<Game, "genres" | "artStyles" | "tier" | "platforms">; className?: string }) {
  const chips: { kind: CategoryKind; slug: string }[] = [
    ...game.genres.map((slug) => ({ kind: "genre" as const, slug })),
    ...game.artStyles.map((slug) => ({ kind: "art-style" as const, slug })),
    { kind: "tier", slug: game.tier },
    ...game.platforms.map((slug) => ({ kind: "platform" as const, slug })),
  ]
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Categories">
      {chips.map(({ kind, slug }) => (
        <li key={`${kind}:${slug}`}>
          <Link
            href={categoryHref(kind, slug)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-foreground/85 backdrop-blur-sm pointer-coarse:min-h-9 pointer-coarse:px-3",
              "transition-all duration-200 ease-out hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              kindStyle[kind],
            )}
          >
            <span aria-hidden className={cn("size-1.5 rounded-full", kindDot[kind])} />
            {categoryLabel(kind, slug)}
          </Link>
        </li>
      ))}
    </ul>
  )
}
