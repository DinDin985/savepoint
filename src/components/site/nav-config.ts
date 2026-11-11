import { ART_STYLES, GENRES, TIERS } from "@/lib/taxonomy"

export const PRIMARY_NAV = [
  { href: "/games", label: "Games" },
  { href: "/categories", label: "Categories" },
  { href: "/members", label: "Members" },
] as const

export const BROWSE_SECTIONS = [
  {
    title: "Studio size",
    links: [
      ...TIERS.filter((t) => t.slug !== "aa").map((t) => ({ href: `/categories/tier/${t.slug}`, label: t.label, blurb: t.blurb })),
      { href: "/categories/platform/nintendo", label: "Nintendo", blurb: "Switch and Switch 2 favourites." },
    ],
  },
  {
    title: "Popular genres",
    links: GENRES.filter((g) => ["rpg", "roguelike", "metroidvania", "soulslike", "open-world", "platformer"].includes(g.slug)).map(
      (g) => ({ href: `/categories/genre/${g.slug}`, label: g.label, blurb: g.blurb }),
    ),
  },
  {
    title: "Art styles",
    links: ART_STYLES.filter((a) => ["pixel-art", "hand-drawn", "cel-shaded", "photorealistic", "painterly", "anime"].includes(a.slug)).map(
      (a) => ({ href: `/categories/art-style/${a.slug}`, label: a.label, blurb: a.blurb }),
    ),
  },
] as const
