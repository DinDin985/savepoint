import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import {
  ActivityIcon,
  ArrowRightIcon,
  BookmarkIcon,
  CompassIcon,
  Gamepad2Icon,
  SparklesIcon,
  UserIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user/user-avatar"
import type { SessionUser } from "@/lib/auth/current-user"
import type { UserHomeSnapshot } from "@/lib/catalog/community"
import { formatNumber } from "@/lib/format"
import type { GameSummary } from "@/lib/games/core"
import { cn } from "@/lib/utils"
import { CoverArt } from "./cover-art"

/** Signed-out hero: headline, pitch, CTAs and (via `marquee`) a drifting wall of cover art. */
export function SignedOutHero({ marquee }: { marquee: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-white/5" aria-labelledby="hero-title">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-8 text-center sm:px-6 sm:pt-20 sm:pb-10">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-pixel text-[10px] tracking-[0.25em] text-primary uppercase">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Press start
        </p>
        <h1
          id="hero-title"
          className="mx-auto mt-5 max-w-4xl text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl"
        >
          Your gaming life,{" "}
          <span className="bg-gradient-to-r from-primary via-[color-mix(in_oklch,var(--primary),var(--playing)_45%)] to-playing bg-clip-text text-transparent">
            logged.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
          Rate and review every game you play, keep a wishlist of what&apos;s next, show off your Top 10 and see what
          your friends are playing — from Steam and Epic hits to Nintendo Switch favourites.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-11 w-full px-5 text-base sm:w-auto">
            <Link href="/sign-up">
              Create your free account
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 w-full px-5 text-base sm:w-auto">
            <Link href="/games">
              <CompassIcon data-icon="inline-start" />
              Browse games
            </Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Free forever · Already a member?{" "}
          <Link
            href="/sign-in?next=%2F"
            className="-my-2 inline-block py-2 font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
      {marquee}
    </section>
  )
}

/** Signed-in hero: greeting, quick links with counts and what you're playing now. */
export function SignedInHero({ user, snapshot }: { user: SessionUser; snapshot: UserHomeSnapshot | null }) {
  const base = `/u/${user.username}`
  return (
    <section className="relative overflow-hidden border-b border-white/5" aria-labelledby="hero-title">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_0%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-4">
            <UserAvatar user={user} size="lg" className="ring-2 ring-primary/40" />
            <div className="min-w-0">
              <p className="font-pixel text-[10px] tracking-[0.25em] text-primary uppercase">Player 1 ready</p>
              <h1 id="hero-title" className="mt-1 text-2xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
                Welcome back, <span className="break-words text-primary">{user.displayName}</span>
              </h1>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickLink href={base} icon={<UserIcon />} label="Your profile" detail={snapshot ? `${formatNumber(snapshot.played)} played` : "@" + user.username} tone="primary" />
            <QuickLink
              href={`${base}/playing`}
              icon={<Gamepad2Icon />}
              label="Playing"
              detail={snapshot ? `${formatNumber(snapshot.playing)} in progress` : "Now playing"}
              tone="playing"
            />
            <QuickLink
              href={`${base}/wishlist`}
              icon={<BookmarkIcon />}
              label="Wishlist"
              detail={snapshot ? `${formatNumber(snapshot.wishlisted)} saved` : "Up next"}
              tone="wishlist"
            />
            <QuickLink href="/feed" icon={<ActivityIcon />} label="Activity feed" detail="What friends are up to" tone="liked" />
          </div>
        </div>

        <NowPlaying games={snapshot?.nowPlaying ?? []} playingHref={`${base}/playing`} />
      </div>
    </section>
  )
}

const toneClasses = {
  primary: "text-primary group-hover/quick:bg-primary/15 group-hover/quick:border-primary/40",
  playing: "text-playing group-hover/quick:bg-playing/15 group-hover/quick:border-playing/40",
  wishlist: "text-wishlist group-hover/quick:bg-wishlist/15 group-hover/quick:border-wishlist/40",
  liked: "text-liked group-hover/quick:bg-liked/15 group-hover/quick:border-liked/40",
} as const

function QuickLink({
  href,
  icon,
  label,
  detail,
  tone,
}: {
  href: string
  icon: ReactNode
  label: string
  detail: string
  tone: keyof typeof toneClasses
}) {
  return (
    <Link
      href={href}
      className="group/quick hover-lift flex min-w-0 flex-col gap-2 rounded-xl border border-white/5 bg-card/60 p-3 transition-all duration-200 hover:scale-[1.03] hover:border-white/15 hover:bg-card sm:p-4"
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-lg border border-white/5 bg-white/5 transition-all duration-200 group-hover/quick:scale-110 [&_svg]:size-4.5",
          toneClasses[tone],
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
    </Link>
  )
}

function NowPlaying({ games, playingHref }: { games: readonly GameSummary[]; playingHref: string }) {
  if (games.length === 0) {
    return (
      <Link
        href="/games"
        className="group/np hover-lift flex items-center gap-4 rounded-xl border border-dashed border-white/10 bg-card/40 p-4 transition-all duration-200 hover:scale-[1.02] hover:border-primary/50 lg:w-80"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover/np:scale-110 group-hover/np:rotate-6">
          <SparklesIcon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Not playing anything?</span>
          <span className="block text-xs text-muted-foreground">Find your next obsession and mark it as playing.</span>
        </span>
        <ArrowRightIcon className="ml-auto size-4 shrink-0 text-muted-foreground transition-all group-hover/np:translate-x-1 group-hover/np:text-primary" />
      </Link>
    )
  }
  return (
    <div className="lg:w-80">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-pixel text-[10px] tracking-[0.2em] text-playing uppercase">Now playing</p>
        <Link
          href={playingHref}
          className="-my-2 py-2 pl-3 text-xs text-muted-foreground transition-colors hover:text-playing"
        >
          View all
        </Link>
      </div>
      <div className="flex gap-2">
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/games/${game.slug}`}
            title={game.title}
            aria-label={game.title}
            className="group/np relative aspect-[2/3] w-[23%] overflow-hidden rounded-md bg-muted ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:ring-2 hover:ring-playing lg:w-[4.5rem]"
          >
            <span
              className={cn(
                "absolute inset-0 transition-all duration-500",
                game.hoverImage !== game.coverImage ? "group-hover/np:opacity-0" : "group-hover/np:scale-110",
              )}
            >
              <CoverArt src={game.coverImage} sizes="80px" />
            </span>
            {game.hoverImage !== game.coverImage && (
              <Image
                src={game.hoverImage}
                alt=""
                fill
                sizes="80px"
                className="scale-110 object-cover opacity-0 transition-all duration-500 group-hover/np:scale-100 group-hover/np:opacity-100"
              />
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
