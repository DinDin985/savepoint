"use client"

import { useRouter } from "next/navigation"
import { useOptimistic, useTransition } from "react"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"

/** "Include my activity" switch for /feed (drives the `own=1` search param). */
export function FeedOwnToggle({ includeOwn }: { includeOwn: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [checked, setChecked] = useOptimistic(includeOwn)
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 py-1.5 pr-3 pl-2 transition-colors hover:border-primary/40">
      <Switch
        id="feed-own"
        checked={checked}
        disabled={pending}
        onCheckedChange={(value) =>
          startTransition(() => {
            setChecked(value)
            router.replace(value ? "/feed?own=1" : "/feed", { scroll: false })
          })
        }
      />
      <Label htmlFor="feed-own" className="cursor-pointer text-sm font-medium whitespace-nowrap">
        Include my activity
      </Label>
      {pending && <Spinner className="size-3.5 text-muted-foreground" />}
    </div>
  )
}
