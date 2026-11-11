import { Skeleton } from "@/components/ui/skeleton"
import { ReviewListSkeleton } from "@/components/profile/skeletons"

export default function ProfileReviewsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-48" />
      <ReviewListSkeleton />
    </div>
  )
}
