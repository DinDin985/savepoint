import type { ReactNode } from "react"
import { ChartNoAxesColumnIcon } from "lucide-react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { cn } from "@/lib/utils"

/** Card frame for one stats chart, with a built-in compact empty state. */
export function ChartCard({
  title,
  description,
  icon,
  action,
  empty,
  className,
  children,
}: {
  title: string
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  /** When set, renders this empty state instead of `children`. */
  empty?: { title: string; description: string } | null
  className?: string
  children?: ReactNode
}) {
  return (
    <Card
      className={cn(
        "@container min-w-0 transition-shadow duration-300 hover:shadow-xl hover:shadow-black/30",
        className,
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
          {icon}
          {title}
        </CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="flex-1">
        {empty ? (
          <Empty className="h-full min-h-40 border border-dashed py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartNoAxesColumnIcon />
              </EmptyMedia>
              <EmptyTitle>{empty.title}</EmptyTitle>
              <EmptyDescription>{empty.description}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
