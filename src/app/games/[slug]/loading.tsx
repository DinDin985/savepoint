import { Skeleton } from "@/components/ui/skeleton"

/** Mirrors the game page layout: hero, cover + header, library panel, sections. */
export default function GameLoading() {
  return (
    <div className="pb-16" aria-busy aria-label="Loading game">
      <div className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-[300px] overflow-hidden sm:h-[420px] lg:h-[500px]">
          <Skeleton className="size-full rounded-none opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
        </div>
        <div className="mx-auto max-w-7xl px-4 pt-28 pb-8 sm:px-6 sm:pt-44 lg:pt-56">
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-x-8">
            <Skeleton className="aspect-[2/3] w-full rounded-lg sm:row-span-2" />
            <div className="space-y-3 self-end">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-3/4 sm:h-11" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="col-span-2 space-y-4 sm:col-span-1 sm:col-start-2">
              <Skeleton className="h-4 w-full max-w-xl" />
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-6 w-20 rounded-full" />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-9 w-28 rounded-lg" />
                <Skeleton className="h-9 w-40 rounded-lg" />
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-6">
          <div className="space-y-4 rounded-xl border bg-card/60 p-4 lg:col-start-2 lg:row-start-1">
            <Skeleton className="h-3 w-16" />
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="mx-auto h-9 w-48" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-12 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="aspect-video w-full rounded-xl" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="aspect-video rounded-lg" />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-56 w-full rounded-xl" />
            </div>
          </div>
          {/* player stats: after the main column on phones, under the log on desktop (same as the page) */}
          <Skeleton className="h-48 self-start rounded-xl lg:col-start-2 lg:row-start-2" />
        </div>
      </div>
    </div>
  )
}
