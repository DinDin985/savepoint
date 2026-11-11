import { MemberCardsSkeleton } from "@/components/profile/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function MembersLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-full max-w-md" />
      </div>
      <Skeleton className="mb-4 h-6 w-44" />
      <MemberCardsSkeleton />
    </div>
  )
}
