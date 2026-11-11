import { CategoryTileSkeleton } from "@/components/discover/category-tile"
import { Skeleton } from "@/components/ui/skeleton"

export default function CategoriesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10" aria-busy aria-label="Loading categories">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="mb-8 flex gap-2 overflow-hidden">
        {[96, 120, 104, 96].map((w, i) => (
          <Skeleton key={i} className="h-9 shrink-0 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <div className="space-y-14">
        {[10, 5].map((count, section) => (
          <div key={section}>
            <Skeleton className="mb-2 h-6 w-40" />
            <Skeleton className="mb-4 h-4 w-72 max-w-full" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              {Array.from({ length: count }, (_, i) => (
                <CategoryTileSkeleton key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
