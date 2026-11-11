"use client"

import { SearchIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"

/** Navbar search → /games?q=… */
export function SearchBox({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const router = useRouter()
  const params = useSearchParams()
  const urlQ = params.get("q") ?? ""
  const [q, setQ] = useState(urlQ)
  // keep the box in sync when the browse page's filter bar changes ?q=
  const [syncedQ, setSyncedQ] = useState(urlQ)
  if (urlQ !== syncedQ) {
    setSyncedQ(urlQ)
    setQ(urlQ)
  }

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault()
        const query = q.trim()
        router.push(query ? `/games?q=${encodeURIComponent(query)}` : "/games")
        onNavigate?.()
      }}
    >
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search games…"
        aria-label="Search games"
        className={cn(
          "h-8 w-full rounded-full border border-input bg-input/30 pr-3 pl-8 text-sm outline-none",
          "transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/60 focus:bg-input/50 focus:ring-2 focus:ring-primary/30",
        )}
      />
    </form>
  )
}
