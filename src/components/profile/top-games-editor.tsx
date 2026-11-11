"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition, type DragEvent } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  GripVerticalIcon,
  PlusIcon,
  RotateCcwIcon,
  SaveIcon,
  TrophyIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { saveTopGames } from "@/actions/profile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { TOP_GAMES_MAX, type PickerGame } from "@/lib/profile/types"
import { cn } from "@/lib/utils"
import { CoverArt } from "./cover-art"
import { GamePicker, PLATFORM_SHORT } from "./game-picker"

type Drop = { index: number; edge: "before" | "after" }

const sameOrder = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((id, i) => id === b[i])

/**
 * Ranked Top 10 editor: add via a searchable picker (already-picked games are
 * excluded), remove, reorder with HTML5 drag-and-drop (with a drop indicator)
 * or the keyboard-accessible up/down buttons, then Save or Reset.
 */
export function TopGamesEditor({
  username,
  games,
  initialIds,
}: {
  username: string
  games: readonly PickerGame[]
  initialIds: readonly number[]
}) {
  const router = useRouter()
  const byId = useMemo(() => new Map(games.map((g) => [g.id, g])), [games])
  const [savedIds, setSavedIds] = useState<readonly number[]>(() => initialIds.filter((id) => byId.has(id)))
  const [ids, setIds] = useState<readonly number[]>(savedIds)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [drop, setDrop] = useState<Drop | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const [pending, startTransition] = useTransition()

  const picked = ids.flatMap((id) => {
    const g = byId.get(id)
    return g ? [g] : []
  })
  const dirty = !sameOrder(ids, savedIds)
  const full = ids.length >= TOP_GAMES_MAX

  // warn before leaving with unsaved changes: reloads / tab close (beforeunload)
  // and in-app <Link> navigation (capture-phase click guard on same-origin links)
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = e.target instanceof Element ? e.target.closest("a[href]") : null
      if (!(anchor instanceof HTMLAnchorElement)) return
      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      if (!window.confirm("You have unsaved changes to your Top 10. Leave without saving?")) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("click", onClick, true)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      document.removeEventListener("click", onClick, true)
    }
  }, [dirty])

  const titleOf = (id: number) => byId.get(id)?.title ?? "Game"

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= ids.length) return
    const next = [...ids]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item!)
    setIds(next)
    setAnnouncement(`${titleOf(item!)} moved to #${to + 1}`)
  }

  const add = (game: PickerGame) => {
    if (ids.includes(game.id) || ids.length >= TOP_GAMES_MAX) return
    setIds([...ids, game.id])
    setAnnouncement(`${game.title} added at #${ids.length + 1}`)
  }

  const remove = (index: number) => {
    const id = ids[index]
    if (id === undefined) return
    setIds(ids.filter((_, i) => i !== index))
    setAnnouncement(`${titleOf(id)} removed`)
  }

  const reset = () => {
    setIds(savedIds)
    setAnnouncement("Changes discarded")
  }

  const save = () => {
    const toSave = ids
    startTransition(async () => {
      const result = await saveTopGames(toSave)
      if (result.ok) {
        setSavedIds(toSave)
        toast.success(result.message ?? "Top 10 saved", {
          description: toSave.length ? `${toSave.length} games are on your profile.` : "Your Top 10 is now empty.",
          action: { label: "View profile", onClick: () => router.push(`/u/${result.data.username}`) },
        })
      } else {
        toast.error(result.error)
      }
    })
  }

  /* ── HTML5 drag & drop ─────────────────────────────────────────────── */
  const onDragStart = (index: number) => (e: DragEvent<HTMLLIElement>) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(ids[index]))
  }
  const onDragOver = (index: number) => (e: DragEvent<HTMLLIElement>) => {
    if (dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    const rect = e.currentTarget.getBoundingClientRect()
    const edge: Drop["edge"] = e.clientY < rect.top + rect.height / 2 ? "before" : "after"
    if (drop?.index !== index || drop.edge !== edge) setDrop({ index, edge })
  }
  // handled on the list so drops in the gaps between rows still land on the indicator
  const onListDragOver = (e: DragEvent<HTMLOListElement>) => {
    if (dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }
  const onDrop = (e: DragEvent<HTMLOListElement>) => {
    e.preventDefault()
    if (dragIndex !== null && drop) {
      let to = drop.edge === "before" ? drop.index : drop.index + 1
      if (dragIndex < to) to -= 1
      move(dragIndex, to)
    }
    setDragIndex(null)
    setDrop(null)
  }
  const onDragEnd = () => {
    setDragIndex(null)
    setDrop(null)
  }
  // a drop that would land the item where it already is shows no indicator
  const showIndicator = (index: number, edge: Drop["edge"]) => {
    if (dragIndex === null || drop?.index !== index || drop.edge !== edge) return false
    const target = edge === "before" ? index : index + 1
    return target !== dragIndex && target !== dragIndex + 1
  }

  return (
    <div className="space-y-6">
      {/* Live poster preview */}
      <div className="rounded-xl border border-border bg-card/40 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-pixel text-[10px] tracking-widest text-primary uppercase">Preview</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {ids.length}/{TOP_GAMES_MAX}
          </p>
        </div>
        <ol className="grid grid-cols-5 gap-1.5 sm:grid-cols-10 sm:gap-2">
          {Array.from({ length: TOP_GAMES_MAX }, (_, i) => {
            const g = picked[i]
            return (
              <li
                key={g ? g.id : `empty-${i}`}
                className={cn(
                  "group/prev relative aspect-[2/3] overflow-hidden rounded-md bg-muted/40 ring-1",
                  g ? "ring-white/10" : "border border-dashed border-border ring-transparent",
                )}
              >
                {g ? (
                  <CoverArt
                    src={g.coverImage}
                    alt={g.title}
                    sizes="80px"
                    className="transition-transform duration-500 group-hover/prev:scale-110"
                  />
                ) : null}
                <span
                  className={cn(
                    "absolute top-0.5 left-1 font-pixel text-xs drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]",
                    g ? "text-white" : "text-muted-foreground/50",
                  )}
                >
                  {i + 1}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          {dirty ? (
            <Badge variant="outline" className="border-star/40 text-star">
              <span className="size-1.5 animate-pulse rounded-full bg-star" /> Unsaved changes
            </Badge>
          ) : (
            <span className="text-muted-foreground">
              {savedIds.length ? "Saved" : "Nothing saved yet"} ·{" "}
              <Link href={`/u/${username}`} className="text-primary underline-offset-4 hover:underline">
                view profile
              </Link>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={reset} disabled={!dirty || pending}>
            <RotateCcwIcon data-icon="inline-start" />
            Reset
          </Button>
          <Button type="button" onClick={save} disabled={!dirty || pending}>
            {pending ? <Spinner /> : <SaveIcon data-icon="inline-start" />}
            {pending ? "Saving…" : "Save Top 10"}
          </Button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {/* Ranked slots */}
      <ol
        className="space-y-2"
        aria-label="Your Top 10"
        onDragOver={onListDragOver}
        onDrop={onDrop}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDrop(null)
        }}
      >
        {picked.map((g, i) => (
          <li
            key={g.id}
            draggable={!pending}
            onDragStart={onDragStart(i)}
            onDragOver={onDragOver(i)}
            onDragEnd={onDragEnd}
            className={cn(
              "group/row relative flex items-center gap-2 rounded-xl border bg-card p-2 pr-2.5 transition-all duration-200 sm:gap-3 sm:p-2.5",
              "hover:border-primary/40 hover:bg-accent/40",
              dragIndex === i ? "scale-[0.98] border-primary/50 opacity-40" : "border-border",
            )}
          >
            {showIndicator(i, "before") && <DropLine position="top" />}
            {showIndicator(i, "after") && <DropLine position="bottom" />}

            <span
              className="hidden cursor-grab touch-none text-muted-foreground transition-colors group-hover/row:text-foreground active:cursor-grabbing sm:block"
              aria-hidden
            >
              <GripVerticalIcon className="size-4" />
            </span>
            <span
              className={cn(
                "w-7 shrink-0 text-center font-pixel text-lg leading-none sm:w-8 sm:text-xl",
                i < 3 ? "text-star" : "text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <Link
              href={`/games/${g.slug}`}
              className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded bg-muted ring-1 ring-white/10 transition-all duration-300 hover:ring-primary sm:w-11"
              draggable={false}
              tabIndex={-1}
              aria-label={`Open ${g.title}`}
            >
              <CoverArt
                src={g.coverImage}
                sizes="44px"
                className="transition-transform duration-500 group-hover/row:scale-110"
              />
            </Link>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{g.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {g.releaseYear ?? "TBA"}
                <span className="hidden sm:inline"> · {g.platforms.map((p) => PLATFORM_SHORT[p]).join(" · ")}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => move(i, i - 1)}
                disabled={i === 0 || pending}
                aria-label={`Move ${g.title} up`}
                className="max-sm:size-9"
              >
                <ChevronUpIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => move(i, i + 1)}
                disabled={i === picked.length - 1 || pending}
                aria-label={`Move ${g.title} down`}
                className="max-sm:size-9"
              >
                <ChevronDownIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(i)}
                disabled={pending}
                aria-label={`Remove ${g.title}`}
                className="hover:bg-destructive/15 hover:text-destructive max-sm:size-9"
              >
                <XIcon />
              </Button>
            </span>
          </li>
        ))}

        {Array.from({ length: TOP_GAMES_MAX - picked.length }, (_, k) => {
          const rank = picked.length + k + 1
          if (k === 0) {
            return (
              <li key="add">
                <GamePicker games={games} excludeIds={ids} onSelect={add} placeholder="Find a game to add…">
                  <button
                    type="button"
                    disabled={pending || full}
                    className="group/add flex w-full items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-2.5 text-left transition-all duration-200 hover:scale-[1.01] hover:border-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <span className="hidden w-4 sm:block" />
                    <span className="w-7 shrink-0 text-center font-pixel text-lg text-primary/70 sm:w-8 sm:text-xl">
                      {rank}
                    </span>
                    <span className="flex aspect-[2/3] w-10 shrink-0 items-center justify-center rounded border border-dashed border-primary/50 text-primary sm:w-11">
                      <PlusIcon className="size-4 transition-transform duration-300 group-hover/add:rotate-90" />
                    </span>
                    <span className="text-sm font-medium text-primary">Add a game at #{rank}</span>
                  </button>
                </GamePicker>
              </li>
            )
          }
          return (
            <li
              key={`empty-${rank}`}
              className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 p-2.5 text-muted-foreground/50"
              aria-hidden
            >
              <span className="hidden w-4 sm:block" />
              <span className="w-7 shrink-0 text-center font-pixel text-lg sm:w-8 sm:text-xl">{rank}</span>
              <span className="aspect-[2/3] w-10 shrink-0 rounded border border-dashed border-border/60 sm:w-11" />
              <span className="text-sm">Empty slot</span>
            </li>
          )
        })}
      </ol>

      {picked.length === 0 && (
        <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <TrophyIcon className="size-4 text-star" />
          Start with the game you&apos;d save from a burning house.
        </p>
      )}
      {picked.length > 1 && (
        <p className="text-center text-xs text-muted-foreground">
          Drag rows to reorder, or use the arrow buttons. Your changes go live when you save.
        </p>
      )}
    </div>
  )
}

function DropLine({ position }: { position: "top" | "bottom" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]",
        position === "top" ? "-top-[5px]" : "-bottom-[5px]",
      )}
    >
      <span className="absolute -top-[3px] -left-1 size-2 rounded-full bg-primary" />
    </span>
  )
}
