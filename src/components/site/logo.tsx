import Link from "next/link"
import { cn } from "@/lib/utils"

/** Pixel save-crystal + wordmark. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("group/logo flex items-center gap-2", className)} aria-label="Savepoint home">
      <svg
        viewBox="0 0 16 16"
        className="size-7 drop-shadow-[0_0_10px_var(--primary)] transition-transform duration-300 group-hover/logo:scale-110 group-hover/logo:rotate-12"
        shapeRendering="crispEdges"
        aria-hidden
      >
        <path fill="oklch(0.82 0.17 160)" d="M7 1h2v1h1v1h1v1h1v2h1v4h-1v2h-1v1h-1v1H9v1H7v-1H6v-1H5v-1H4v-2H3V6h1V4h1V3h1V2h1z" />
        <path fill="oklch(0.93 0.1 160)" d="M7 3h1v1h1v2H8v2H7V6H6V4h1z" />
        <path fill="oklch(0.55 0.14 160)" d="M10 8h1v2h-1v2H9v1H8v-1h1v-2h1z" />
      </svg>
      {!compact && (
        <span className="font-pixel text-lg tracking-wide text-foreground transition-colors group-hover/logo:text-primary">
          SAVEPOINT
        </span>
      )}
    </Link>
  )
}
