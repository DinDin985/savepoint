"use client"

import { useState } from "react"
import { ChevronDownIcon, ExternalLinkIcon } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

/** Characters shown before "Read more" (whole paragraphs, at least one). */
const PREVIEW_CHARS = 420

/**
 * "About this game": the first paragraph(s) always visible, the rest behind a
 * collapsible "Read more". Credits the source (Steam store or Wikipedia, CC BY-SA).
 */
export function AboutSection({
  paragraphs,
  source,
  wikipediaTitle,
  steamUrl,
}: {
  paragraphs: readonly string[]
  source: "steam" | "wikipedia"
  wikipediaTitle: string | null
  steamUrl: string | null
}) {
  const [open, setOpen] = useState(false)

  let previewCount = 0
  let chars = 0
  while (previewCount < paragraphs.length && (previewCount === 0 || chars < PREVIEW_CHARS)) {
    chars += paragraphs[previewCount]?.length ?? 0
    previewCount++
  }
  const preview = paragraphs.slice(0, previewCount)
  const rest = paragraphs.slice(previewCount)

  const wikiUrl = wikipediaTitle ? `https://en.wikipedia.org/wiki/${encodeURIComponent(wikipediaTitle.replace(/ /g, "_"))}` : null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="relative space-y-3 text-[15px]/relaxed text-foreground/85">
        {preview.map((p, i) => (
          <p key={i} className="break-words">
            {p}
          </p>
        ))}
        {rest.length > 0 && !open && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>
      {rest.length > 0 && (
        <CollapsibleContent className="space-y-3 pt-3 text-[15px]/relaxed text-foreground/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2">
          {rest.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </CollapsibleContent>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {rest.length > 0 ? (
          <CollapsibleTrigger className="group/more -mx-2 inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm font-semibold text-primary transition-all duration-200 hover:scale-105 hover:bg-primary/10 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            {open ? "Show less" : "Read more"}
            <ChevronDownIcon className={cn("size-4 transition-transform duration-300", open && "rotate-180")} />
          </CollapsibleTrigger>
        ) : (
          <span />
        )}
        <SourceCredit source={source} wikiUrl={wikiUrl} steamUrl={steamUrl} />
      </div>
    </Collapsible>
  )
}

function SourceCredit({
  source,
  wikiUrl,
  steamUrl,
}: {
  source: "steam" | "wikipedia"
  wikiUrl: string | null
  steamUrl: string | null
}) {
  const href = source === "wikipedia" ? wikiUrl : steamUrl
  const label = source === "wikipedia" ? "Wikipedia" : "the Steam store"
  if (!href) return null
  return (
    <p className="text-xs text-muted-foreground">
      Description from{" "}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-0.5 underline-offset-4 transition-colors hover:text-primary hover:underline pointer-coarse:py-2"
      >
        {label}
        <ExternalLinkIcon className="size-3" />
      </a>
      {source === "wikipedia" && " (CC BY-SA 4.0)"}
    </p>
  )
}
