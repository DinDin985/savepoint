import Link from "next/link"
import {
  BookmarkIcon,
  CalendarIcon,
  ChartColumnBigIcon,
  ChartPieIcon,
  CircleCheckIcon,
  ClockIcon,
  CompassIcon,
  Gamepad2Icon,
  HeartIcon,
  LayersIcon,
  ListChecksIcon,
  LogInIcon,
  MessageSquareTextIcon,
  MonitorIcon,
  PaletteIcon,
  SparklesIcon,
  StarIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  TrophyIcon,
} from "lucide-react"
import { RatingStars } from "@/components/game/rating-stars"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { formatNumber } from "@/lib/format"
import type { StatsUser, UserStats } from "@/lib/stats/types"
import { cn } from "@/lib/utils"
import { ChartCard } from "./chart-card"
import {
  ActivityAreaChart,
  CategoryBarChart,
  ColumnChart,
  DonutChart,
  RatingDistributionChart,
  StackedShareBar,
} from "./charts"
import { GameRow } from "./game-row"
import { StatTile } from "./stat-tile"

export type StatsViewer = { readonly username: string } | null

const starsText = (rating: number) =>
  (rating / 2).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0)

function deltaText(delta: number | null): { text: string; tone: "up" | "down" | "even" } | null {
  if (delta === null) return null
  const stars = delta / 2
  if (Math.abs(stars) < 0.05) return { text: "Rates in line with other members", tone: "even" }
  const amount = Math.abs(stars).toLocaleString("en-US", { maximumFractionDigits: 1 })
  return stars > 0
    ? { text: `Rates ${amount}★ higher than other members`, tone: "up" }
    : { text: `Rates ${amount}★ lower than other members`, tone: "down" }
}

/** Banner nudging signed-out visitors to sign in, and signed-in visitors to compare. */
function ViewerBanner({ user, viewer, isOwner }: { user: StatsUser; viewer: StatsViewer; isOwner: boolean }) {
  if (isOwner) return null
  if (!viewer) {
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-primary/10 p-4 ring-1 ring-primary/25 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          <span className="font-semibold">Want numbers like these?</span>{" "}
          <span className="text-muted-foreground">Sign in to log your games and build your own stats page.</span>
        </p>
        <Button asChild size="sm" className="self-start max-sm:h-9 sm:self-auto">
          <Link href={`/sign-in?next=${encodeURIComponent(`/u/${user.username}/stats`)}`}>
            <LogInIcon data-icon="inline-start" />
            Sign in
          </Link>
        </Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted/40 p-4 ring-1 ring-white/5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">Curious how you compare with {user.displayName}?</p>
      <Button asChild size="sm" variant="outline" className="self-start max-sm:h-9 hover:text-primary sm:self-auto">
        <Link href={`/u/${viewer.username}/stats`}>
          <ChartColumnBigIcon data-icon="inline-start" />
          See your stats
        </Link>
      </Button>
    </div>
  )
}

/** Whole-page empty state (no logs and no reviews yet). */
export function UserStatsEmpty({ user, viewer, isOwner }: { user: StatsUser; viewer: StatsViewer; isOwner: boolean }) {
  return (
    <Empty className="rounded-2xl border border-dashed bg-card/40 py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChartColumnBigIcon />
        </EmptyMedia>
        <EmptyTitle className="text-lg">{isOwner ? "Your stats start with your first log" : "No stats yet"}</EmptyTitle>
        <EmptyDescription>
          {isOwner
            ? "Mark games as played, rate them, review them or add them to your wishlist — charts for your ratings, genres, platforms and more build up here automatically."
            : `${user.displayName} hasn't logged any games yet. Check back once they've played a few.`}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row flex-wrap justify-center">
        {isOwner ? (
          <Button asChild className="max-sm:h-9">
            <Link href="/games">
              <CompassIcon data-icon="inline-start" />
              Browse games to log
            </Link>
          </Button>
        ) : (
          <>
            <Button asChild variant="outline" className="max-sm:h-9 hover:text-primary">
              <Link href="/games">
                <CompassIcon data-icon="inline-start" />
                Explore games
              </Link>
            </Button>
            {!viewer && (
              <Button asChild className="max-sm:h-9">
                <Link href={`/sign-in?next=${encodeURIComponent(`/u/${user.username}/stats`)}`}>
                  <LogInIcon data-icon="inline-start" />
                  Sign in to start yours
                </Link>
              </Button>
            )}
          </>
        )}
      </EmptyContent>
    </Empty>
  )
}

