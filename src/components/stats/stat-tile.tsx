import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * Headline number tile for the stats page. Lifts and glows on hover; links to
 * the matching profile tab when `href` is given; explains itself in a tooltip.
 */
export function StatTile({
  icon,
  label,
  value,
  sub,
  href,
  tooltip,
  className,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  sub?: ReactNode
  href?: string
  tooltip: string
  className?: string
}) {
  const classes = cn(
    "group/stat relative flex h-full min-w-0 flex-col gap-1.5 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10 outline-none sm:p-4",
    "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 hover:ring-primary/50",
    "focus-visible:ring-2 focus-visible:ring-primary",
    className,
  )
  const body = (
    <>
      <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground transition-colors group-hover/stat:text-foreground">
        <span className="flex min-w-0 items-center gap-1.5">
          {icon}
          <span className="truncate">{label}</span>
        </span>
        {href && (
          <ArrowUpRightIcon
            className="size-3.5 shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover/stat:translate-x-0 group-hover/stat:text-primary group-hover/stat:opacity-100"
            aria-hidden
          />
        )}
      </span>
      <span className="text-2xl font-bold tracking-tight tabular-nums transition-colors duration-200 group-hover/stat:text-primary sm:text-3xl">
        {value}
      </span>
      {sub && <span className="min-h-4 text-[11px] leading-4 text-muted-foreground">{sub}</span>}
    </>
  )
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Link href={href} className={classes}>
            {body}
          </Link>
        ) : (
          <div tabIndex={0} className={classes}>
            {body}
          </div>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6} className="max-w-60 text-pretty">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
