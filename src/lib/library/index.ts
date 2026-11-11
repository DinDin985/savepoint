import "server-only"

/**
 * Server entry point for the library domain. Client components must import
 * from `@/lib/library/types` and `@/lib/library/rules` instead.
 */
export { deleteReview, getEntry, setFlag, setRating, upsertReview } from "./entries"
export { getCommunityStats, getFriendsWhoLogged, getSimilarGames } from "./community"
export * from "./types"
