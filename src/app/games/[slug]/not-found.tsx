import Link from "next/link"
import { CompassIcon, SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function GameNotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="font-pixel text-sm tracking-widest text-primary">MISSING CARTRIDGE</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance">Game not found</h1>
      <p className="mt-3 text-muted-foreground">
        We couldn&apos;t find that game in the catalog. It may have been renamed — try searching for it.
      </p>
      <form action="/games" method="get" role="search" className="mt-8 flex w-full max-w-md gap-2">
        <label htmlFor="game-search" className="sr-only">
          Search games
        </label>
        <Input id="game-search" name="q" placeholder="Search games…" className="h-9" />
        <Button type="submit" size="lg">
          <SearchIcon /> Search
        </Button>
      </form>
      <Button asChild variant="link" className="mt-4">
        <Link href="/categories">
          <CompassIcon /> Or browse by category
        </Link>
      </Button>
    </div>
  )
}
