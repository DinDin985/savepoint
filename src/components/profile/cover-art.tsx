import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * Game cover that never crops: portrait box art fills the box exactly, while
 * square Nintendo eShop icons and wide Wikipedia banners are letterboxed over a
 * blurred copy of themselves (same treatment as `GameCard`). Server-safe.
 *
 * Render inside a `relative overflow-hidden` box with the aspect ratio you want;
 * `className` goes on the layer wrapper, so hover transforms zoom both layers.
 */
export function CoverArt({
  src,
  alt = "",
  sizes,
  className,
  priority = false,
}: {
  src: string
  alt?: string
  sizes: string
  className?: string
  priority?: boolean
}) {
  return (
    <span className={cn("absolute inset-0 block", className)}>
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes="32px"
        draggable={false}
        className="scale-125 object-cover opacity-60 blur-md"
      />
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} draggable={false} className="object-contain" />
    </span>
  )
}
