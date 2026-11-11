import Link from "next/link"
import type { ComponentType } from "react"
import {
  ArrowRightIcon,
  BookmarkIcon,
  Gamepad2Icon,
  MessageSquareTextIcon,
  StarIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const FEATURES: readonly {
  title: string
  body: string
  icon: ComponentType<{ className?: string }>
  tone: string
}[] = [
  {
    title: "Rate",
    body: "Score every game you finish on a five-star scale — half stars included.",
    icon: StarIcon,
    tone: "text-star bg-star/10 group-hover/feature:bg-star/20 group-hover/feature:border-star/40",
  },
  {
    title: "Review",
    body: "Thumbs up or down, hours played and your take. Spoiler tags keep it fair.",
    icon: MessageSquareTextIcon,
    tone: "text-primary bg-primary/10 group-hover/feature:bg-primary/20 group-hover/feature:border-primary/40",
  },
  {
    title: "Wishlist",
    body: "Keep a list of the games you want to play next so nothing slips through.",
    icon: BookmarkIcon,
    tone: "text-wishlist bg-wishlist/10 group-hover/feature:bg-wishlist/20 group-hover/feature:border-wishlist/40",
  },
  {
    title: "Currently playing",
    body: "Show what's in your console right now and log it when the credits roll.",
    icon: Gamepad2Icon,
    tone: "text-playing bg-playing/10 group-hover/feature:bg-playing/20 group-hover/feature:border-playing/40",
  },
  {
    title: "Top 10",
    body: "Pin a ranked shelf of your all-time favourites to the top of your profile.",
    icon: TrophyIcon,
    tone: "text-star bg-star/10 group-hover/feature:bg-star/20 group-hover/feature:border-star/40",
  },
  {
    title: "Follow friends",
    body: "Follow other players and see their ratings and reviews in your feed.",
    icon: UsersIcon,
    tone: "text-liked bg-liked/10 group-hover/feature:bg-liked/20 group-hover/feature:border-liked/40",
  },
]

/** Signed-out explainer of what you can do with an account. */
export function FeatureGrid() {
  return (
    <div className="rounded-2xl border border-white/5 bg-card/40 p-5 sm:p-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-pixel text-[10px] tracking-[0.2em] text-primary uppercase">How it works</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Everything you play, in one place</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Savepoint is a diary for your games. It&apos;s free, and it takes ten seconds to start.
          </p>
        </div>
        <Button asChild size="lg" className="h-10 px-4">
          <Link href="/sign-up">
            Start your diary
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </div>
      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="group/feature hover-lift flex gap-3 rounded-xl border border-white/5 bg-background/40 p-4 transition-all duration-300 hover:scale-[1.02] hover:border-white/15 hover:bg-background/70"
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg border border-transparent transition-all duration-300 group-hover/feature:scale-110 group-hover/feature:-rotate-6",
                feature.tone,
              )}
            >
              <feature.icon className="size-5" />
            </span>
            <span>
              <span className="block font-semibold tracking-tight">{feature.title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{feature.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
