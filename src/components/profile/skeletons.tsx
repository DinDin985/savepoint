import { Skeleton } from "@/components/ui/skeleton"

/** Poster grid placeholder (matches LibraryGrid). */
export function PosterGridSkeleton({ count = 12, withToolbar = false }: { count?: number; withToolbar?: boolean }) {
  return (
    <div className="space-y-6">
      {withToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-8 w-44" />
        </div>
      )}
      <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="aspect-[2/3] w-full" />
            <Skeleton className="mx-auto h-2.5 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Member row list placeholder (matches MemberRow). */
export function MemberRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-xl bg-card/60 p-3 sm:gap-4 sm:p-4">
          <Skeleton className="size-10 rounded-full sm:size-12" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="h-7 w-24" />
        </li>
      ))}
    </ul>
  )
}

/** Review card list placeholder (matches ReviewCard). */
export function ReviewListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-border p-4">
          <Skeleton className="aspect-[2/3] w-16 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Member card grid placeholder (matches MemberCard). */
export function MemberCardsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <Skeleton className="h-32 rounded-none" />
          <div className="-mt-8 flex flex-col items-center gap-2 px-4 pb-4">
            <Skeleton className="size-16 rounded-full ring-4 ring-card" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-1 h-7 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Overview page placeholder: Top 10 grid + activity + sidebar. */
export function ProfileOverviewSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-10">
        <div>
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="flex gap-3 overflow-hidden md:grid md:grid-cols-5 md:gap-4">
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-28 shrink-0 sm:w-32 md:w-auto" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="mb-4 h-6 w-48" />
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="aspect-[2/3] w-9" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    </div>
  )
}

/** Feed placeholder. */
export function FeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="mb-4 h-4 w-24" />
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 max-w-sm" />
            <Skeleton className="h-3 w-24" />
            {i % 3 === 0 && <Skeleton className="h-12 w-full max-w-md" />}
          </div>
          <Skeleton className="aspect-[2/3] w-16 shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** Profile header + tab bar placeholder (matches ProfileHeader / ProfileTabs). */
export function ProfileHeaderSkeleton() {
  return (
    <div>
      <Skeleton className="h-44 w-full rounded-none sm:h-60 lg:h-72" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative -mt-16 flex items-end gap-4 sm:-mt-20">
          <Skeleton className="size-20 rounded-full ring-4 ring-background sm:size-24" />
          <div className="space-y-2 pb-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-80 max-w-full" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-16 w-full rounded-xl sm:w-[420px]" />
        </div>
      </div>
      <div className="mt-6 border-b border-border">
        <div className="mx-auto flex max-w-7xl gap-4 overflow-hidden px-4 py-3 sm:px-6">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-16 shrink-0" />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Whole-route placeholder for a profile (header + tabs + overview). Intended for
 * a `loading.tsx` *above* the [username] segment so navigating to a profile shows
 * instant feedback while the layout loads.
 */
export function ProfileRouteSkeleton() {
  return (
    <div className="pb-16">
      <ProfileHeaderSkeleton />
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <ProfileOverviewSkeleton />
      </div>
    </div>
  )
}
