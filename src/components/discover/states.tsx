import Link from "next/link"
import type { ReactNode } from "react"
import { LogInIcon, RotateCwIcon, SearchXIcon, ServerCrashIcon, SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Banner shown to signed-out visitors on read-only discovery pages. */
export function SignInCta({ next, message, className }: { next: string; message?: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:flex-row sm:items-center",
        className,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <SparklesIcon className="size-4" />
      </span>
      <p className="flex-1 text-sm text-muted-foreground">
        {message ?? (
          <>
            <span className="font-medium text-foreground">Played any of these?</span> Sign in to rate, review, wishlist and
            track what you&apos;re playing.
          </>
        )}
      </p>
      <div className="flex gap-2">
        <Button asChild variant="outline" className="h-9 px-3">
          <Link href="/sign-up">Create account</Link>
        </Button>
        <Button asChild className="h-9 px-3">
          <Link href={`/sign-in?next=${encodeURIComponent(next)}`}>
            <LogInIcon data-icon="inline-start" />
            Sign in
          </Link>
        </Button>
      </div>
    </div>
  )
}

/** Empty results with a CTA to reset. */
export function NoResults({
  title = "No games match those filters",
  description = "Try removing a filter or searching for something else.",
  action,
}: {
  title?: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <Empty className="border border-white/10 bg-card/30 py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-12 rounded-xl bg-primary/10 text-primary [&_svg:not([class*='size-'])]:size-6">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent className="flex-row justify-center">{action}</EmptyContent>}
    </Empty>
  )
}

/** Inline error state for a section/page whose data failed to load. */
export function LoadError({
  title = "Couldn't load games",
  description = "Something went wrong on our side. Give it another go.",
  retryHref,
  compact = false,
}: {
  title?: string
  description?: string
  retryHref: string
  compact?: boolean
}) {
  return (
    <Empty className={cn("border border-destructive/25 bg-destructive/5", compact ? "py-6" : "py-14")}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-10 rounded-xl bg-destructive/15 text-destructive">
          <ServerCrashIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline" className="h-9 px-3">
          <Link href={retryHref}>
            <RotateCwIcon data-icon="inline-start" />
            Try again
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export function GameGridSkeleton({ count = 18, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="aspect-[2/3] w-full rounded-md" />
      ))}
    </div>
  )
}
