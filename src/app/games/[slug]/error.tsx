"use client"

import Link from "next/link"
import { useEffect } from "react"
import { CompassIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Error boundary for the game page. Next 16.3+ passes `retry`, which re-fetches
 * the server data and re-renders the segment (`reset` would only re-render the
 * failed client tree with the same broken payload).
 */
export default function GameError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="font-pixel text-sm tracking-widest text-destructive">LOAD FAILED</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">This game didn&apos;t load.</h1>
      <p className="mt-3 text-muted-foreground">
        Something went wrong fetching the game page. Your library is safe — try again.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={() => retry()}>
          <RotateCcwIcon /> Try again
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/games">
            <CompassIcon /> Browse games
          </Link>
        </Button>
      </div>
      {digest && <p className="mt-6 font-mono text-[11px] text-muted-foreground/60">Error id: {digest}</p>}
    </div>
  )
}
