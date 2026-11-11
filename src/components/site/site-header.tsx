import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/current-user"
import { Logo } from "./logo"
import { MainNav } from "./main-nav"
import { MobileNav } from "./mobile-nav"
import { SearchBox } from "./search-box"
import { UserMenu } from "./user-menu"

export async function SiteHeader() {
  const user = await getCurrentUser()
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Suspense>
          <MobileNav signedIn={!!user} username={user?.username} />
        </Suspense>
        <Logo className="mr-2" />
        <MainNav signedIn={!!user} />
        <div className="ml-auto flex items-center gap-2">
          <Suspense>
            <SearchBox className="hidden w-48 sm:block lg:w-64" />
          </Suspense>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
