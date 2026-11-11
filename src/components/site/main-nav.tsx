"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import { BROWSE_SECTIONS, PRIMARY_NAV } from "./nav-config"

/** Desktop navigation (Next.js <Link> + shadcn NavigationMenu). */
export function MainNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <NavigationMenu className="hidden md:flex">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent">Browse</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-[640px] grid-cols-3 gap-4 p-4">
              {BROWSE_SECTIONS.map((section) => (
                <div key={section.title}>
                  <p className="mb-2 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {section.title}
                  </p>
                  <ul className="space-y-0.5">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={link.href}
                            className="block rounded-md px-2 py-1.5 transition-all duration-200 hover:translate-x-1 hover:bg-accent"
                          >
                            <span className="block text-sm font-medium">{link.label}</span>
                            <span className="block text-xs text-muted-foreground line-clamp-1">{link.blurb}</span>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        {PRIMARY_NAV.map((item) => (
          <NavigationMenuItem key={item.href}>
            <NavigationMenuLink asChild active={isActive(item.href)}>
              <Link
                href={item.href}
                className={cn(navigationMenuTriggerStyle(), "bg-transparent data-[active=true]:text-primary")}
              >
                {item.label}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
        {signedIn && (
          <NavigationMenuItem>
            <NavigationMenuLink asChild active={isActive("/feed")}>
              <Link href="/feed" className={cn(navigationMenuTriggerStyle(), "bg-transparent data-[active=true]:text-primary")}>
                Activity
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        )}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
