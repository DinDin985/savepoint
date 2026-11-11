import Image from "next/image"
import Link from "next/link"
import { SlidersHorizontalIcon } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { CategoryBackdrop } from "@/lib/catalog/queries"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Full-bleed category header: backdrop art, breadcrumb, kicker, title, blurb, count. */
export function CategoryHeader({
  kindLabel,
  kindAnchor,
  label,
  blurb,
  count,
  backdrop,
  browseHref,
  accent = "primary",
}: {
  kindLabel: string
  kindAnchor: string
  label: string
  blurb: string
  /** null when unknown (data failed to load) */
  count: number | null
  backdrop: CategoryBackdrop | null
  browseHref: string
  accent?: "primary" | "liked"
}) {
  return (
    <header className="group/header relative isolate overflow-hidden border-b border-white/5">
      {backdrop && (
        <Image
          src={backdrop.image}
          alt=""
          fill
          preload
          sizes="100vw"
          className={cn(
            "-z-20 object-cover object-center opacity-45 transition-transform duration-[2s] ease-out group-hover/header:scale-105",
            backdrop.lowRes && "blur-[3px]",
          )}
        />
      )}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/80 to-background/30" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-12">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="hover:text-primary">
                <Link href="/categories">Categories</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="hover:text-primary">
                <Link href={`/categories#${kindAnchor}`}>{kindLabel}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{label}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <p
          className={cn(
            "mt-8 font-pixel text-[10px] tracking-[0.25em] uppercase sm:mt-14",
            accent === "liked" ? "text-liked" : "text-primary",
          )}
        >
          {kindLabel}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-balance sm:text-6xl">{label}</h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">{blurb}</p>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          {count !== null && (
            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-sm backdrop-blur">
              <span className="font-semibold tabular-nums">{formatNumber(count)}</span>{" "}
              <span className="text-muted-foreground">{count === 1 ? "game" : "games"}</span>
            </span>
          )}
          <Button asChild variant="outline" className="h-9 bg-black/30 px-3 backdrop-blur">
            <Link href={browseHref}>
              <SlidersHorizontalIcon data-icon="inline-start" />
              Refine with filters
            </Link>
          </Button>
          {backdrop && (
            <Link
              href={`/games/${backdrop.slug}`}
              className="-my-2 max-w-full truncate py-2 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              Art: {backdrop.title}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export function CategoryHeaderSkeleton() {
  return (
    <div className="border-b border-white/5">
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-12" aria-hidden>
        <Skeleton className="h-4 w-56" />
        <Skeleton className="mt-8 h-2.5 w-20 sm:mt-14" />
        <Skeleton className="mt-3 h-12 w-64 max-w-full" />
        <Skeleton className="mt-4 h-5 w-96 max-w-full" />
        <div className="mt-5 flex gap-3">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-36 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
