"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="font-pixel text-sm tracking-widest text-destructive">GAME OVER</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">Something crashed.</h1>
      <p className="mt-3 text-muted-foreground">An unexpected error occurred. Continue?</p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Continue</Button>
        <Button asChild variant="outline">
          <Link href="/">Quit to title</Link>
        </Button>
      </div>
    </div>
  )
}
