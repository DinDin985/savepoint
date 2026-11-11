import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * Letterboxed cover art for a positioned (relative/absolute) portrait box.
 * Several Nintendo covers are square eShop icons: like `GameCard`, the cover is
 * drawn `object-contain` over a blurred copy of itself so nothing is cropped.
 * Same URL twice → the browser fetches it once. Server-safe.
 */
export function CoverArt({
  src,
  sizes,
  alt = "",
  preload = false,
  className,
  fillClassName,
}: {
  src: string
  /** `sizes` for the sharp layer (the blurred fill always uses a tiny size). */
  sizes: string
  alt?: string
  preload?: boolean
  /** Extra classes for the sharp cover (e.g. hover zoom / brightness). */
  className?: string
  /** Extra classes for the blurred fill. */
  fillClassName?: string
}) {
  return (
    <>
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes="48px"
        className={cn("scale-125 object-cover opacity-70 blur-lg", fillClassName)}
      />
      <Image src={src} alt={alt} fill sizes={sizes} preload={preload} className={cn("object-contain", className)} />
    </>
  )
}
