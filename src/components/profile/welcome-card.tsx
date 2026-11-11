"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowRightIcon, CircleCheckIcon, StarIcon, TrophyIcon, UsersIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Dismissible onboarding card shown on your own profile after sign-up (?welcome=1). */
export function WelcomeCard({
  displayName,
  done,
}: {
  displayName: string
  done: { rated: boolean; topGames: boolean; following: boolean }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(true)
  if (!open) return null

  const steps = [
    {
      href: "/games",
      icon: StarIcon,
      title: "Rate your first game",
      body: "Browse the catalog and give something you've played a few stars.",
      done: done.rated,
    },
    {
      href: "/settings/top-games",
      icon: TrophyIcon,
      title: "Pick your Top 10",
      body: "Your all-time favourites, front and centre on your profile.",
      done: done.topGames,
    },
    {
      href: "/members",
      icon: UsersIcon,
      title: "Follow some players",
      body: "Their ratings, reviews and Top 10 updates land in your feed.",
      done: done.following,
    },
  ]
  const completed = steps.filter((s) => s.done).length

  const dismiss = () => {
    setOpen(false)
    router.replace(pathname ?? "/", { scroll: false })
  }

  return (
    <section
      aria-labelledby="welcome-heading"
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-[0_0_60px_-30px_var(--primary)] duration-500 animate-in fade-in slide-in-from-top-2 sm:p-6"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={dismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss welcome"
      >
        <XIcon />
      </Button>
      <p className="font-pixel text-[10px] tracking-widest text-primary uppercase">
        New game started · {completed}/{steps.length}
      </p>
      <h2 id="welcome-heading" className="mt-1 pr-10 text-xl font-bold tracking-tight sm:text-2xl">
        Welcome to Savepoint, {displayName}!
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Three quick quests to make this place yours.</p>
      <ol className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <li key={step.href}>
              <Link
                href={step.href}
                className={cn(
                  "group/step flex h-full gap-3 rounded-xl border bg-background/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-background/80",
                  step.done ? "border-primary/40" : "border-border",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/step:scale-110",
                    step.done ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  {step.done ? <CircleCheckIcon className="size-5" /> : <Icon className="size-4.5" />}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-semibold transition-colors group-hover/step:text-primary">
                    <span className="font-pixel text-[10px] text-muted-foreground">{i + 1}.</span>
                    <span className={cn(step.done && "line-through decoration-primary/60")}>{step.title}</span>
                    <ArrowRightIcon className="size-3.5 opacity-0 transition-all duration-200 group-hover/step:translate-x-0.5 group-hover/step:opacity-100" />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{step.body}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
