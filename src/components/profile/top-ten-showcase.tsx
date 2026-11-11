import Link from "next/link"
import { PlusIcon, TrophyIcon } from "lucide-react"
import { GameCard } from "@/components/game/game-card"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { TOP_GAMES_MAX, type TopGame } from "@/lib/profile/types"
import { SectionHeading } from "./section-heading"

/**
 * The Top 10 showcase: ranked posters (5×2 grid on desktop, horizontal scroll
 * on mobile). Your own profile shows empty "+" slots linking to the editor.
 */
export function TopTenShowcase({
  games,
  isOwn,
  displayName,
}: {
  games: readonly TopGame[]
  isOwn: boolean
  displayName: string
}) {
  const emptySlots = isOwn ? Math.max(0, TOP_GAMES_MAX - games.length) : 0
  return (
    <section aria-labelledby="top-ten-heading">
      <SectionHeading
        id="top-ten-heading"
        kicker="Hall of fame"
        title={isOwn ? "Your Top 10" : `${displayName}'s Top 10`}
        href={isOwn ? "/settings/top-games" : undefined}
        linkLabel={games.length ? "Edit" : "Pick games"}
      />
      {games.length === 0 ? (
        <Empty className="border border-dashed border-border bg-card/30 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrophyIcon className="text-star" />
            </EmptyMedia>
            <EmptyTitle>{isOwn ? "Your shelf of legends is empty" : "No Top 10 yet"}</EmptyTitle>
            <EmptyDescription>
              {isOwn
                ? "Pick the ten games that made you who you are — they'll be the first thing people see here."
                : `${displayName} hasn't picked their all-time favourites yet.`}
            </EmptyDescription>
          </EmptyHeader>
          {isOwn && (
            <EmptyContent>
              <Button asChild>
                <Link href="/settings/top-games">
                  <TrophyIcon data-icon="inline-start" />
                  Pick your Top 10
                </Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <ol className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pt-2 pb-3 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0">
          {games.map((t, i) => (
            <li key={t.game.id} className="w-28 shrink-0 snap-start sm:w-32 md:w-auto">
              <GameCard game={t.game} fluid rank={t.position} priority={i < 5} />
              <p className="mt-1.5 truncate text-center text-xs text-muted-foreground transition-colors hover:text-foreground">
                {t.game.title}
              </p>
            </li>
          ))}
          {Array.from({ length: emptySlots }, (_, i) => {
            const rank = games.length + i + 1
            return (
              <li key={`slot-${rank}`} className="w-28 shrink-0 snap-start sm:w-32 md:w-auto">
                <Link
                  href="/settings/top-games"
                  className="group/slot relative flex aspect-[2/3] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-card/30 text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-primary/60 hover:bg-primary/5 hover:text-primary"
                  aria-label={`Add a game at #${rank}`}
                >
                  <span className="absolute top-1 left-1.5 font-pixel text-2xl leading-none opacity-40">{rank}</span>
                  <PlusIcon className="size-6 transition-transform duration-300 group-hover/slot:rotate-90" />
                  <span className="text-[11px] font-medium">Add game</span>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
