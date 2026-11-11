import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Section title used across the game page: pixel kicker + bold heading + optional action. */
export function SectionHeading({
  id,
  kicker,
  title,
  action,
  className,
}: {
  id?: string
  kicker?: string
  title: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-3 border-b border-white/5 pb-2", className)}>
      <div className="min-w-0">
        {kicker && <p className="font-pixel text-[10px] tracking-widest text-primary">{kicker}</p>}
        <h2 id={id} className="text-lg font-bold tracking-tight text-balance break-words sm:text-xl">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
