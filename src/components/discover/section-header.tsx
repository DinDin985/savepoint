import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Kicker + title + optional "See all →" link used above every home section. */
export function SectionHeader({
  kicker,
  title,
  description,
  href,
  linkLabel = "See all",
  icon,
  className,
  id,
}: {
  kicker?: string
  title: ReactNode
  description?: ReactNode
  href?: string
  linkLabel?: string
  icon?: ReactNode
  className?: string
  id?: string
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {kicker && <p className="font-pixel text-[10px] tracking-[0.2em] text-primary uppercase">{kicker}</p>}
        <h2 id={id} className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight text-balance sm:text-2xl">
          {icon}
          {title}
        </h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {href && <SeeAllLink href={href} label={linkLabel} />}
    </div>
  )
}

export function SeeAllLink({ href, label = "See all", className }: { href: string; label?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group/see-all -mr-2.5 inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-sm font-medium text-muted-foreground",
        "transition-all duration-200 hover:scale-105 hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      {label}
      <ArrowRightIcon className="size-3.5 transition-transform duration-200 group-hover/see-all:translate-x-0.5" />
    </Link>
  )
}
