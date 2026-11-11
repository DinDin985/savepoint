import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Loading state for the game page "Player stats" card (Suspense fallback). */
export function PlayerStatsSkeleton() {
  return (
    <Card className="@container" aria-busy aria-label="Loading player stats">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3.5 w-56" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2 @md:grid-cols-3 @md:gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2 rounded-lg bg-muted/40 p-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-2.5 w-28" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-28" />
          </div>
          <Skeleton className="h-[200px] w-full @md:h-[240px]" />
        </div>
      </CardContent>
    </Card>
  )
}
