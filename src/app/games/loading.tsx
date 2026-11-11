import { FilterBarSkeleton } from "@/components/discover/filter-bar"
import { GameGridSkeleton } from "@/components/discover/states"
import { Skeleton } from "@/components/ui/skeleton"

export default function BrowseLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10" aria-busy aria-label="Loading games">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <FilterBarSkeleton />
      <Skeleton className="mt-8 mb-4 h-4 w-40" />
      <GameGridSkeleton count={18} />
    </div>
  )
}
