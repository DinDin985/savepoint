"use client"

import Image from "next/image"
import { useMemo, useState, type ReactNode } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { PlatformFamily } from "@/lib/db/schema"
import type { PickerGame } from "@/lib/profile/types"
import { cn } from "@/lib/utils"
import { CoverArt } from "./cover-art"

export const PLATFORM_SHORT: Record<PlatformFamily, string> = {
  pc: "PC",
  nintendo: "Nintendo",
  playstation: "PlayStation",
  xbox: "Xbox",
}

const PLATFORM_FILTERS: readonly ("all" | PlatformFamily)[] = ["all", "pc", "nintendo", "playstation", "xbox"]

/**
 * Searchable game picker (Popover + Command) over the whole catalog — Steam,
 * Epic-only and Nintendo games alike — with small artwork thumbnails and a
 * platform filter. `variant="hero"` shows wide backdrop art instead of covers.
 */
export function GamePicker({
  games,
  onSelect,
  children,
  excludeIds,
  selectedId,
  variant = "cover",
  align = "start",
  placeholder = "Search games…",
  disabled = false,
}: {
  games: readonly PickerGame[]
  onSelect: (game: PickerGame) => void
  /** the trigger element (rendered with asChild) */
  children: ReactNode
  excludeIds?: readonly number[]
  selectedId?: number | null
  variant?: "cover" | "hero"
  align?: "start" | "center" | "end"
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<"all" | PlatformFamily>("all")
  const options = useMemo(() => {
    const excluded = new Set(excludeIds ?? [])
    return games.filter((g) => !excluded.has(g.id) && (platform === "all" || g.platforms.includes(platform)))
  }, [games, excludeIds, platform])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-[min(calc(100vw-2rem),400px)] gap-0 p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <div className="scrollbar-none flex gap-1 overflow-x-auto px-2 pt-2 pb-1" role="group" aria-label="Filter by platform">
            {PLATFORM_FILTERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                aria-pressed={platform === p}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center rounded-full border px-3 text-xs font-medium transition-all duration-200 hover:scale-105 sm:h-7 sm:px-2.5 sm:text-[11px]",
                  platform === p
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {p === "all" ? "All" : PLATFORM_SHORT[p]}
              </button>
            ))}
          </div>
          <CommandList className="max-h-80">
            <CommandEmpty>No games found.</CommandEmpty>
            <CommandGroup heading={`${options.length} ${options.length === 1 ? "game" : "games"}`}>
              {options.map((g) => (
                <CommandItem
                  key={g.id}
                  value={`${g.title} #${g.id}`}
                  keywords={[g.slug, String(g.releaseYear ?? ""), ...g.platforms.map((p) => PLATFORM_SHORT[p])]}
                  data-checked={selectedId === g.id}
                  onSelect={() => {
                    onSelect(g)
                    setOpen(false)
                  }}
                  // cmdk renders data-selected="false" on idle items: only highlight the active one
                  className="group/opt gap-3 py-1.5 data-[selected=false]:bg-transparent!"
                >
                  <span
                    className={cn(
                      "relative shrink-0 overflow-hidden rounded-sm bg-muted ring-1 ring-white/10 transition-transform duration-200 group-hover/opt:scale-110 group-data-[selected=true]/opt:scale-110",
                      variant === "hero" ? "aspect-[16/7] w-16" : "aspect-[2/3] w-8",
                    )}
                  >
                    {variant === "hero" ? (
                      <Image src={g.heroImage} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      // square Nintendo icons / wide banners are letterboxed, not cropped
                      <CoverArt src={g.coverImage} sizes="32px" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{g.title}</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {g.releaseYear ?? "TBA"}
                      <span aria-hidden>·</span>
                      <span className="truncate">
                        {g.platforms.map((p) => (
                          <span
                            key={p}
                            className={cn("mr-1 last:mr-0", p === "nintendo" && "font-medium text-liked/90")}
                          >
                            {PLATFORM_SHORT[p]}
                          </span>
                        ))}
                      </span>
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
