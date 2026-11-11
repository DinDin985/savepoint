import type { CategoryKind } from "@/lib/db/schema"

export type CategoryDef = {
  readonly slug: string
  readonly label: string
  readonly blurb: string
}

export const GENRES: readonly CategoryDef[] = [
  { slug: "action", label: "Action", blurb: "Reflexes, combos and adrenaline." },
  { slug: "adventure", label: "Adventure", blurb: "Journeys worth taking." },
  { slug: "rpg", label: "RPG", blurb: "Build a character, live a story." },
  { slug: "soulslike", label: "Soulslike", blurb: "Die, learn, try again." },
  { slug: "roguelike", label: "Roguelike", blurb: "Every run is different." },
  { slug: "metroidvania", label: "Metroidvania", blurb: "Interconnected worlds and new abilities." },
  { slug: "platformer", label: "Platformer", blurb: "Precision jumps and tight controls." },
  { slug: "shooter", label: "Shooter", blurb: "Aim true." },
  { slug: "strategy", label: "Strategy", blurb: "Think three moves ahead." },
  { slug: "simulation", label: "Simulation", blurb: "Live another life." },
  { slug: "survival", label: "Survival", blurb: "Gather, build, endure." },
  { slug: "horror", label: "Horror", blurb: "Lights off, headphones on." },
  { slug: "puzzle", label: "Puzzle", blurb: "Aha moments." },
  { slug: "open-world", label: "Open World", blurb: "Go anywhere, do anything." },
  { slug: "racing", label: "Racing", blurb: "Need for speed." },
  { slug: "fighting", label: "Fighting", blurb: "Frame data and footsies." },
  { slug: "sandbox", label: "Sandbox", blurb: "Your rules." },
  { slug: "narrative", label: "Narrative", blurb: "Stories that stay with you." },
  { slug: "deckbuilder", label: "Deckbuilder", blurb: "One more hand." },
  { slug: "party", label: "Party", blurb: "Couch chaos with friends." },
]

export const ART_STYLES: readonly CategoryDef[] = [
  { slug: "pixel-art", label: "Pixel Art", blurb: "Every pixel placed with intent." },
  { slug: "hand-drawn", label: "Hand-Drawn", blurb: "Frame-by-frame craft." },
  { slug: "cel-shaded", label: "Cel-Shaded", blurb: "Comic-book outlines, flat bold colour." },
  { slug: "photorealistic", label: "Photorealistic", blurb: "Is that a photo?" },
  { slug: "stylized-3d", label: "Stylized 3D", blurb: "3D with a strong artistic voice." },
  { slug: "low-poly", label: "Low-Poly", blurb: "Few polygons, lots of charm." },
  { slug: "painterly", label: "Painterly", blurb: "Brushstrokes in motion." },
  { slug: "voxel", label: "Voxel", blurb: "Built from blocks." },
  { slug: "anime", label: "Anime", blurb: "Big eyes, bigger feelings." },
  { slug: "minimalist", label: "Minimalist", blurb: "Less, but better." },
]

export const TIERS: readonly CategoryDef[] = [
  { slug: "aaa", label: "Triple-A", blurb: "Blockbusters from the biggest studios." },
  { slug: "aa", label: "Double-A", blurb: "Mid-budget gems with big ambition." },
  { slug: "indie", label: "Indie", blurb: "Small teams, singular visions." },
]

export const PLATFORMS: readonly CategoryDef[] = [
  { slug: "pc", label: "PC", blurb: "Steam, Epic and beyond." },
  { slug: "nintendo", label: "Nintendo", blurb: "Switch and Switch 2 favourites." },
  { slug: "playstation", label: "PlayStation", blurb: "Sony's consoles." },
  { slug: "xbox", label: "Xbox", blurb: "Microsoft's consoles." },
]

export const CATEGORY_KINDS: readonly { kind: CategoryKind; label: string; plural: string; items: readonly CategoryDef[] }[] = [
  { kind: "genre", label: "Genre", plural: "Genres", items: GENRES },
  { kind: "tier", label: "Studio Size", plural: "AAA & Indie", items: TIERS },
  { kind: "art-style", label: "Art Style", plural: "Art Styles", items: ART_STYLES },
  { kind: "platform", label: "Platform", plural: "Platforms", items: PLATFORMS },
]

export function categoryLabel(kind: CategoryKind, slug: string): string {
  return CATEGORY_KINDS.find((k) => k.kind === kind)?.items.find((i) => i.slug === slug)?.label ?? slug
}

export function isCategoryKind(value: string): value is CategoryKind {
  return CATEGORY_KINDS.some((k) => k.kind === value)
}

/** URL for a category page */
export const categoryHref = (kind: CategoryKind, slug: string) => `/categories/${kind}/${slug}`
