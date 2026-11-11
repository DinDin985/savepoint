"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { TrophyIcon, UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/settings", label: "Profile", icon: UserIcon },
  { href: "/settings/top-games", label: "Top 10 games", icon: TrophyIcon },
] as const

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 hover:translate-x-0.5 hover:bg-accent",
            pathname === href ? "bg-accent text-primary" : "text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
