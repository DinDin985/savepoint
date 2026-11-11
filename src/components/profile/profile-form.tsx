"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { startTransition, useActionState, useMemo, useState } from "react"
import { ChevronsUpDownIcon, ImageIcon, PaletteIcon, SaveIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { updateProfileAction } from "@/actions/profile"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { UserAvatar } from "@/components/user/user-avatar"
import { PROFILE_LIMITS, type PickerGame, type ProfileFormState } from "@/lib/profile/types"
import { cn } from "@/lib/utils"
import { CoverArt } from "./cover-art"
import { GamePicker } from "./game-picker"

const HUES = [0, 25, 50, 85, 130, 160, 185, 210, 240, 270, 300, 330] as const

type Editable = {
  displayName: string
  bio: string
  location: string
  avatarMode: "gradient" | "cover"
  avatarGameId: number | null
  avatarHue: number
  bannerGameId: number | null
}

const initialState: ProfileFormState = {}

/**
 * Profile settings form (useActionState): names, bio with live counter, location,
 * avatar (gradient colour or a game cover) and profile backdrop (a game's hero
 * art) — both searchable pickers over the full catalog — with a live preview.
 */
export function ProfileForm({
  username,
  initial,
  games,
}: {
  username: string
  initial: {
    displayName: string
    bio: string
    location: string | null
    avatarHue: number
    avatarGameId: number | null
    bannerGameId: number | null
  }
  games: readonly PickerGame[]
}) {
  const router = useRouter()
  const start: Editable = {
    displayName: initial.displayName,
    bio: initial.bio,
    location: initial.location ?? "",
    avatarMode: initial.avatarGameId ? "cover" : "gradient",
    avatarGameId: initial.avatarGameId,
    avatarHue: initial.avatarHue,
    bannerGameId: initial.bannerGameId,
  }
  const [values, setValues] = useState<Editable>(start)
  const [saved, setSaved] = useState<Editable>(start)
  const set = <K extends keyof Editable>(key: K, value: Editable[K]) => setValues((v) => ({ ...v, [key]: value }))

  const [state, formAction, pending] = useActionState(async (prev: ProfileFormState, formData: FormData) => {
    const submitted = values
    const result = await updateProfileAction(prev, formData)
    if (result.ok) {
      setSaved(submitted)
      toast.success(result.message ?? "Profile saved", {
        description: "Your changes are live.",
        action: { label: "View profile", onClick: () => router.push(`/u/${result.username ?? username}`) },
      })
    } else if (result.error) {
      toast.error(result.error)
    }
    return result
  }, initialState)
  const fe = state.fieldErrors ?? {}

  const byId = useMemo(() => new Map(games.map((g) => [g.id, g])), [games])
  const avatarGame = values.avatarGameId ? byId.get(values.avatarGameId) : undefined
  const bannerGame = values.bannerGameId ? byId.get(values.bannerGameId) : undefined
  const effectiveAvatarId = values.avatarMode === "cover" ? (avatarGame?.id ?? null) : null
  const savedAvatarId = saved.avatarMode === "cover" ? saved.avatarGameId : null
  const dirty =
    values.displayName.trim() !== saved.displayName.trim() ||
    values.bio.trim() !== saved.bio.trim() ||
    values.location.trim() !== saved.location.trim() ||
    effectiveAvatarId !== savedAvatarId ||
    values.avatarHue !== saved.avatarHue ||
    values.bannerGameId !== saved.bannerGameId

  const previewUser = {
    username,
    displayName: values.displayName.trim() || username,
    avatarHue: values.avatarHue,
    avatarImage: effectiveAvatarId ? (avatarGame?.coverImage ?? null) : null,
  }
  const bioLeft = PROFILE_LIMITS.bio - values.bio.length

  return (
    <form
      className="space-y-8"
      noValidate
      onSubmit={(e) => {
        // dispatch manually (instead of <form action>) so React doesn't reset the form afterwards
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        startTransition(() => formAction(formData))
      }}
    >
      <input type="hidden" name="avatarGameId" value={effectiveAvatarId ?? ""} />
      <input type="hidden" name="avatarHue" value={values.avatarHue} />
      <input type="hidden" name="bannerGameId" value={values.bannerGameId ?? ""} />

      {/* Live preview */}
      <div className="group/preview overflow-hidden rounded-xl border border-border bg-card">
        <div className="relative aspect-[3/1] min-h-28 overflow-hidden">
          {bannerGame ? (
            <Image
              key={bannerGame.id}
              src={bannerGame.heroImage}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              className="object-cover duration-500 animate-in fade-in transition-transform group-hover/preview:scale-105"
            />
          ) : (
            <div
              className="absolute inset-0 transition-transform duration-700 group-hover/preview:scale-105"
              style={{
                background: `radial-gradient(120% 140% at 15% 0%, oklch(0.5 0.15 ${values.avatarHue} / 70%), transparent 60%), radial-gradient(100% 120% at 100% 20%, oklch(0.45 0.14 ${(values.avatarHue + 60) % 360} / 55%), transparent 65%)`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          <span className="absolute top-2 right-2 rounded-full bg-black/50 px-2 py-0.5 font-pixel text-[9px] tracking-widest text-white/80 uppercase backdrop-blur">
            Preview
          </span>
        </div>
        <div className="relative -mt-10 flex items-end gap-3 px-4 pb-4">
          <UserAvatar user={previewUser} size="lg" className="ring-4 ring-card sm:size-20" />
          <div className="min-w-0 pb-1">
            <p className="truncate font-bold tracking-tight">{previewUser.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              @{username}
              {values.location.trim() && ` · ${values.location.trim()}`}
            </p>
          </div>
        </div>
      </div>

      {state.error && !Object.keys(fe).length && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field data-invalid={!!fe.displayName}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="displayName">Display name</FieldLabel>
            <span className="text-xs text-muted-foreground tabular-nums">
              {values.displayName.length}/{PROFILE_LIMITS.displayName}
            </span>
          </div>
          <Input
            id="displayName"
            name="displayName"
            value={values.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            maxLength={PROFILE_LIMITS.displayName}
            required
            aria-invalid={!!fe.displayName}
            autoComplete="nickname"
          />
          {fe.displayName ? (
            <FieldError>{fe.displayName}</FieldError>
          ) : (
            <FieldDescription>Shown on your profile, reviews and in friends&apos; feeds.</FieldDescription>
          )}
        </Field>

        <Field data-invalid={!!fe.bio}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="bio">Bio</FieldLabel>
            <span
              className={cn(
                "text-xs tabular-nums transition-colors",
                bioLeft < 0 ? "text-destructive" : bioLeft <= 30 ? "text-star" : "text-muted-foreground",
              )}
              aria-live="polite"
            >
              {bioLeft} left
            </span>
          </div>
          <Textarea
            id="bio"
            name="bio"
            value={values.bio}
            onChange={(e) => set("bio", e.target.value)}
            maxLength={PROFILE_LIMITS.bio}
            rows={4}
            placeholder="Soulslike enjoyer. Will 100% anything with a map."
            aria-invalid={!!fe.bio}
            className="min-h-24"
          />
          {fe.bio && <FieldError>{fe.bio}</FieldError>}
        </Field>

        <Field data-invalid={!!fe.location}>
          <FieldLabel htmlFor="location">
            Location <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Input
            id="location"
            name="location"
            value={values.location}
            onChange={(e) => set("location", e.target.value)}
            maxLength={PROFILE_LIMITS.location}
            placeholder="Hyrule, probably"
            aria-invalid={!!fe.location}
            autoComplete="address-level2"
          />
          {fe.location && <FieldError>{fe.location}</FieldError>}
        </Field>
      </FieldGroup>

      <FieldSet>
        <FieldLegend>Avatar</FieldLegend>
        <FieldDescription>A colourful gradient with your initials, or the cover of a game you love.</FieldDescription>
        <ToggleGroup
          type="single"
          variant="outline"
          value={values.avatarMode}
          onValueChange={(v) => v && set("avatarMode", v as Editable["avatarMode"])}
          aria-label="Avatar style"
        >
          <ToggleGroupItem
            value="gradient"
            className="gap-1.5 px-3 transition-all hover:scale-105 data-[state=on]:border-primary/60 data-[state=on]:text-primary"
          >
            <PaletteIcon /> Gradient
          </ToggleGroupItem>
          <ToggleGroupItem
            value="cover"
            className="gap-1.5 px-3 transition-all hover:scale-105 data-[state=on]:border-primary/60 data-[state=on]:text-primary"
          >
            <ImageIcon /> Game cover
          </ToggleGroupItem>
        </ToggleGroup>

        {values.avatarMode === "gradient" ? (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar colour">
            {HUES.map((h) => {
              const active = values.avatarHue === h
              return (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`Hue ${h}`}
                  onClick={() => set("avatarHue", h)}
                  className={cn(
                    "size-9 rounded-full ring-offset-2 ring-offset-background transition-all duration-200 hover:scale-115",
                    active ? "scale-110 ring-2 ring-primary" : "ring-1 ring-white/15",
                  )}
                  style={{ background: `linear-gradient(135deg, oklch(0.62 0.17 ${h}), oklch(0.42 0.14 ${(h + 60) % 360}))` }}
                />
              )
            })}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <GamePicker
              games={games}
              selectedId={values.avatarGameId}
              onSelect={(g) => set("avatarGameId", g.id)}
              placeholder="Search covers…"
            >
              <Button type="button" variant="outline" className="h-auto min-w-56 justify-between gap-3 py-1.5 pl-1.5">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="relative aspect-[2/3] w-8 shrink-0 overflow-hidden rounded-sm bg-muted ring-1 ring-white/10">
                    {avatarGame && <CoverArt src={avatarGame.coverImage} sizes="32px" />}
                  </span>
                  <span className="truncate">{avatarGame ? avatarGame.title : "Choose a game cover"}</span>
                </span>
                <ChevronsUpDownIcon className="text-muted-foreground" />
              </Button>
            </GamePicker>
            {!avatarGame && <span className="text-xs text-muted-foreground">Until you pick one, your gradient is used.</span>}
          </div>
        )}
        {fe.avatarGameId && <FieldError>{fe.avatarGameId}</FieldError>}
        {fe.avatarHue && <FieldError>{fe.avatarHue}</FieldError>}
      </FieldSet>

      <FieldSet>
        <FieldLegend>Profile backdrop</FieldLegend>
        <FieldDescription>
          Hero art from any game in the catalog — Steam, Epic or Nintendo. Without one, your #1 game is used.
        </FieldDescription>
        <div className="flex flex-wrap items-center gap-2">
          <GamePicker
            games={games}
            variant="hero"
            selectedId={values.bannerGameId}
            onSelect={(g) => set("bannerGameId", g.id)}
            placeholder="Search backdrops…"
          >
            <Button type="button" variant="outline" className="h-auto min-w-56 justify-between gap-3 py-1.5 pl-1.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="relative aspect-[16/7] w-16 shrink-0 overflow-hidden rounded-sm bg-muted ring-1 ring-white/10">
                  {bannerGame && <Image src={bannerGame.heroImage} alt="" fill sizes="64px" className="object-cover" />}
                </span>
                <span className="truncate">{bannerGame ? bannerGame.title : "Choose a backdrop"}</span>
              </span>
              <ChevronsUpDownIcon className="text-muted-foreground" />
            </Button>
          </GamePicker>
          {bannerGame && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => set("bannerGameId", null)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2Icon data-icon="inline-start" />
              Remove
            </Button>
          )}
        </div>
        {fe.bannerGameId && <FieldError>{fe.bannerGameId}</FieldError>}
      </FieldSet>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/85 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4">
        <div className="flex items-center gap-2 text-sm">
          {dirty ? (
            <Badge variant="outline" className="border-star/40 text-star">
              <span className="size-1.5 animate-pulse rounded-full bg-star" /> Unsaved changes
            </Badge>
          ) : (
            <span className="text-muted-foreground">All changes saved</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href={`/u/${username}`}>View profile</Link>
          </Button>
          {dirty && (
            <Button type="button" variant="outline" onClick={() => setValues(saved)} disabled={pending}>
              Reset
            </Button>
          )}
          <Button type="submit" disabled={pending || !values.displayName.trim()}>
            {pending ? <Spinner /> : <SaveIcon data-icon="inline-start" />}
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>
    </form>
  )
}
