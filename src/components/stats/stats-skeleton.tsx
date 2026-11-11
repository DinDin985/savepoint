import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Loading placeholder mirroring the stats page layout. */
export function UserStatsSkeleton() {
  return (
    <div className="space-y-8" aria-busy aria-label="Loading stats">
      <div className="space-y-2">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="space-y-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {Array.from({ length: 2 }, (_, row) => (
        <div key={row} className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-3 overflow-hidden sm:gap-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-24 shrink-0 sm:w-28" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
