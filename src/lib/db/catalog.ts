import type {
  EpicInfo,
  PlatformFamily,
  PlayerStatsSnapshot,
  SteamReviewSnapshot,
  StoreLinks,
  Tier,
  Trailer,
} from "./schema"
import raw from "../../../data/catalog.json"

/** Shape of data/catalog.json (produced by scripts/catalog/build-catalog.mjs). */
export type CatalogGame = {
  slug: string
  title: string
  source: "steam" | "wikipedia"
  steamAppId: number | null
  wikipediaTitle: string | null
  epic: EpicInfo | null
  storeLinks: StoreLinks
  platforms: PlatformFamily[]
  shortDescription: string
  about: string[]
  releaseDate: string | null
  developers: string[]
  publishers: string[]
  steamGenres: string[]
  genres: string[]
  artStyles: string[]
  tier: Tier
  featured: boolean
  coverImage: string
  heroImage: string | null
  headerImage: string | null
  screenshots: string[]
  trailers: Trailer[]
  metacritic: number | null
  steamReviews: SteamReviewSnapshot | null
  playerStats: PlayerStatsSnapshot | null
  website: string | null
  warnings?: string[]
}

export type Catalog = { generatedAt: string; games: CatalogGame[] }

export const catalog = raw as unknown as Catalog
