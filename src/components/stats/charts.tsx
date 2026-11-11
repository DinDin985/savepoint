"use client"

import { useId } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { RatingStars } from "@/components/game/rating-stars"
import { formatNumber } from "@/lib/format"
import { longMonthLabel, shortMonthLabel } from "@/lib/stats/months"
import type { ActivityBucket, CategoryCount, DecadeCount, RatingBucket } from "@/lib/stats/types"
import { cn } from "@/lib/utils"

/* Categorical hues in fixed order (never cycled). Anything past the 5th folds into "Other". */
const CATEGORICAL = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"] as const
const OTHER_COLOR = "var(--muted-foreground)"

const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`
const stars = (rating: number) => (rating / 2).toLocaleString("en-US", { maximumFractionDigits: 1 })
const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "")

/** Single tooltip row: colour key + label + value (text never wears the series colour). */
function TooltipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {color && <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: color }} />}
        {label}
      </span>
      <span className="font-mono font-medium text-foreground tabular-nums">{value}</span>
    </div>
  )
}

/* ── Rating distribution ───────────────────────────────────────────────── */

const ratingConfig = { count: { label: "Games", color: "var(--star)" } } satisfies ChartConfig

export function RatingDistributionChart({ data }: { data: readonly RatingBucket[] }) {
  return (
    <ChartContainer
      config={ratingConfig}
      className="aspect-auto h-[200px] w-full"
      role="figure"
      aria-label="Rating distribution chart"
    >
      <BarChart data={[...data]} margin={{ top: 18, right: 4, left: 4, bottom: 0 }} barCategoryGap="12%">
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          interval="preserveStartEnd"
          minTickGap={2}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => {
                const bucket = item.payload as RatingBucket
                return (
                  <div className="grid gap-1.5">
                    <span className="flex items-center gap-2">
                      <RatingStars rating={bucket.rating} size="sm" />
                      <span className="text-muted-foreground">{stars(bucket.rating)}</span>
                    </span>
                    <TooltipRow label="Rated" value={plural(Number(value), "game")} />
                  </div>
                )
              }}
            />
          }
        />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
          activeBar={{ fillOpacity: 0.8 }}
        >
          <LabelList
            dataKey="count"
            position="top"
            offset={6}
            className="fill-muted-foreground text-[10px] tabular-nums"
            formatter={(v: unknown) => (Number(v) > 0 ? formatNumber(Number(v)) : "")}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/* ── Horizontal category bars (genres, platforms) — click a bar to browse it ─ */

export function CategoryBarChart({
  data,
  color = "var(--chart-1)",
  unit = "game",
  label,
  browseLabel = "Browse these categories",
}: {
  data: readonly CategoryCount[]
  color?: string
  unit?: string
  label: string
  /** Accessible name of the link list that mirrors the clickable bars. */
  browseLabel?: string
}) {
  const router = useRouter()
  const config = { count: { label: "Games", color } } satisfies ChartConfig
  const rows = [...data]
  const height = Math.max(120, rows.length * 34 + 16)
  return (
    <div className="space-y-2">
      <ChartContainer
        config={config}
        className="aspect-auto w-full"
        style={{ height }}
        role="figure"
        aria-label={label}
      >
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }} barCategoryGap={6}>
          <XAxis type="number" dataKey="count" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={96}
            tickMargin={4}
            className="text-xs"
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.45 }}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, _name, item) => {
                  const row = item.payload as CategoryCount
                  return (
                    <div className="grid min-w-36 gap-1.5">
                      <span className="font-medium text-foreground">{row.label}</span>
                      <TooltipRow color={color} label="Played" value={plural(Number(value), unit)} />
                      {row.avgRating !== null && (
                        <span className="flex items-center justify-between gap-3 text-muted-foreground">
                          Your avg <RatingStars rating={row.avgRating} size="xs" showValue />
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">Click to browse</span>
                    </div>
                  )
                }}
              />
            }
          />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={4}
            maxBarSize={24}
            className="cursor-pointer"
            activeBar={{ fillOpacity: 0.8 }}
            onClick={(_, index) => {
              const href = rows[index]?.href
              if (href) router.push(href)
            }}
          >
            <LabelList
              dataKey="count"
              position="right"
              offset={8}
              className="fill-muted-foreground text-[11px] tabular-nums"
              formatter={(v: unknown) => formatNumber(Number(v))}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      {/* Bars are mouse/touch targets only; keyboard and screen-reader users get the same
          destinations as real links (visually hidden until one of them receives focus). */}
      <ul aria-label={browseLabel} className="sr-only flex-wrap gap-1.5 focus-within:not-sr-only focus-within:flex">
        {rows.map((row) => (
          <li key={row.slug}>
            <Link
              href={row.href}
              className="inline-flex min-h-9 items-center rounded-md bg-muted/50 px-2.5 text-xs transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {row.label} · {plural(row.count, unit)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Donut with a linked legend (art styles) ───────────────────────────── */

type Slice = { key: string; label: string; count: number; href: string | null; color: string }

const toSlices = (data: readonly CategoryCount[], max = CATEGORICAL.length): Slice[] => {
  const top = data
    .slice(0, max)
    .map((d, i) => ({ key: d.slug, label: d.label, count: d.count, href: d.href, color: CATEGORICAL[i] }))
  const rest = data.slice(max).reduce((sum, d) => sum + d.count, 0)
  return rest > 0 ? [...top, { key: "other", label: "Other", count: rest, href: null, color: OTHER_COLOR }] : top
}

export function DonutChart({
  data,
  centerLabel,
  label,
}: {
  data: readonly CategoryCount[]
  centerLabel: string
  label: string
}) {
  const slices = toSlices(data)
  const total = slices.reduce((s, d) => s + d.count, 0)
  const config: ChartConfig = Object.fromEntries(slices.map((s) => [s.key, { label: s.label, color: s.color }]))
  return (
    <div className="grid items-center gap-4 @sm:grid-cols-[minmax(0,180px)_1fr]">
      <div className="relative mx-auto w-full max-w-[180px]">
        <ChartContainer config={config} className="aspect-square w-full" role="figure" aria-label={label}>
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _name, item) => {
                    const slice = item.payload as Slice
                    return (
                      <TooltipRow
                        color={slice.color}
                        label={slice.label}
                        value={`${formatNumber(Number(value))} · ${Math.round((Number(value) / Math.max(1, total)) * 100)}%`}
                      />
                    )
                  }}
                />
              }
            />
            <Pie
              data={slices}
              dataKey="count"
              nameKey="key"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              cornerRadius={4}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} className="transition-opacity duration-200 hover:opacity-80" />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
          <span className="text-2xl font-bold tabular-nums">{formatNumber(total)}</span>
          <span className="text-[10px] text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <ul className="grid gap-1 text-sm">
        {slices.map((s) => {
          const pct = Math.round((s.count / Math.max(1, total)) * 100)
          const inner = (
            <>
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatNumber(s.count)} · {pct}%
              </span>
            </>
          )
          return (
            <li key={s.key}>
              {s.href ? (
                <Link
                  href={s.href}
                  className="flex min-h-9 items-center gap-2 rounded-md px-2 py-1 transition-all duration-200 hover:translate-x-0.5 hover:bg-muted/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none sm:min-h-0"
                >
                  {inner}
                </Link>
              ) : (
                <span className="flex min-h-9 items-center gap-2 px-2 py-1 text-muted-foreground sm:min-h-0">{inner}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ── 100% stacked bar (AAA vs AA vs indie) ─────────────────────────────── */

export function StackedShareBar({ data, label }: { data: readonly CategoryCount[]; label: string }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const present = data.filter((d) => d.count > 0)
  const row: Record<string, number | string> = { name: label }
  for (const d of data) row[d.slug] = d.count
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.slug, { label: d.label, color: CATEGORICAL[i] }]),
  )
  return (
    <div className="space-y-4">
      <ChartContainer config={config} className="aspect-auto h-14 w-full" role="figure" aria-label={label}>
        <BarChart data={[row]} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }} stackOffset="expand">
          <XAxis type="number" hide domain={[0, 1]} />
          <YAxis type="category" dataKey="name" hide />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(_value, name) => {
                  // read counts from our data, not the (expand-normalised) chart value
                  const index = data.findIndex((d) => d.slug === name)
                  const d = data[index]
                  if (!d) return null
                  return (
                    <TooltipRow
                      color={CATEGORICAL[index]}
                      label={d.label}
                      value={`${plural(d.count, "game")} · ${Math.round((d.count / Math.max(1, total)) * 100)}%`}
                    />
                  )
                }}
              />
            }
          />
          {data.map((d) => {
            const isFirst = present[0]?.slug === d.slug
            const isLast = present.at(-1)?.slug === d.slug
            return (
              <Bar
                key={d.slug}
                dataKey={d.slug}
                stackId="tier"
                fill={`var(--color-${d.slug})`}
                stroke="var(--card)"
                strokeWidth={2}
                radius={[isFirst ? 6 : 0, isLast ? 6 : 0, isLast ? 6 : 0, isFirst ? 6 : 0]}
                className="transition-opacity duration-200 hover:opacity-80"
                name={d.slug}
              />
            )
          })}
        </BarChart>
      </ChartContainer>
      <ul className="grid grid-cols-3 gap-2">
        {data.map((d, i) => (
          <li key={d.slug}>
            <Link
              href={d.href}
              className="group/tier flex h-full min-w-0 flex-col gap-0.5 rounded-lg bg-muted/40 p-2.5 ring-1 ring-white/5 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/70 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors group-hover/tier:text-foreground">
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: CATEGORICAL[i] }} aria-hidden />
                <span className="truncate">{d.label}</span>
              </span>
              <span className="text-lg font-bold tabular-nums transition-colors group-hover/tier:text-primary">
                {total > 0 ? `${Math.round((d.count / total) * 100)}%` : "—"}
              </span>
              <span className="text-[11px] text-muted-foreground">{plural(d.count, "game")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Vertical columns (release decades) ────────────────────────────────── */

export function ColumnChart({
  data,
  color = "var(--chart-2)",
  label,
}: {
  data: readonly DecadeCount[]
  color?: string
  label: string
}) {
  const config = { count: { label: "Games", color } } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="aspect-auto h-[200px] w-full" role="figure" aria-label={label}>
      <BarChart data={[...data]} margin={{ top: 18, right: 4, left: 4, bottom: 0 }} barCategoryGap="18%">
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => (
                <div className="grid gap-1">
                  <span className="font-medium text-foreground">
                    Released in the {(item.payload as DecadeCount).label}
                  </span>
                  <TooltipRow color={color} label="Played" value={plural(Number(value), "game")} />
                </div>
              )}
            />
          }
        />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[4, 4, 0, 0]}
          maxBarSize={56}
          activeBar={{ fillOpacity: 0.8 }}
        >
          <LabelList
            dataKey="count"
            position="top"
            offset={6}
            className="fill-muted-foreground text-[10px] tabular-nums"
            formatter={(v: unknown) => (Number(v) > 0 ? formatNumber(Number(v)) : "")}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/* ── Monthly activity (stacked areas, last 12 months) ──────────────────── */

const activityConfig = {
  logged: { label: "Played & rated", color: "var(--played)" },
  reviewed: { label: "Reviews", color: "var(--chart-2)" },
  wishlisted: { label: "Wishlist", color: "var(--wishlist)" },
  social: { label: "Social", color: "var(--chart-3)" },
} satisfies ChartConfig

const ACTIVITY_KEYS = ["logged", "reviewed", "wishlisted", "social"] as const

export function ActivityAreaChart({ data }: { data: readonly ActivityBucket[] }) {
  const gid = `act${safeId(useId())}`
  return (
    <ChartContainer
      config={activityConfig}
      className="aspect-auto h-[240px] w-full"
      role="figure"
      aria-label="Monthly activity chart"
    >
      <AreaChart data={[...data]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {ACTIVITY_KEYS.map((key) => (
            <linearGradient key={key} id={`${gid}-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.45} />
              <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={20}
          tickFormatter={(v: string) => shortMonthLabel(v)}
        />
        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <ChartTooltip
          cursor={{ strokeDasharray: "4 4" }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, payload) => {
                const month = (payload?.[0]?.payload as ActivityBucket | undefined)?.month
                return month ? longMonthLabel(month) : ""
              }}
            />
          }
        />
        {ACTIVITY_KEYS.map((key) => (
          <Area
            key={key}
            dataKey={key}
            type="monotone"
            stackId="activity"
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            fill={`url(#${gid}-${key})`}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
        ))}
        <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-1" />} />
      </AreaChart>
    </ChartContainer>
  )
}

/* ── Single-series monthly counts (game page community card) ───────────── */

export function MonthlyCountChart({
  data,
  seriesLabel,
  color = "var(--chart-1)",
  className,
}: {
  data: readonly { month: string; count: number }[]
  seriesLabel: string
  color?: string
  className?: string
}) {
  const gid = `mc${safeId(useId())}`
  const config = { count: { label: seriesLabel, color } } satisfies ChartConfig
  return (
    <ChartContainer
      config={config}
      className={cn("aspect-auto h-[180px] w-full", className)}
      role="figure"
      aria-label={`${seriesLabel} per month`}
    >
      <AreaChart data={[...data]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={20}
          tickFormatter={(v: string) => shortMonthLabel(v)}
        />
        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <ChartTooltip
          cursor={{ strokeDasharray: "4 4" }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, payload) => {
                const month = (payload?.[0]?.payload as { month?: string } | undefined)?.month
                return month ? longMonthLabel(month) : ""
              }}
            />
          }
        />
        <Area
          dataKey="count"
          type="monotone"
          stroke="var(--color-count)"
          strokeWidth={2}
          fill={`url(#${gid})`}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
