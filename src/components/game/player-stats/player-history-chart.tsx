"use client"

import { useId, useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatCompact, formatNumber } from "@/lib/format"
import { longMonthLabel, shortMonthLabel } from "@/lib/stats/months"
import type { PlayerHistoryPoint } from "@/lib/steam/types"

type Range = "12" | "24" | "all"

const RANGES: { value: Range; label: string; aria: string }[] = [
  { value: "12", label: "12m", aria: "Last 12 months" },
  { value: "24", label: "24m", aria: "Last 24 months" },
  { value: "all", label: "All", aria: "All time" },
]

const chartConfig = {
  peak: { label: "Peak players", color: "var(--chart-1)" },
  avg: { label: "Avg. players", color: "var(--chart-2)" },
} satisfies ChartConfig

/** Monthly peak & average concurrent players (SteamCharts) with a 12m / 24m / All toggle. */
export function PlayerHistoryChart({ history, title }: { history: readonly PlayerHistoryPoint[]; title: string }) {
  // default to 24 months; short histories (≤ 12 months) start on 12m, the only distinct range
  const [range, setRange] = useState<Range>(() => (history.length > 12 ? "24" : "12"))
  const gradientId = `ph${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`

  const data = useMemo(() => {
    const points = range === "all" ? history : history.slice(-Number(range))
    return points.map((p) => ({ ...p }))
  }, [history, range])

  const first = data[0]
  const last = data.at(-1)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Players over time</h3>
          <p className="text-xs text-muted-foreground">
            {first && last
              ? `${longMonthLabel(first.month)} – ${longMonthLabel(last.month)}`
              : "Monthly averages and peaks"}
          </p>
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          spacing={0}
          value={range}
          onValueChange={(v) => v && setRange(v as Range)}
          aria-label="Chart range"
        >
          {RANGES.map((r) => (
            <ToggleGroupItem
              key={r.value}
              value={r.value}
              aria-label={r.aria}
              disabled={r.value === "24" ? history.length <= 12 : r.value === "all" ? history.length <= 24 : false}
              className="px-2.5 text-xs transition-colors max-sm:h-9 max-sm:min-w-11 hover:text-primary data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
            >
              {r.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[200px] w-full @md:h-[240px]"
        role="figure"
        aria-label={`${title}: monthly peak and average Steam players`}
      >
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`${gradientId}-peak`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-peak)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-peak)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`${gradientId}-avg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-avg)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-avg)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={28}
            tickFormatter={(v: string) => shortMonthLabel(v)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tickMargin={4}
            tickFormatter={(v: number) => formatCompact(v)}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: "4 4" }}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(_, payload) => {
                  const month = (payload?.[0]?.payload as PlayerHistoryPoint | undefined)?.month
                  return month ? longMonthLabel(month) : ""
                }}
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="h-2.5 w-1 rounded-[2px]"
                        style={{ background: name === "peak" ? "var(--color-peak)" : "var(--color-avg)" }}
                      />
                      {name === "peak" ? "Peak players" : "Avg. players"}
                    </span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatNumber(typeof value === "number" ? Math.round(value) : Number(value))}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Area
            dataKey="peak"
            type="monotone"
            stroke="var(--color-peak)"
            strokeWidth={2}
            fill={`url(#${gradientId}-peak)`}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
          <Area
            dataKey="avg"
            type="monotone"
            stroke="var(--color-avg)"
            strokeWidth={2}
            fill={`url(#${gradientId}-avg)`}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>

      <details className="group/table text-xs">
        <summary className="inline-flex min-h-9 cursor-pointer list-none items-center rounded-md text-muted-foreground transition-colors select-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none sm:min-h-7 [&::-webkit-details-marker]:hidden">
          <span className="group-open/table:hidden">Show as table</span>
          <span className="hidden group-open/table:inline">Hide table</span>
        </summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-md ring-1 ring-border">
          <table className="w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-card text-muted-foreground">
              <tr>
                <th className="px-3 py-1.5 font-medium">Month</th>
                <th className="px-3 py-1.5 text-right font-medium">Avg.</th>
                <th className="px-3 py-1.5 text-right font-medium">Peak</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((p) => (
                <tr key={p.month} className="border-t border-border/60 transition-colors hover:bg-muted/50">
                  <td className="px-3 py-1.5">{longMonthLabel(p.month)}</td>
                  <td className="px-3 py-1.5 text-right">{formatNumber(p.avg)}</td>
                  <td className="px-3 py-1.5 text-right">{formatNumber(p.peak)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
