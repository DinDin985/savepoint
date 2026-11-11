"use client"

import Link from "next/link"
import { useEffect } from "react"
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

/** Shared body for route-level error.tsx files in the social / profile areas. */
export function RouteError({
  error,
  reset,
  title = "This section failed to load",
  backHref = "/",
  backLabel = "Back to home",
}: {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  backHref?: string
  backLabel?: string
}) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <Empty className="my-10 border border-dashed border-destructive/30 bg-destructive/5 py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/15 text-destructive">
          <TriangleAlertIcon />
        </EmptyMedia>
        <p className="font-pixel text-[10px] tracking-widest text-destructive">CONTINUE?</p>
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        <EmptyDescription>Something glitched on our side. Try again — your data is safe.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button onClick={reset}>
          <RefreshCwIcon data-icon="inline-start" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
