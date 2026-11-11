import { FeedSkeleton } from "@/components/profile/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function FeedLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-48 rounded-full" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <FeedSkeleton />
        <div className="hidden space-y-4 lg:block">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
