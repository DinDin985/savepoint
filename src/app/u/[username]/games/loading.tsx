import { Skeleton } from "@/components/ui/skeleton"
import { PosterGridSkeleton } from "@/components/profile/skeletons"

export default function ProfileGamesLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-48" />
      <PosterGridSkeleton withToolbar={true} />
    </div>
  )
}
