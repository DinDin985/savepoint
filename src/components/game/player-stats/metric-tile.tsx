import type { ReactNode } from "react"
import { InfoIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * Interactive stat tile (hover lift + glow, keyboard focusable) with a tooltip
 * explaining the metric. Row layout on narrow containers, stacked from `@md`.
 * Server-safe (no hooks) so it can be used by server and client components.
 */
export function MetricTile({
  icon,
  label,
  value,
  footer,
  tooltip,
  className,
  valueClassName,
}: {
  icon?: ReactNode
  label: string
  value: ReactNode
  footer?: ReactNode
  tooltip: ReactNode
  className?: string
  valueClassName?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          tabIndex={0}
          role="group"
          aria-label={label}
          className={cn(
            "group/tile relative flex min-w-0 flex-col gap-1 rounded-lg bg-muted/40 p-3 ring-1 ring-white/5 outline-none",
            "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-muted/70 hover:shadow-lg hover:shadow-black/30 hover:ring-primary/40",
            "focus-visible:ring-2 focus-visible:ring-primary",
            className,
          )}
        >
          <div className="flex items-center justify-between gap-3 @md:flex-col @md:items-start @md:gap-1">
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors group-hover/tile:text-foreground">
              {icon}
              <span className="truncate">{label}</span>
              <InfoIcon
                className="size-3 shrink-0 opacity-40 transition-opacity group-hover/tile:opacity-100"
                aria-hidden
              />
            </span>
            <span
              className={cn(
                "text-xl font-bold tracking-tight tabular-nums transition-colors duration-300 group-hover/tile:text-primary @md:text-2xl",
                valueClassName,
              )}
            >
              {value}
            </span>
          </div>
          {footer && <div className="min-h-4 text-[11px] leading-4 text-muted-foreground">{footer}</div>}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-64 text-pretty">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
