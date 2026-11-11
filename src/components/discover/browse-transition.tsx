"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { createContext, use, useCallback, useMemo, useTransition, type ComponentProps, type ReactNode } from "react"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type NavigateOptions = { readonly scroll?: boolean; readonly history?: "replace" | "push" }
type BrowseTransition = { readonly isPending: boolean; readonly navigate: (href: string, options?: NavigateOptions) => void }

const BrowseTransitionContext = createContext<BrowseTransition | null>(null)

/**
 * Shares one `useTransition` between the filter controls, pagination and the
 * results grid so any URL update dims the grid until the new results stream in.
 */
export function BrowseTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const navigate = useCallback(
    (href: string, options?: NavigateOptions) => {
      startTransition(() => {
        if (options?.history === "push") router.push(href, { scroll: options.scroll ?? false })
        else router.replace(href, { scroll: options?.scroll ?? false })
      })
    },
    [router],
  )
  const value = useMemo(() => ({ isPending, navigate }), [isPending, navigate])
  return <BrowseTransitionContext value={value}>{children}</BrowseTransitionContext>
}

const fallback: BrowseTransition = {
  isPending: false,
  navigate: (href) => window.location.assign(href),
}

export function useBrowseTransition(): BrowseTransition {
  return use(BrowseTransitionContext) ?? fallback
}

/** Dims (and disables) its children while a browse navigation is pending. */
export function PendingDim({ children, className }: { children: ReactNode; className?: string }) {
  const { isPending } = useBrowseTransition()
  return (
    <div
      aria-busy={isPending}
      className={cn(
        "transition-[opacity,filter] duration-300",
        isPending && "pointer-events-none opacity-45 saturate-50 delay-100",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PendingIndicator({ className }: { className?: string }) {
  const { isPending } = useBrowseTransition()
  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-opacity duration-200",
        isPending ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {isPending && (
        <>
          <Spinner className="size-3.5 text-primary" />
          Updating…
        </>
      )}
    </span>
  )
}

/**
 * A real link (works with middle-click / new tab) whose plain left-clicks go
 * through the shared transition so the grid dims while the next page loads.
 */
export function TransitionLink({
  href,
  onClick,
  scroll = true,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string; scroll?: boolean }) {
  const { navigate } = useBrowseTransition()
  return (
    <Link
      href={href}
      scroll={scroll}
      onClick={(event) => {
        onClick?.(event)
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return
        event.preventDefault()
        navigate(href, { history: "push", scroll })
      }}
      {...props}
    />
  )
}
