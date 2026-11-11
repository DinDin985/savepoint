import { sql } from "drizzle-orm"
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

/* ──────────────────────────────────────────────────────────────────────────
 * JSON payload types stored in game columns (snapshotted from Steam / Epic /
 * Wikipedia by scripts/catalog/build-catalog.mjs → data/catalog.json).
 * ────────────────────────────────────────────────────────────────────────── */

export type EpicPoll = { title: string; text: string; emoji: string | null; votes: number }
export type EpicInfo = {
  productSlug: string
  namespace: string
  url: string
  averageRating: number | null
  polls: EpicPoll[]
}
export type StoreLinks = { steam: string | null; epic: string | null; nintendo: string | null }
export type Trailer = {
  name: string
  thumbnail: string | null
  /** Steam HLS (m3u8) stream — play with hls.js */
  hls: string | null
  /** YouTube video id — embed with youtube-nocookie */
  youtubeId: string | null
}
export type SteamReviewSnapshot = { desc: string; positive: number; negative: number; total: number }
export type PlayerStatsSnapshot = {
  current: number | null
  peak24h: number | null
  allTimePeak: number | null
  source: "steamcharts"
  fetchedAt: string
}

export type Tier = "aaa" | "aa" | "indie"
export type PlatformFamily = "pc" | "nintendo" | "playstation" | "xbox"
export type CategoryKind = "genre" | "art-style" | "tier" | "platform"

const now = sql`(unixepoch() * 1000)`

/* ── Users & auth ───────────────────────────────────────────────────────── */

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    /** lowercase, [a-z0-9_], 3–20 chars, unique */
    username: text("username").notNull(),
    /** lowercase, unique */
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    location: text("location"),
    /** 0–359, used for the generated gradient avatar */
    avatarHue: integer("avatar_hue").notNull().default(160),
    /** optional: use a game's cover art as avatar */
    avatarGameId: integer("avatar_game_id").references(() => games.id, { onDelete: "set null" }),
    /** a game's hero art used as the profile backdrop */
    bannerGameId: integer("banner_game_id").references(() => games.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [uniqueIndex("users_username_uq").on(t.username), uniqueIndex("users_email_uq").on(t.email)],
)

export const sessions = sqliteTable(
  "sessions",
  {
    /** sha-256 hex of the random session token (the raw token only lives in the cookie) */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
)

/* ── Catalog ────────────────────────────────────────────────────────────── */

export const games = sqliteTable(
  "games",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    source: text("source").$type<"steam" | "wikipedia">().notNull(),
    steamAppId: integer("steam_app_id"),
    wikipediaTitle: text("wikipedia_title"),
    epic: text("epic", { mode: "json" }).$type<EpicInfo | null>(),
    storeLinks: text("store_links", { mode: "json" }).$type<StoreLinks>().notNull(),
    platforms: text("platforms", { mode: "json" }).$type<PlatformFamily[]>().notNull(),
    shortDescription: text("short_description").notNull(),
    about: text("about", { mode: "json" }).$type<string[]>().notNull(),
    /** ISO yyyy-mm-dd or null when unreleased */
    releaseDate: text("release_date"),
    releaseYear: integer("release_year"),
    developers: text("developers", { mode: "json" }).$type<string[]>().notNull(),
    publishers: text("publishers", { mode: "json" }).$type<string[]>().notNull(),
    steamGenres: text("steam_genres", { mode: "json" }).$type<string[]>().notNull(),
    genres: text("genres", { mode: "json" }).$type<string[]>().notNull(),
    artStyles: text("art_styles", { mode: "json" }).$type<string[]>().notNull(),
    tier: text("tier").$type<Tier>().notNull(),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    coverImage: text("cover_image").notNull(),
    heroImage: text("hero_image"),
    headerImage: text("header_image"),
    screenshots: text("screenshots", { mode: "json" }).$type<string[]>().notNull(),
    trailers: text("trailers", { mode: "json" }).$type<Trailer[]>().notNull(),
    metacritic: integer("metacritic"),
    steamReviews: text("steam_reviews", { mode: "json" }).$type<SteamReviewSnapshot | null>(),
    playerStats: text("player_stats", { mode: "json" }).$type<PlayerStatsSnapshot | null>(),
    website: text("website"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [
    uniqueIndex("games_slug_uq").on(t.slug),
    index("games_steam_idx").on(t.steamAppId),
    index("games_release_idx").on(t.releaseDate),
  ],
)

/** Denormalised category membership for fast browse queries. */
export const gameCategories = sqliteTable(
  "game_categories",
  {
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    kind: text("kind").$type<CategoryKind>().notNull(),
    slug: text("slug").notNull(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.kind, t.slug] }), index("game_categories_kind_slug_idx").on(t.kind, t.slug)],
)

