import "server-only"
import { and, eq, gt } from "drizzle-orm"
import { Effect } from "effect"
import { activities, type ActivityKind } from "@/lib/db/schema"
import { dbQuery } from "@/lib/effect/database"

/**
 * Append an entry to the activity log (powers /feed and profile activity).
 * De-duplicates identical events from the same user within 10 minutes so
 * toggling something on/off/on doesn't spam followers.
 */
export const logActivity = (entry: {
  userId: string
  kind: ActivityKind
  gameId?: number | null
  targetUserId?: string | null
  reviewId?: string | null
  rating?: number | null
}) =>
  dbQuery("activities.log", async (db) => {
    const since = new Date(Date.now() - 10 * 60 * 1000)
    const conditions = [eq(activities.userId, entry.userId), eq(activities.kind, entry.kind), gt(activities.createdAt, since)]
    if (entry.gameId) conditions.push(eq(activities.gameId, entry.gameId))
    if (entry.targetUserId) conditions.push(eq(activities.targetUserId, entry.targetUserId))
    const recent = await db.select({ id: activities.id }).from(activities).where(and(...conditions)).limit(1)
    if (recent[0]) {
      // refresh the existing event instead of adding a duplicate
      await db
        .update(activities)
        .set({ createdAt: new Date(), rating: entry.rating ?? null, reviewId: entry.reviewId ?? null })
        .where(eq(activities.id, recent[0].id))
      return
    }
    await db.insert(activities).values({
      userId: entry.userId,
      kind: entry.kind,
      gameId: entry.gameId ?? null,
      targetUserId: entry.targetUserId ?? null,
      reviewId: entry.reviewId ?? null,
      rating: entry.rating ?? null,
    })
  }).pipe(
    // the feed is best-effort: never fail the user's action because logging failed
    Effect.catchTag("DbError", (e) => Effect.logWarning("activity log failed", e.op)),
  )
