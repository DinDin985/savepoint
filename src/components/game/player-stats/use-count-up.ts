"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Animates a number from its previous value to `target` (ease-out cubic).
 * Honours `prefers-reduced-motion` by jumping straight to the target.
 */
export function useCountUp(target: number | null, durationMs = 900): number | null {
  const [display, setDisplay] = useState(target)
  const currentRef = useRef(target)

  useEffect(() => {
    if (target === null || currentRef.current === target) return
    const from = currentRef.current
    if (from === null) {
      const raf = requestAnimationFrame(() => {
        currentRef.current = target
        setDisplay(target)
      })
      return () => cancelAnimationFrame(raf)
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const start = performance.now()
    let raf = 0
    const step = (time: number) => {
      const progress = reduceMotion ? 1 : Math.min(1, (time - start) / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      const value = Math.round(from + (target - from) * eased)
      currentRef.current = value
      setDisplay(value)
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return display
}
