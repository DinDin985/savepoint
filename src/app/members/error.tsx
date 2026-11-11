"use client"

import { RouteError } from "@/components/profile/route-error"

export default function MembersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <RouteError error={error} reset={reset} title="Members failed to load" />
    </div>
  )
}