/* ── A user's relationship with a game (Letterboxd "log") ──────────────── */

export const libraryEntries = sqliteTable(
  "library_entries",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    played: integer("played", { mode: "boolean" }).notNull().default(false),
    playing: integer("playing", { mode: "boolean" }).notNull().default(false),
    wishlisted: integer("wishlisted", { mode: "boolean" }).notNull().default(false),
    liked: integer("liked", { mode: "boolean" }).notNull().default(false),
    /** half-star scale: 1 = ½★ … 10 = ★★★★★ ; null = unrated */
    rating: integer("rating"),
    startedPlayingAt: integer("started_playing_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.gameId] }),
    index("library_game_idx").on(t.gameId),
    index("library_user_updated_idx").on(t.userId, t.updatedAt),
  ],
)

/* ── Community reviews (one per user per game, Steam-style recommend flag) ─ */

export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    recommended: integer("recommended", { mode: "boolean" }).notNull(),
    hoursPlayed: real("hours_played"),
    containsSpoilers: integer("contains_spoilers", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [
    uniqueIndex("reviews_user_game_uq").on(t.userId, t.gameId),
    index("reviews_game_created_idx").on(t.gameId, t.createdAt),
  ],
)

/** "Was this review helpful? Yes / No / Funny" */
export const reviewVotes = sqliteTable(
  "review_votes",
  {
    reviewId: text("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 1 = helpful, -1 = not helpful, null = no helpfulness vote */
    helpful: integer("helpful"),
    funny: integer("funny", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [primaryKey({ columns: [t.reviewId, t.userId] })],
)

/* ── Social ─────────────────────────────────────────────────────────────── */

export const follows = sqliteTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followingId] }), index("follows_following_idx").on(t.followingId)],
)

/** A user's ranked "Top 10" showcase (positions 1–10). */
export const topGames = sqliteTable(
  "top_games",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.position] }), uniqueIndex("top_games_user_game_uq").on(t.userId, t.gameId)],
)

export type ActivityKind =
  | "rated"
  | "reviewed"
  | "played"
  | "playing"
  | "wishlisted"
  | "liked"
  | "followed"
  | "top_games"

/** Append-only activity log that powers the friends feed. */
export const activities = sqliteTable(
  "activities",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ActivityKind>().notNull(),
    gameId: integer("game_id").references(() => games.id, { onDelete: "cascade" }),
    targetUserId: text("target_user_id").references(() => users.id, { onDelete: "cascade" }),
    reviewId: text("review_id").references(() => reviews.id, { onDelete: "cascade" }),
    rating: integer("rating"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [index("activities_user_created_idx").on(t.userId, t.createdAt), index("activities_created_idx").on(t.createdAt)],
)

/** Small key/value table used by the bootstrapper (schema + catalog versions). */
export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
})

export type User = typeof users.$inferSelect
export type Game = typeof games.$inferSelect
export type LibraryEntry = typeof libraryEntries.$inferSelect
export type Review = typeof reviews.$inferSelect
export type ReviewVote = typeof reviewVotes.$inferSelect
export type Activity = typeof activities.$inferSelect
