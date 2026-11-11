"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { MenuIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"
import { BROWSE_SECTIONS, PRIMARY_NAV } from "./nav-config"
import { SearchBox } from "./search-box"

export function MobileNav({ signedIn, username }: { signedIn: boolean; username?: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const close = () => setOpen(false)
  const links = [
    { href: "/", label: "Home" },
    ...PRIMARY_NAV,
    ...(signedIn ? [{ href: "/feed", label: "Activity" }] : []),
    ...(signedIn && username
      ? [
          { href: `/u/${username}`, label: "My profile" },
          { href: "/settings", label: "Settings" },
        ]
      : [
          { href: "/sign-in", label: "Sign in" },
          { href: "/sign-up", label: "Create account" },
        ]),
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle asChild>
            <div onClick={close}>
              <Logo />
            </div>
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-8">
          <SearchBox onNavigate={close} />
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={close}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-all hover:translate-x-1 hover:bg-accent",
                  pathname === l.href && "bg-accent text-primary",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          {BROWSE_SECTIONS.map((s) => (
            <div key={s.title}>
              <p className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{s.title}</p>
              <div className="flex flex-wrap gap-1.5 px-3">
                {s.links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={close}
                    className="rounded-full border px-2.5 py-1 text-xs transition-all hover:scale-105 hover:border-primary hover:text-primary"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