/** Letterboxd-style stats page body for /u/[username]/stats (header & tabs come from the profile layout). */
export function UserStatsView({
  user,
  stats,
  viewer,
  isOwner,
}: {
  user: StatsUser
  stats: UserStats
  viewer: StatsViewer
  isOwner: boolean
}) {
  const t = stats.totals
  const base = `/u/${user.username}`
  // /u/[username]/games understands ?filter=played|playing|liked|rated and ?sort=recent|rating|title
  const libraryHref = (filter: "played" | "liked" | "rated", sort?: "rating") =>
    `${base}/games?filter=${filter}${sort ? `&sort=${sort}` : ""}`
  const whose = isOwner ? "your" : `${user.displayName}'s`
  const Whose = isOwner ? "Your" : `${user.displayName}'s`
  const delta = deltaText(t.communityDelta)
  const topRating = stats.ratingDistribution.reduce<{ label: string; count: number } | null>(
    (best, b) => (b.count > 0 && (!best || b.count >= best.count) ? b : best),
    null,
  )
  const topGenre = stats.genres[0]
  const playedTotal = stats.tiers.reduce((s, d) => s + d.count, 0)
  const activityTotal = stats.activity.reduce((s, m) => s + m.total, 0)
  const nintendo = stats.platforms.find((p) => p.slug === "nintendo")

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-1">
        <span className="font-pixel text-[11px] tracking-widest text-primary uppercase">Stats</span>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {isOwner ? "Your stats" : `${user.displayName} in numbers`}
        </h2>
        <p className="text-sm text-muted-foreground">
          Lifetime numbers from {whose} game diary — {formatNumber(t.logged)} {t.logged === 1 ? "game" : "games"}{" "}
          logged.
        </p>
      </header>

      <ViewerBanner user={user} viewer={viewer} isOwner={isOwner} />

      {/* ── Headline tiles ─────────────────────────────────────────────── */}
      <section aria-label="Totals" className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <StatTile
          icon={<ListChecksIcon className="size-3.5" />}
          label="Logged"
          value={formatNumber(t.logged)}
          sub="games in the diary"
          href={`${base}/games`}
          tooltip="Every game in the diary — played, playing, wishlisted or liked."
        />
        <StatTile
          icon={<CircleCheckIcon className="size-3.5 text-played" />}
          label="Played"
          value={formatNumber(t.played)}
          sub={`${pct(t.played, t.logged)}% of logs`}
          href={libraryHref("played")}
          tooltip="Games marked as played (rating or reviewing a game also counts)."
        />
        <StatTile
          icon={<Gamepad2Icon className="size-3.5 text-playing" />}
          label="Playing"
          value={formatNumber(t.playing)}
          sub="right now"
          href={`${base}/playing`}
          tooltip="Games currently in progress."
        />
        <StatTile
          icon={<BookmarkIcon className="size-3.5 text-wishlist" />}
          label="Wishlist"
          value={formatNumber(t.wishlisted)}
          sub="up next"
          href={`${base}/wishlist`}
          tooltip="Games waiting to be played."
        />
        <StatTile
          icon={<HeartIcon className="size-3.5 text-liked" />}
          label="Liked"
          value={formatNumber(t.liked)}
          sub={`${pct(t.liked, t.played)}% of played`}
          href={libraryHref("liked")}
          tooltip="Games given a heart."
        />
        <StatTile
          icon={<MessageSquareTextIcon className="size-3.5" />}
          label="Reviews"
          value={formatNumber(t.reviews)}
          sub={
            t.reviews > 0 ? (
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-0.5 text-steam-blue">
                  <ThumbsUpIcon className="size-3" aria-hidden /> {formatNumber(t.recommended)}
                  <span className="sr-only">recommended,</span>
                </span>
                <span className="flex items-center gap-0.5 text-steam-mixed">
                  <ThumbsDownIcon className="size-3" aria-hidden /> {formatNumber(t.notRecommended)}
                  <span className="sr-only">not recommended</span>
                </span>
              </span>
            ) : (
              "none yet"
            )
          }
          href={`${base}/reviews`}
          tooltip="Reviews written, split into recommended and not recommended."
        />
        <StatTile
          icon={<StarIcon className="size-3.5 text-star" fill="currentColor" strokeWidth={0} />}
          label="Avg rating"
          value={
            t.averageRating === null ? (
              "—"
            ) : (
              <span className="inline-flex items-baseline gap-1">
                {starsText(t.averageRating)}
                <span className="text-base text-star">★</span>
              </span>
            )
          }
          sub={
            t.ratings > 0 ? `${formatNumber(t.ratings)} ${t.ratings === 1 ? "rating" : "ratings"}` : "no ratings yet"
          }
          href={t.ratings > 0 ? libraryHref("rated", "rating") : undefined}
          tooltip="Average rating given, on the 5-star scale."
        />
        <StatTile
          icon={<ClockIcon className="size-3.5" />}
          label="Hours"
          value={t.totalHours === null ? "—" : formatNumber(Math.round(t.totalHours))}
          sub={
            t.hoursReviews > 0
              ? `from ${formatNumber(t.hoursReviews)} ${t.hoursReviews === 1 ? "review" : "reviews"}`
              : "add hours to reviews"
          }
          tooltip="Total hours played, summed from the hours recorded on reviews."
        />
      </section>

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <ChartCard
          title="Ratings"
          icon={<StarIcon className="size-4 text-star" fill="currentColor" strokeWidth={0} />}
          description={topRating ? `Most given: ${topRating.label}` : "How generous the stars are"}
          action={
            t.averageRating !== null ? (
              <span className="flex flex-col items-end gap-0.5">
                <RatingStars rating={t.averageRating} size="sm" />
                <span className="text-[11px] text-muted-foreground tabular-nums">avg {starsText(t.averageRating)}</span>
              </span>
            ) : undefined
          }
          empty={
            t.ratings === 0
              ? { title: "No ratings yet", description: "Rated games show up here, from ½★ to 5★." }
              : null
          }
        >
          <div className="space-y-3">
            <RatingDistributionChart data={stats.ratingDistribution} />
            {delta && (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 font-normal",
                  delta.tone === "up" && "text-primary",
                  delta.tone === "down" && "text-liked",
                  delta.tone === "even" && "text-muted-foreground",
                )}
              >
                <SparklesIcon className="size-3" aria-hidden />
                {delta.text}
              </Badge>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Activity"
          icon={<CalendarIcon className="size-4 text-primary" />}
          description={`${formatNumber(activityTotal)} ${activityTotal === 1 ? "event" : "events"} in the last 12 months`}
          empty={
            activityTotal === 0
              ? {
                  title: "Quiet year",
                  description: "Logs, ratings, reviews and wishlist adds from the last 12 months chart here.",
                }
              : null
          }
        >
          <ActivityAreaChart data={stats.activity} />
        </ChartCard>

        <ChartCard
          title="Genres"
          icon={<LayersIcon className="size-4 text-primary" />}
          description={
            topGenre ? `Most played: ${topGenre.label} · click a bar to browse` : "Top genres among played games"
          }
          empty={
            stats.genres.length === 0
              ? { title: "No genres yet", description: "Play or rate a few games to see which genres dominate." }
              : null
          }
        >
          <CategoryBarChart
            data={stats.genres}
            color="var(--chart-1)"
            label="Top genres chart"
            browseLabel="Browse these genres"
          />
        </ChartCard>

        <ChartCard
          title="Art styles"
          icon={<PaletteIcon className="size-4 text-chart-4" />}
          description="Share of art-style tags across played games"
          empty={
            stats.artStyles.length === 0
              ? { title: "No art styles yet", description: "Pixel art or photorealism? Play a few games to find out." }
              : null
          }
        >
          <DonutChart data={stats.artStyles} centerLabel="style tags" label="Art styles chart" />
        </ChartCard>

        <ChartCard
          title="Studio size"
          icon={<TrophyIcon className="size-4 text-chart-3" />}
          description="Triple-A blockbusters vs. Double-A vs. indie among played games"
          empty={
            playedTotal === 0
              ? { title: "Nothing played yet", description: "Blockbuster or indie darling? Played games split here." }
              : null
          }
        >
          <StackedShareBar data={stats.tiers} label="Studio size split" />
        </ChartCard>

        <ChartCard
          title="Platforms"
          icon={<MonitorIcon className="size-4 text-chart-2" />}
          description={
            nintendo && nintendo.count > 0
              ? `${formatNumber(nintendo.count)} played ${nintendo.count === 1 ? "game is" : "games are"} on Nintendo · a game counts once per platform it's on`
              : "PC, Nintendo, PlayStation and Xbox · a game counts once per platform it's on"
          }
          empty={
            stats.platforms.every((p) => p.count === 0)
              ? {
                  title: "No platforms yet",
                  description: "PC, Nintendo, PlayStation or Xbox — played games are counted here.",
                }
              : null
          }
        >
          <CategoryBarChart
            data={stats.platforms}
            color="var(--chart-2)"
            label="Platforms chart"
            browseLabel="Browse these platforms"
          />
        </ChartCard>

        <ChartCard
          title="Release decades"
          icon={<ChartColumnBigIcon className="size-4 text-chart-4" />}
          description="When the played games came out"
          empty={
            stats.decades.length === 0
              ? {
                  title: "No release years yet",
                  description: "Retro or brand new? Played games are bucketed by decade.",
                }
              : null
          }
        >
          <ColumnChart data={stats.decades} color="var(--chart-4)" label="Release decades chart" />
        </ChartCard>

        <ChartCard
          title="Verdicts"
          icon={<ChartPieIcon className="size-4 text-steam-blue" />}
          description="Recommended vs. not recommended reviews"
          empty={
            t.reviews === 0
              ? { title: "No reviews yet", description: "Thumbs up or thumbs down — review verdicts are tallied here." }
              : null
          }
        >
          <VerdictSplit recommended={t.recommended} notRecommended={t.notRecommended} reviewsHref={`${base}/reviews`} />
        </ChartCard>
      </div>

      {/* ── Game rows ──────────────────────────────────────────────────── */}
      <GameRow
        title="Highest rated"
        icon={<StarIcon className="size-4 text-star" fill="currentColor" strokeWidth={0} />}
        href={libraryHref("rated", "rating")}
        linkLabel="All rated games"
        items={stats.highestRated.map((h) => ({ game: h.game, userRating: h.rating }))}
        empty={
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {Whose} favourites appear here once {isOwner ? "you rate" : "they rate"} a few games.
          </p>
        }
      />
      <GameRow
        title="Up next (wishlist)"
        icon={<BookmarkIcon className="size-4 text-wishlist" />}
        count={t.wishlisted}
        href={`${base}/wishlist`}
        linkLabel="Full wishlist"
        items={stats.wishlist.map((game) => ({ game }))}
        empty={
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            <span>{isOwner ? "Your wishlist is empty." : `${user.displayName}'s wishlist is empty.`}</span>
            {isOwner && (
              <Button asChild size="sm" variant="outline" className="max-sm:h-9 hover:text-primary">
                <Link href="/games">
                  <CompassIcon data-icon="inline-start" />
                  Find something to play next
                </Link>
              </Button>
            )}
          </div>
        }
      />
    </div>
  )
}

