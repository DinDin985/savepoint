import Image from "next/image"
import { cn } from "@/lib/utils"

const sizeClass = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-xl",
  xl: "size-24 text-3xl",
} as const

export type AvatarUser = {
  readonly username: string
  readonly displayName: string
  readonly avatarHue: number
  /** game cover URL if the user picked a game as avatar */
  readonly avatarImage?: string | null
}

/** Gradient avatar with initials, or a game-cover avatar. Server-safe. */
export function UserAvatar({
  user,
  size = "md",
  className,
}: {
  user: AvatarUser
  size?: keyof typeof sizeClass
  className?: string
}) {
  const initials =
    user.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || user.username.slice(0, 2).toUpperCase()
  const h = user.avatarHue
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ring-1 ring-white/15 select-none",
        sizeClass[size],
        className,
      )}
      style={{
        background: `linear-gradient(135deg, oklch(0.62 0.17 ${h}), oklch(0.42 0.14 ${(h + 60) % 360}))`,
      }}
      aria-hidden
    >
      {user.avatarImage ? (
        <Image src={user.avatarImage} alt="" fill sizes="96px" className="object-cover object-top" />
      ) : (
        initials
      )}
    </span>
  )
}
