import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MessageSquareTextIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"
import { ReviewCard } from "@/components/profile/review-card"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { getCurrentUser } from "@/lib/auth/current-user"
import { runEffect } from "@/lib/effect/runtime"
import { loadProfile } from "@/lib/profile/cached"
import { userReviews } from "@/lib/profile/queries"

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const profile = await loadProfile(username)
  return { title: profile ? "Reviews" : "Player not found" }
}

export default async function ProfileReviewsPage({ params }: Props) {
  const { username } = await params
  const [profile, viewer] = await Promise.all([loadProfile(username), getCurrentUser()])
  if (!profile) notFound()

  const reviews = await runEffect(userReviews(profile.id, 200))
  const isOwn = viewer?.id === profile.id
  const positive = reviews.filter((r) => r.recommended).length
  const negative = reviews.length - positive

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">{isOwn ? "Your reviews" : `${profile.displayName}'s reviews`}</h2>
        {reviews.length > 0 && (
          <p className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-steam-blue">
              <ThumbsUpIcon className="size-4" /> {positive}
            </span>
            <span className="inline-flex items-center gap-1 text-destructive">
              <ThumbsDownIcon className="size-4" /> {negative}
            </span>
          </p>
        )}
      </div>
      {reviews.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} lines={4} />
          ))}
        </div>
      ) : (
        <Empty className="border border-dashed border-border bg-card/30 py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareTextIcon />
            </EmptyMedia>
            <EmptyTitle>No reviews yet</EmptyTitle>
            <EmptyDescription>
              {isOwn
                ? "Share what you thought of a game — thumbs up or down, plus a few words."
                : `${profile.displayName} hasn't reviewed anything yet.`}
            </EmptyDescription>
          </EmptyHeader>
          {isOwn && (
            <EmptyContent>
              <Button asChild>
                <Link href="/games">Find a game to review</Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      )}
    </div>
  )
}
