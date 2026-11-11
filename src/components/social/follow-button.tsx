"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useOptimistic, useState, useTransition } from "react"
import { CheckIcon, UserMinusIcon, UserPlusIcon } from "lucide-react"
import { toast } from "sonner"
import { followUser, unfollowUser } from "@/actions/social"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Size = "sm" | "default" | "lg"

/**
 * Optimistic Follow / Unfollow toggle. While following, hovering turns the
 * "Following" label into a red "Unfollow". Signed-out viewers get a sign-in link
 * that returns them to the current page.
 */
export function FollowButton({
  userId,
  username,
  initialFollowing,
  signedIn,
  size = "default",
  className,
  onChange,
}: {
  userId: string
  username: string
  initialFollowing: boolean
  signedIn: boolean
  size?: Size
  className?: string
  /** called with the confirmed follower count after the server responds */
  onChange?: (following: boolean, followers: number) => void
}) {
  const pathname = usePathname()
  const [following, setFollowing] = useState(initialFollowing)
  const [optimisticFollowing, setOptimisticFollowing] = useOptimistic(following)
  const [pending, startTransition] = useTransition()

  if (!signedIn) {
    return (
      <Button asChild size={size} className={cn("max-sm:h-9 max-sm:px-3", className)}>
        <Link href={`/sign-in?next=${encodeURIComponent(pathname || `/u/${username}`)}`}>
          <UserPlusIcon data-icon="inline-start" />
          {size === "sm" ? "Follow" : "Sign in to follow"}
        </Link>
      </Button>
    )
  }

  const toggle = () => {
    // ignore double-clicks while the previous request is in flight
    if (pending) return
    const next = !following
    startTransition(async () => {
      setOptimisticFollowing(next)
      const result = next ? await followUser(userId) : await unfollowUser(userId)
      if (result.ok) {
        setFollowing(result.data.following)
        onChange?.(result.data.following, result.data.followers)
        if (result.message) toast.success(result.message)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (optimisticFollowing) {
    return (
      <Button
        type="button"
        variant="secondary"
        size={size}
        onClick={toggle}
        aria-pressed
        aria-busy={pending}
        aria-label={`Following @${username}`}
        title={`Unfollow @${username}`}
        className={cn(
          "min-w-28 border-primary/30 hover:border-destructive/50 hover:bg-destructive/15 hover:text-destructive max-sm:h-9 max-sm:px-3",
          className,
        )}
      >
        <span className="inline-flex items-center gap-1.5 group-hover/button:hidden">
          <CheckIcon className="text-primary" />
          Following
        </span>
        <span className="hidden items-center gap-1.5 group-hover/button:inline-flex">
          <UserMinusIcon />
          Unfollow
        </span>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      size={size}
      onClick={toggle}
      aria-pressed={false}
      aria-busy={pending}
      aria-label={`Follow @${username}`}
      className={cn("min-w-28 max-sm:h-9 max-sm:px-3", className)}
    >
      <UserPlusIcon data-icon="inline-start" />
      Follow
    </Button>
  )
}
