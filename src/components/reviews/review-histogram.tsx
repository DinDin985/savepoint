"use client"

import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatCompact, formatNumber } from "@/lib/format"
import type { HistogramPoint, ReviewHistogram } from "@/lib/reviews/types"
import { cn } from "@/lib/utils"
import { formatBucketLabel, formatBucketTick } from "./review-utils"

const chartConfig = {
  up: { label: "Positive", color: "var(--steam-positive)" },
  down: { label: "Negative", color: "var(--steam-negative)" },
} satisfies ChartConfig

type Range = "overall" | "recent"

type Row = { date: number; up: number; down: number }

/**
 * Steam's review histogram: positive bars above the axis, negative bars below
 * (plotted as negative values; tooltips show absolute counts). Toggle between
 * the whole lifetime (monthly/weekly) and the last 30 days (daily).
 */
export function ReviewHistogramChart({
  histogram,
  className,
  title = "Review history",
}: {
  histogram: ReviewHistogram
  className?: string
  title?: string
}) {
  const hasOverall = histogram.overall.length > 0
  const [range, setRange] = useState<Range>(hasOverall ? "overall" : "recent")
  const unit = range === "overall" ? histogram.overallUnit : "day"
  const points: readonly HistogramPoint[] = range === "overall" ? histogram.overall : histogram.recent

  const data = useMemo<Row[]>(() => points.map((p) => ({ date: p.date, up: p.up, down: -p.down })), [points])
  const empty = data.every((d) => d.up === 0 && d.down === 0)
  const maxAbs = useMemo(() => data.reduce((m, d) => Math.max(m, d.up, -d.down), 0), [data])

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium tracking-wider text-steam-muted uppercase">{title}</p>
        <div className="inline-flex rounded-sm bg-black/25 p-0.5" role="group" aria-label="Chart range">
          {(
            [
              ["overall", "Overall"],
              ["recent", "Last 30 days"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setRange(value)}
              aria-pressed={range === value}
              disabled={value === "overall" && !hasOverall}
              className={cn(
                "inline-flex h-9 items-center rounded-[3px] px-2.5 text-xs font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 sm:h-7",
                range === value
                  ? "bg-steam-blue/90 text-steam-panel shadow-sm"
                  : "text-steam-text hover:scale-105 hover:bg-white/10 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-44 w-full sm:h-48 [&_.recharts-cartesian-axis-tick_text]:fill-steam-muted"
          initialDimension={{ width: 480, height: 192 }}
        >
          <BarChart
            accessibilityLayer
            data={data}
            stackOffset="sign"
            margin={{ top: 6, right: 4, bottom: 0, left: 0 }}
            barCategoryGap={data.length > 40 ? 0 : "12%"}
          >
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              minTickGap={28}
              tickFormatter={(value: number) => formatBucketTick(value, unit)}
            />
            <YAxis
              width={38}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[-Math.max(1, maxAbs), Math.max(1, maxAbs)]}
              tickFormatter={(value: number) => formatCompact(Math.abs(value))}
            />
            <ReferenceLine y={0} stroke="rgba(198,212,223,0.35)" />
            <ChartTooltip
              cursor={{ fill: "rgba(255,255,255,0.06)" }}
              content={
                <ChartTooltipContent
                  className="border-white/10 bg-steam-panel text-steam-text"
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as Row | undefined
                    return row ? formatBucketLabel(row.date, unit) : null
                  }}
                  formatter={(value, name) => (
                    <div className="flex w-full items-center gap-2">
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-[2px]",
                          name === "up" ? "bg-steam-positive" : "bg-steam-negative",
                        )}
                      />
                      <span className="text-steam-muted">{name === "up" ? "Positive" : "Negative"}</span>
                      <span className="ml-auto font-mono font-medium text-steam-text tabular-nums">
                        {formatNumber(Math.abs(Number(value)))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="up" stackId="reviews" fill="var(--color-up)" radius={[2, 2, 0, 0]} maxBarSize={28} />
            <Bar dataKey="down" stackId="reviews" fill="var(--color-down)" radius={[2, 2, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ChartContainer>
        {empty ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-steam-muted">
            {range === "recent" ? "No reviews in the last 30 days" : "No reviews yet"}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-4 text-[11px] text-steam-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-steam-positive" /> Positive
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-steam-negative" /> Negative
        </span>
        <span className="ml-auto">{range === "overall" ? `Per ${histogram.overallUnit}` : "Per day"}</span>
      </div>
    </div>
  )
}
