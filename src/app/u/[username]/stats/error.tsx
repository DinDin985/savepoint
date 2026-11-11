"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ChartColumnBigIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export default function UserStatsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Empty className="rounded-2xl border border-dashed bg-card/40 py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChartColumnBigIcon />
        </EmptyMedia>
        <EmptyTitle className="text-lg">Couldn&apos;t crunch these numbers</EmptyTitle>
        <EmptyDescription>Something went wrong loading the stats. Give it another go in a moment.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row flex-wrap justify-center">
        <Button onClick={reset} className="max-sm:h-9">
          <RotateCcwIcon data-icon="inline-start" />
          Try again
        </Button>
        <Button asChild variant="outline" className="max-sm:h-9 hover:text-primary">
          <Link href="/games">Browse games</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
