import type { Game } from "@/lib/db/schema"

/**
 * STUB — implemented by the "reviews" feature.
 * Renders the Steam-style reviews area for a game: tabs for Savepoint community,
 * Steam and Epic Games reviews, filters (recent / all / positive / negative)
 * and the positive-vs-negative chart.
 */
export async function ReviewsSection({ game }: { game: Game; currentUserId: string | null }) {
  return (
    <section id="reviews" className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
      Reviews for {game.title} coming soon.
    </section>
  )
}
