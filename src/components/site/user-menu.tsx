"use client"

import Link from "next/link"
import {
  BookmarkIcon,
  Gamepad2Icon,
  LogOutIcon,
  MessageSquareTextIcon,
  SettingsIcon,
  TrophyIcon,
  UserIcon,
} from "lucide-react"
import { signOutAction } from "@/actions/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/user/user-avatar"
import type { SessionUser } from "@/lib/auth/session"

export function UserMenu({ user }: { user: SessionUser }) {
  const base = `/u/${user.username}`
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-all duration-200 hover:scale-105 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring outline-none"
        aria-label="Account menu"
      >
        <UserAvatar user={user} size="sm" />
        <span className="hidden max-w-28 truncate text-sm font-medium lg:inline">{user.displayName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <span className="truncate">@{user.username}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={base}>
              <UserIcon /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${base}/games`}>
              <Gamepad2Icon /> Games
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${base}/reviews`}>
              <MessageSquareTextIcon /> Reviews
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${base}/wishlist`}>
              <BookmarkIcon /> Wishlist
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings/top-games">
              <TrophyIcon /> Edit Top 10
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOutIcon /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
