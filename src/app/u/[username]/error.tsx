"use client"

import { RouteError } from "@/components/profile/route-error"

export default function ProfileError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} title="This part of the profile failed to load" backHref="/members" backLabel="Browse members" />
}
