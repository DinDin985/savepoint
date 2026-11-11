import { CategoryHeaderSkeleton } from "@/components/discover/category-header"
import { GameGridSkeleton } from "@/components/discover/states"
import { Skeleton } from "@/components/ui/skeleton"

export default function CategoryLoading() {
  return (
    <div aria-busy aria-label="Loading category">
      <CategoryHeaderSkeleton />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-44" />
        </div>
        <GameGridSkeleton count={18} />
      </div>
    </div>
  )
}
