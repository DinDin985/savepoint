@AGENTS.md

# Savepoint — Letterboxd for video games

Users log games they've played, rate them (half-stars), write Steam-style reviews
(thumbs up/down + text), keep a wishlist, mark what they're currently playing,
like games, pin a ranked **Top 10** to their profile and follow other players.
Game pages also show Steam & Epic store reviews, a Steam-style positive/negative
chart, and live Steam player counts. There are **no paid features** (Stripe was deliberately removed — don't add payments).

## Stack (exact versions installed — do NOT install/upgrade packages)
- Next.js 16.4 (App Router, Turbopack, React 19.3) — `cacheComponents` is **off** (classic dynamic rendering).
- TypeScript strict, Tailwind v4, shadcn/ui (style `radix-nova`, Radix primitives, lucide icons).
- **Effect v4.1.3** (`effect` package) for all server-side logic.
- SQLite via libSQL (`@libsql/client`) + Drizzle ORM. Local file `local.db`; Turso in production.
- hls.js (Steam trailers are HLS streams), Recharts (via shadcn `chart`).

## Commands
- `npx tsc --noEmit` — typecheck (other people may be editing other files concurrently: only fix errors in files you own).
- `npx eslint <paths>` — lint your files.
- Do **not** run `next build` / `next dev` (several agents share this checkout; the lead runs the app).
- Scripts that import server modules: `npx tsx --conditions=react-server path/to/script.ts`
  (the `server-only` package throws without that condition). The DB auto-migrates + seeds on first use.

## Architecture rules
- **Server Components by default.** Add `"use client"` only for interactivity. Never import `@/lib/db/*`,
  `@/lib/effect/*`, `@/lib/auth/*` (except types) from client components.
- **Route props are Promises:** `export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> })`.
  Type them by hand like that (don't rely on generated `PageProps<...>` for new routes). `cookies()`/`headers()` are async.
- **Data access = Effect.** Write domain functions as Effects that require only `Database`:
  ```ts
  import { Effect } from "effect"
  import { and, eq, desc, sql } from "drizzle-orm"
  import { dbQuery } from "@/lib/effect/database"
  export const getWishlist = (userId: string) =>
    dbQuery("library.wishlist", (db) => db.select().from(libraryEntries).where(and(eq(libraryEntries.userId, userId), eq(libraryEntries.wishlisted, true))))
  ```
  - Run them in Server Components with `await runEffect(effect)` (`@/lib/effect/runtime`).
  - In Server Actions use `runAction(effect, { successMessage })` or `runAuthedAction((user) => effect)` from
    `@/lib/auth/current-user` → returns `ActionResult<A>` = `{ ok: true, data, message? } | { ok: false, error, fieldErrors? }`.
  - **Never call `redirect()` / `notFound()` / `revalidatePath()` inside an Effect** — return a value (e.g. `null`) and call them after `runEffect`/`runAction` returns.
  - Typed errors live in `@/lib/effect/errors`: `ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `DbError`, `ExternalApiError` (`yield* new ConflictError({ message })` fails the effect).
  - Validate untrusted input with Effect Schema: `yield* validate(MySchema, formToObject(formData))` (`@/lib/effect/validation`) → `ValidationError` with `fieldErrors`.
  - External HTTP: `fetchJson(url, Schema, { source: "steam", revalidate: 600 })`, `fetchText`, `postGraphql` from `@/lib/effect/http` (timeouts, retries, Next data-cache, typed `ExternalApiError`). Decode with Schema; unknown keys are ignored, so declare only what you use.
  - Multi-statement writes: use `db.batch([...])` (atomic) or `db.transaction(async (tx) => ...)`.
- Auth: `getCurrentUser()` (memoised per request, `SessionUser | null`), `requireUser(nextPath)` for protected pages (redirects to `/sign-in?next=`).
- Activity feed: call `logActivity({ userId, kind, gameId?, targetUserId?, reviewId?, rating? })` from `@/lib/activity` after meaningful actions (it never fails the caller).
- After mutations call `revalidatePath(...)` for the affected pages (e.g. `/games/${slug}`, `/u/${username}`).

## Effect v4 cheat sheet (verified against the installed 4.1.3)
```ts
import { Context, Data, Duration, Effect, Layer, Option, Schedule, Schema } from "effect"
Effect.gen(function* () { const x = yield* someEffect; return x })
Effect.fn("name")(function* (arg: string) { ... })          // traced function returning an Effect
Effect.tryPromise({ try: (signal) => fetch(url, { signal }), catch: (cause) => new MyError({ cause }) })
Effect.promise(() => p)                                      // promise that never rejects
Effect.catchTag("NotFoundError", (e) => Effect.succeed(null))  // also Effect.catchTags({...}), Effect.catch (all errors)
Effect.mapError, Effect.map, Effect.flatMap, Effect.tap, Effect.orElseSucceed(() => fallback), Effect.catch((e) => Effect.succeed(x))
Effect.all([a, b], { concurrency: "unbounded" })             // also object form: Effect.all({ a, b }, { concurrency: 3 })
Effect.forEach(items, (i) => eff, { concurrency: 4 })
Effect.timeout(Duration.seconds(5))                          // fails with TimeoutError (catchTag "TimeoutError")
Effect.retry({ schedule: Schedule.exponential(Duration.millis(200)), times: 2 })
Effect.result(eff)  // Effect<Result<A, E>> (v4 renamed Either → Result)   Effect.option(eff)
class MyError extends Data.TaggedError("MyError")<{ readonly message: string }> {}
class Svc extends Context.Service<Svc, { readonly f: () => Effect.Effect<number> }>()("app/Svc") {}  // (only the lead adds services)
// Schema (v4): checks are attached with .check(...)
Schema.Struct({ name: Schema.String.check(Schema.isMinLength(1, { message: "Required" }), Schema.isMaxLength(40)) })
Schema.Trim, Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: 10 })), Schema.Literals(["a","b"]),
Schema.optional(X), Schema.NullOr(X), Schema.Array(X), Schema.Union([A, B]), Schema.Boolean, Schema.Unknown
Schema.decodeUnknownEffect(S)(input) / Schema.decodeUnknownSync(S)(input) / Schema.decodeUnknownOption(S)(input)
type T = typeof S.Type
```
(If unsure about a v4 API, grep `node_modules/effect/dist/<Module>.d.ts` — doc comments include examples. `Schema.isBetween({ minimum, maximum })` is verified.)

## Data model (src/lib/db/schema.ts — owned by the lead; do not edit; ask in your report if you need a change)
- `users` (id uuid, username lowercase unique, displayName, bio, location, avatarHue, avatarGameId (game cover as avatar), bannerGameId (game hero art as profile backdrop))
- `sessions`, `games` (catalog snapshot: JSON columns `about`, `developers`, `publishers`, `genres`, `artStyles`, `platforms`, `screenshots`, `trailers {name, thumbnail, hls, youtubeId}`, `epic {productSlug, namespace, url, averageRating, polls}`, `storeLinks {steam, epic, nintendo}`, `steamReviews {desc, positive, negative, total}`, `playerStats {current, peak24h, allTimePeak, source, fetchedAt}`; `steamAppId` null for Nintendo/Epic-only games; `source: steam|wikipedia`)
- `game_categories (gameId, kind: genre|art-style|tier|platform, slug)` — denormalised for browse queries.
- `library_entries (userId, gameId, played, playing, wishlisted, liked, rating 1–10 half-stars | null, startedPlayingAt, createdAt, updatedAt)` PK(userId, gameId)
- `reviews (id uuid, userId, gameId, body, recommended bool, hoursPlayed, containsSpoilers, createdAt, updatedAt)` unique(userId, gameId)
- `review_votes (reviewId, userId, helpful 1|-1|null, funny bool)` PK(reviewId, userId)
- `follows (followerId, followingId)`, `top_games (userId, gameId, position 1–10)`, `activities (append-only feed log)`, `app_meta`.

### Library business rules (implemented in `src/lib/library/` by the game-page feature)
- Rating (1–10) ⇒ `played = true`, `wishlisted = false`. Liking ⇒ `played = true`.
- Saving a review ⇒ `played = true`, `wishlisted = false`.
- Wishlisting is rejected (`ConflictError`) if the game is already played or being played.
- Marking **playing** ⇒ `wishlisted = false`, `startedPlayingAt = now`. Stopping with "finished" ⇒ `played = true`.
- A row with every flag false, no rating and no review is deleted.

## Shared building blocks (owned by the lead — reuse, don't fork)
- `@/lib/games/core`: `GameSummary` type, `gameSummarySelect` + `toGameSummary` (select shape for poster cards incl. community avg rating), `getGameBySlug`, `getGameById`, `getGameSummariesByIds`, `getAllGameSummaries`, `avgRatingSql`, `ratingCountSql`.
- `@/components/game/game-card`: `<GameCard game size="xs|sm|md|lg" fluid rank userRating badge />` (portrait poster; on hover the cover cross-fades to a screenshot, lifts and scales) and `<GameGrid games />`.
- `@/components/game/rating-stars`: `<RatingStars rating={1..10} size="xs|sm|md|lg" showValue />` (read-only).
- `@/components/user/user-avatar`: `<UserAvatar user={{ username, displayName, avatarHue, avatarImage }} size="xs|sm|md|lg|xl" />`.
- `@/lib/taxonomy`: `GENRES`, `ART_STYLES`, `TIERS`, `PLATFORMS`, `CATEGORY_KINDS`, `categoryLabel(kind, slug)`, `categoryHref(kind, slug)`.
- `@/lib/format`: `formatNumber`, `formatCompact`, `formatReleaseDate`, `formatDate`, `timeAgo`, `ratingToStars`, `formatHours`, `steamScoreLabel(positive, total)`.
- shadcn components in `src/components/ui/` (all pre-installed): alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, button-group, card, carousel, chart, checkbox, collapsible, command, dialog, dropdown-menu, empty, field, hover-card, input, input-group, item, kbd, label, navigation-menu, pagination, popover, progress, radio-group, scroll-area, select, separator, sheet, skeleton, slider, sonner (`import { toast } from "sonner"`), spinner, switch, tabs, textarea, toggle, toggle-group, tooltip. Don't add new ones.

## Design language
- Dark-only "game launcher at 2am" look. Use theme tokens, not raw colours: `bg-background`, `bg-card`, `text-muted-foreground`, `text-primary` (save-crystal green), status colours `text-played`, `text-playing` (blue), `text-wishlist` (violet), `text-liked` (rose), `text-star` (amber). Steam review areas use `bg-steam-bg`, `bg-steam-panel`, `bg-steam-panel-2`, `text-steam-text`, `text-steam-muted`, `text-steam-blue`, `bg-steam-positive`, `bg-steam-negative`, `text-steam-mixed`.
- `font-pixel` (Silkscreen) for small accents only (ranks, badges, section kickers). Headings: `font-bold tracking-tight`.
- **Interactive everywhere:** buttons already scale on hover (shadcn Button is customised). Links/chips/tiles: `transition-all duration-200 hover:scale-105 hover:text-primary` or `hover-lift` utility. Any item with an image should swap/zoom its picture on hover (GameCard does this; tiles can cross-fade between two covers/screenshots).
- Page container: `mx-auto max-w-7xl px-4 sm:px-6` with `py-8`/`py-10`. Mobile-first & responsive (test mentally at 375px: no horizontal scroll, grids collapse, tables become cards).
- Use `next/image` (`images.unoptimized` is on; remote hosts allowed: *.steamstatic.com, upload.wikimedia.org, *.epicgames.com, i.ytimg.com, avatars.steamstatic.com).
- Empty states with `Empty` component + a helpful CTA. Loading states with `Skeleton` (`loading.tsx`).
- Toasts (`sonner`) for action feedback; disable buttons while pending (`useTransition` / `useActionState`), optimistic UI where natural (`useOptimistic`).

## Route map
`/` home · `/games` browse+search · `/games/[slug]` game page · `/categories` · `/categories/[kind]/[slug]` ·
`/u/[username]` profile (+ `/games`, `/reviews`, `/wishlist`, `/playing`, `/followers`, `/following`) · `/feed` · `/members` ·
`/u/[username]/stats` (stats & charts) · `/settings` profile · `/settings/top-games` · `/sign-in` · `/sign-up`.
