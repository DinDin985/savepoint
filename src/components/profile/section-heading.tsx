import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Section title with a pixel-font kicker and an optional "See all" link. */
export function SectionHeading({
  kicker,
  title,
  href,
  linkLabel = "See all",
  action,
  className,
  id,
}: {
  kicker?: string
  title: ReactNode
  href?: string
  linkLabel?: string
  action?: ReactNode
  className?: string
  id?: string
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-3 border-b border-border pb-2", className)}>
      <div className="min-w-0">
        {kicker && <p className="font-pixel text-[10px] tracking-widest text-primary uppercase">{kicker}</p>}
        <h2 id={id} className="truncate text-lg font-bold tracking-tight">
          {title}
        </h2>
      </div>
      {action}
      {href && (
        <Link
          href={href}
          className="group/see inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-all duration-200 hover:scale-105 hover:text-primary"
        >
          {linkLabel}
          <ArrowRightIcon className="size-3.5 transition-transform duration-200 group-hover/see:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}
