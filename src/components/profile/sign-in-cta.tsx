import Link from "next/link"
import { SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Call-to-action for signed-out visitors on read-only social pages. */
export function SignInCta({
  next,
  title = "Join Savepoint",
  description = "Log the games you play, pin your Top 10 and follow friends to see what they're playing.",
  className,
}: {
  next: string
  title?: string
  description?: string
  className?: string
}) {
  const nextParam = encodeURIComponent(next)
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 transition-all duration-300 hover:border-primary/50",
        className,
      )}
    >
      <SparklesIcon className="absolute -top-2 -right-2 size-16 rotate-12 text-primary/10" aria-hidden />
      <p className="font-pixel text-[10px] tracking-widest text-primary uppercase">Player 2 has entered</p>
      <h3 className="mt-1 font-bold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={`/sign-in?next=${nextParam}`}>Sign in</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/sign-up?next=${nextParam}`}>Create account</Link>
        </Button>
      </div>
    </div>
  )
}
