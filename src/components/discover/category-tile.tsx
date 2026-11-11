import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { CategoryShowcase } from "@/lib/catalog/queries"
import { categoryHref } from "@/lib/taxonomy"
import { cn } from "@/lib/utils"
import { CoverArt } from "./cover-art"

/**
 * Category tile: a fanned collage of up to three covers over a blurred tint.
 * On hover the tile lifts, the covers fan out (or fade away with
 * `effect="crossfade"`) and a screenshot from the category fades in.
 */
export function CategoryTile({
  showcase,
  effect = "fan",
  highlight = false,
  className,
}: {
  showcase: CategoryShowcase
  effect?: "fan" | "crossfade"
  /** Spotlight styling (used for Nintendo on the hub). Pair with a 2-column span: the art gets a wider ratio from `sm` up. */
  highlight?: boolean
  className?: string
}) {
  const [center, left, right] = showcase.covers
  const crossfade = effect === "crossfade"
  const coverWidth = highlight ? "w-[27%] sm:w-[13.5%]" : "w-[27%]"
  return (
    <Link
      href={categoryHref(showcase.kind, showcase.slug)}
      className={cn(
        "group/tile relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/5 bg-card",
        "transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl hover:shadow-black/50",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        highlight && "border-liked/40 bg-liked/5 ring-1 ring-liked/30 hover:border-liked/70",
        className,
      )}
    >
      <div className={cn("relative aspect-[16/10] w-full overflow-hidden", highlight && "sm:aspect-[33/10]")}>
        {/* tinted base built from the lead cover */}
        {center && (
          <Image
            src={center.image}
            alt=""
            fill
            sizes="200px"
            className="scale-125 object-cover opacity-35 blur-2xl saturate-150"
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-card" />

        {/* screenshot that fades in on hover */}
        {showcase.screenshot && (
          <Image
            src={showcase.screenshot}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="scale-110 object-cover opacity-0 transition-all duration-700 ease-out group-hover/tile:scale-100 group-hover/tile:opacity-100"
          />
        )}
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent opacity-0 transition-opacity duration-500 group-hover/tile:opacity-100",
            !crossfade && "via-card/50",
          )}
        />

        {/* cover collage */}
        <div className={cn("absolute inset-0 transition-opacity duration-500", crossfade && "group-hover/tile:opacity-0")}>
          {left && (
            <Cover
              image={left.image}
              width={coverWidth}
              className="-translate-x-[108%] -translate-y-[44%] -rotate-8 group-hover/tile:-translate-x-[128%] group-hover/tile:-rotate-14"
            />
          )}
          {right && (
            <Cover
              image={right.image}
              width={coverWidth}
              className="translate-x-[8%] -translate-y-[44%] rotate-8 group-hover/tile:translate-x-[28%] group-hover/tile:rotate-14"
            />
          )}
          {center && (
            <Cover
              image={center.image}
              width={coverWidth}
              className="z-10 -translate-x-1/2 -translate-y-1/2 group-hover/tile:-translate-y-[56%] group-hover/tile:scale-105"
            />
          )}
        </div>

        <span className="absolute top-2 right-2 z-20 rounded-sm bg-black/55 px-1.5 py-1 font-pixel text-[9px] leading-none tracking-wider text-white/90 uppercase backdrop-blur">
          {showcase.count} {showcase.count === 1 ? "game" : "games"}
        </span>
        {highlight && (
          <span className="absolute top-2 left-2 z-20 rounded-sm bg-liked px-1.5 py-1 font-pixel text-[9px] leading-none tracking-wider text-white uppercase shadow-md">
            Spotlight
          </span>
        )}
      </div>

      <div className="relative flex flex-1 items-start gap-2 p-3 pt-2 sm:p-4 sm:pt-2">
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "truncate font-semibold tracking-tight transition-colors duration-200 group-hover/tile:text-primary",
              highlight && "group-hover/tile:text-liked",
            )}
          >
            {showcase.label}
          </h3>
          <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">{showcase.blurb}</p>
        </div>
        <ArrowRightIcon
          className={cn(
            "mt-1 size-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover/tile:translate-x-1 group-hover/tile:text-primary",
            highlight && "group-hover/tile:text-liked",
          )}
        />
      </div>
    </Link>
  )
}

function Cover({ image, width, className }: { image: string; width: string; className?: string }) {
  return (
    <span
      className={cn(
        "absolute top-1/2 left-1/2 block aspect-[2/3] overflow-hidden bg-muted",
        width,
        "rounded-md shadow-xl shadow-black/60 ring-1 ring-white/15",
        "transition-all duration-500 ease-out",
        className,
      )}
    >
      <CoverArt src={image} sizes="140px" />
    </span>
  )
}

export function CategoryTileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-white/5 bg-card", className)} aria-hidden>
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-2 p-4 pt-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  )
}
