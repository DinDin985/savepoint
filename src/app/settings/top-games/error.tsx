"use client"

import { RouteError } from "@/components/profile/route-error"

export default function TopGamesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} title="The Top 10 editor failed to load" backHref="/settings" backLabel="Back to settings" />
}
