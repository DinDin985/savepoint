import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="font-pixel text-sm tracking-widest text-primary">ERROR 404</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance">You fell out of bounds.</h1>
      <p className="mt-3 text-muted-foreground">
        This page doesn&apos;t exist — or it got patched out. Let&apos;s respawn you somewhere safe.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/games">Browse games</Link>
        </Button>
      </div>
    </div>
  )
}