function VerdictSplit({
  recommended,
  notRecommended,
  reviewsHref,
}: {
  recommended: number
  notRecommended: number
  reviewsHref: string
}) {
  const total = recommended + notRecommended
  const up = pct(recommended, total)
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-bold tracking-tight tabular-nums">{up}%</div>
          <div className="text-xs text-muted-foreground">of reviews recommend the game</div>
        </div>
        <Link
          href={reviewsHref}
          className="inline-flex min-h-9 shrink-0 items-center text-sm text-muted-foreground transition-all duration-200 hover:scale-105 hover:text-primary sm:min-h-0"
        >
          Read reviews <span aria-hidden>&nbsp;→</span>
        </Link>
      </div>
      <div
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${recommended} recommended, ${notRecommended} not recommended`}
      >
        {recommended > 0 && (
          <div
            className="h-full bg-steam-positive transition-all duration-300 hover:brightness-125"
            style={{ width: `${up}%` }}
          />
        )}
        {notRecommended > 0 && (
          <div className="h-full flex-1 bg-steam-negative transition-all duration-300 hover:brightness-125" />
        )}
      </div>
      <ul className="grid grid-cols-2 gap-2 text-sm">
        <li className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 ring-1 ring-white/5 transition-all duration-200 hover:-translate-y-0.5 hover:ring-steam-blue/50">
          <ThumbsUpIcon className="size-4 text-steam-blue" aria-hidden />
          <span className="font-semibold tabular-nums">{formatNumber(recommended)}</span>
          <span className="truncate text-xs text-muted-foreground">recommended</span>
        </li>
        <li className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 ring-1 ring-white/5 transition-all duration-200 hover:-translate-y-0.5 hover:ring-steam-negative/60">
          <ThumbsDownIcon className="size-4 text-steam-negative" aria-hidden />
          <span className="font-semibold tabular-nums">{formatNumber(notRecommended)}</span>
          <span className="truncate text-xs text-muted-foreground">not recommended</span>
        </li>
      </ul>
    </div>
  )
}
