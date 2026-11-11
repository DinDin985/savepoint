import { StarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const sizeClass = {
  xs: "size-2.5",
  sm: "size-3.5",
  md: "size-4.5",
  lg: "size-6",
} as const

/**
 * Read-only 5-star display for a half-star rating on the 1–10 scale
 * (fractional averages like 7.4 render as partially filled stars).
 */
export function RatingStars({
  rating,
  size = "sm",
  className,
  showValue = false,
}: {
  rating: number
  size?: keyof typeof sizeClass
  className?: string
  showValue?: boolean
}) {
  const stars = Math.max(0, Math.min(10, rating)) / 2
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${stars.toFixed(1)} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, stars - i))
        return (
          <span key={i} className={cn("relative inline-block", sizeClass[size])}>
            <StarIcon className={cn("absolute inset-0 text-white/20", sizeClass[size])} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <StarIcon className={cn("text-star", sizeClass[size])} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        )
      })}
      {showValue && <span className="ml-1 text-xs font-medium text-muted-foreground tabular-nums">{stars.toFixed(1)}</span>}
    </span>
  )
}
