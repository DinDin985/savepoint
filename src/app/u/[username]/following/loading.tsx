import { Skeleton } from "@/components/ui/skeleton"
import { MemberRowsSkeleton } from "@/components/profile/skeletons"

export default function ProfileFollowingLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-48" />
      <MemberRowsSkeleton />
    </div>
  )
}
