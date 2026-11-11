# Savepoint 🎮 — Letterboxd for video games

**Log every run. Rate every game. Find your next obsession.**

Savepoint is a social diary for video games, built in the spirit of Letterboxd: you keep a record of what you've
played, rate it with half-stars, write Steam-style reviews, wishlist what's next, show what you're currently playing,
pin a ranked **Top 10** to your profile, and follow friends to see what they're into. Every game page also pulls in
what the rest of the world thinks — live **Steam reviews** (with a Steam-style positive/negative chart), **Epic Games
Store** player ratings, and **live Steam player counts** with 24-hour and all-time peaks.

- **Live demo:** https://savepoint-two-alpha.vercel.app
- **Demo video:** _added after recording_

## Who it's for

People who play a lot of games and want one place to remember them — what they loved, what they bounced off, and what
their friends are playing right now — across Steam, Epic *and* Nintendo.

## Features

| Area | What you can do |
| --- | --- |
| **Accounts** | Real sign-up / sign-in (username + email + password). Passwords hashed with scrypt; sessions are random tokens stored hashed in SQLite and sent as httpOnly cookies. |
| **Game pages** | Cover art, hero art, genres, art style, studio size, platforms, release date, developer/publisher, Steam summary, trailers (Steam HLS streams / YouTube), screenshot gallery, store links. |
| **Your library** | Half-star rating, Steam-style review (recommended / not recommended, hours played, spoiler flag), **Played**, **Currently playing**, **Wishlist**, **Like** — with business rules (e.g. rating a game marks it played and removes it from your wishlist). |
| **Reviews** | Tabs for Savepoint community reviews, Steam reviews (live) and Epic Games Store ratings (live); filter Most helpful / Recent and All / Positive / Negative; Steam-style histogram chart and proportion bar; helpful / funny votes on community reviews. |
| **Player stats** | Current players (Steam Web API, auto-refreshing), 24-hour peak, all-time peak and monthly history (SteamCharts), with deep links to SteamDB. |
| **Discover** | Home page with featured carousel and curated rows, search + filters (genre, art style, AAA / AA / indie, platform), category pages for genres, triple-A vs indie, art styles and Nintendo. |
| **Social** | Profiles with a Top 10 showcase, follow / unfollow, followers & following, friends activity feed, members directory, per-user stats page with charts. |

## Tech stack

- **TypeScript** + **Next.js 16** (App Router, Server Components, Server Actions, Turbopack)
- **Effect v4** for all server logic — typed errors, services/layers, retries & timeouts for external APIs, Schema validation
- **SQLite** via libSQL + **Drizzle ORM** (local file in development, Turso in production); migrations are embedded and applied automatically on boot, and the game catalog is seeded automatically
- **shadcn/ui** (components installed with the shadcn CLI) + Tailwind CSS v4, Recharts, hls.js
- Data: Steam Store & Steam Web APIs, SteamCharts, Epic Games Store, Wikipedia/Wikidata (Nintendo games)

## Running locally

Requirements: Node.js 20+ (developed on Node 24) and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000 and create an account. No environment variables are needed locally: the app creates
`local.db` (SQLite), applies migrations and seeds ~70 games on the first request.

Other scripts:

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # production build
npm run catalog:build  # re-fetch the game catalog from Steam / Epic / Wikipedia into data/catalog.json
npm run db:generate    # after editing src/lib/db/schema.ts: generate + embed a new migration
```

### Production (Vercel + Turso)

Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (the Turso integration on the Vercel Marketplace adds them
automatically). Without them the app falls back to a temporary SQLite file in `/tmp`, so data won't persist.

## Project structure

```
src/
  app/            routes (game pages, browse, categories, profiles, feed, settings, auth)
  actions/        server actions (auth, library, reviews, social, profile)
  components/     UI (shadcn in components/ui, feature components alongside)
  lib/
    effect/       Effect runtime, Database service, typed errors, validation, HTTP helpers
    auth/         password hashing, sessions, current user
    db/           Drizzle schema, libSQL client, embedded migrations, catalog bootstrapper
    library/ reviews/ steam/ catalog/ social/ stats/   domain logic (Effects)
data/catalog.json curated game catalog snapshot (built by scripts/catalog)
drizzle/          generated SQL migrations
```

## Status

_Filled in at submission: what works, what's incomplete._
