import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ProfileForm } from "@/components/profile/profile-form"
import { requireUser } from "@/lib/auth/current-user"
import { runEffect } from "@/lib/effect/runtime"
import { loadProfile } from "@/lib/profile/cached"
import { getPickerGames } from "@/lib/profile/queries"

export const metadata: Metadata = { title: "Profile settings" }

export default async function SettingsProfilePage() {
  const user = await requireUser("/settings")
  const [profile, games] = await Promise.all([loadProfile(user.username), runEffect(getPickerGames())])
  if (!profile) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground">How you show up across Savepoint.</p>
      </div>
      <ProfileForm
        username={profile.username}
        games={games}
        initial={{
          displayName: profile.displayName,
          bio: profile.bio,
          location: profile.location,
          avatarHue: profile.avatarHue,
          avatarGameId: profile.avatarGameId,
          bannerGameId: profile.bannerGameId,
        }}
      />
    </div>
  )
}
