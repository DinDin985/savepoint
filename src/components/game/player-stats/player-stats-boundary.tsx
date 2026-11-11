"use client"

import { Component, type ReactNode } from "react"
import { ActivityIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type State = { readonly failed: boolean }

/**
 * Keeps an unexpected failure in the player-stats card from taking down the
 * whole game page: shows a small error card with a reload button instead.
 */
export class PlayerStatsBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error("[player-stats]", error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <ActivityIcon className="size-4 text-muted-foreground" aria-hidden />
            Player stats
          </CardTitle>
          <CardDescription>Player numbers couldn&apos;t be loaded right now.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="sm"
            variant="outline"
            className="max-sm:h-9 hover:text-primary"
            onClick={() => window.location.reload()}
          >
            <RotateCcwIcon data-icon="inline-start" />
            Reload
          </Button>
        </CardContent>
      </Card>
    )
  }
}
