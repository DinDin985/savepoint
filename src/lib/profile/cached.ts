import "server-only"
import { cache } from "react"
import { runEffect } from "@/lib/effect/runtime"
import { getProfileByUsername } from "./queries"

/**
 * Per-request memoised profile lookup, shared by the profile layout,
 * `generateMetadata` and every profile tab so the header query runs once.
 * Usernames are [a-z0-9_] so no decoding is needed; lookups are case-insensitive.
 */
export const loadProfile = cache((username: string) => runEffect(getProfileByUsername(username)))
