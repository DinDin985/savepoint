import Image from "next/image"
import type { ReactNode } from "react"
import { runEffect } from "@/lib/effect/runtime"
import { getAllGameSummaries } from "@/lib/games/core"

/** Split layout: form on the left, a wall of game covers on the right. */
export async function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const games = await runEffect(getAllGameSummaries()).catch(() => [])
  const wall = games.slice(0, 24)
  return (
    <div className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-7xl lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
      <div className="relative hidden overflow-hidden lg:block" aria-hidden>
        <div className="absolute inset-0 grid rotate-6 scale-125 grid-cols-4 gap-3 opacity-60">
          {wall.map((g) => (
            <div key={g.id} className="relative aspect-[2/3] overflow-hidden rounded-md">
              <Image src={g.coverImage} alt="" fill sizes="200px" className="object-cover" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-background/20" />
      </div>
    </div>
  )
}
