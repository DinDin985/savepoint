import type { Metadata } from "next"
import Link from "next/link"
import { BrushIcon, Building2Icon, Gamepad2Icon, MonitorSmartphoneIcon } from "lucide-react"
import type { ComponentType } from "react"
import { CategoryTile } from "@/components/discover/category-tile"
import { LoadError, SignInCta } from "@/components/discover/states"
import { getCurrentUser } from "@/lib/auth/current-user"
import { loadSafely } from "@/lib/catalog/load"
import { categoryShowcases, type CategoryShowcase } from "@/lib/catalog/queries"
import type { CategoryKind } from "@/lib/db/schema"
import { CATEGORY_KINDS } from "@/lib/taxonomy"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Categories",
  description: "Explore games by genre, studio size (Triple-A vs indie), art style and platform — including Nintendo Switch.",
}

const SECTION_COPY: Record<CategoryKind, { description: string; icon: ComponentType<{ className?: string }>; tone: string }> = {
  genre: { description: "From soulslikes and roguelikes to cosy sims and party games.", icon: Gamepad2Icon, tone: "text-primary" },
  tier: { description: "Blockbusters, mid-budget gems and indie darlings.", icon: Building2Icon, tone: "text-star" },
  "art-style": { description: "Find games by how they look.", icon: BrushIcon, tone: "text-wishlist" },
  platform: {
    description: "Where you play — PC, PlayStation, Xbox and Nintendo Switch & Switch 2.",
    icon: MonitorSmartphoneIcon,
    tone: "text-liked",
  },
}

const GRID: Record<CategoryKind, string> = {
  genre: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  tier: "grid-cols-2 sm:grid-cols-3",
  "art-style": "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  platform: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
}

export default async function CategoriesPage() {
  const [user, result] = await Promise.all([getCurrentUser(), loadSafely("categories.showcases", categoryShowcases())])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="font-pixel text-[10px] tracking-[0.2em] text-primary uppercase">Discover</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Categories</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Every game in the catalog, sorted four ways: what kind of game it is, who made it, how it looks and where you
          can play it.
        </p>
      </header>

      <nav aria-label="Jump to section" className="scrollbar-none -mx-4 mb-7 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
        {CATEGORY_KINDS.map((group) => {
          const copy = SECTION_COPY[group.kind]
          return (
            <Link
              key={group.kind}
              href={`#${group.kind}`}
              className="group/jump inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-card/60 px-3.5 text-sm font-medium transition-all duration-200 hover:scale-105 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            >
              <copy.icon className={cn("size-4 transition-transform duration-200 group-hover/jump:scale-110", copy.tone)} />
              {group.plural}
            </Link>
          )
        })}
      </nav>

      {!user && <SignInCta next="/categories" className="mb-10" />}

      {!result.ok ? (
        <LoadError title="Couldn't load categories" retryHref="/categories" />
      ) : (
        <div className="space-y-14">
          {CATEGORY_KINDS.map((group) => (
            <CategorySection
              key={group.kind}
              kind={group.kind}
              title={group.plural}
              showcases={result.data.filter((s) => s.kind === group.kind && s.count > 0)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CategorySection({ kind, title, showcases }: { kind: CategoryKind; title: string; showcases: CategoryShowcase[] }) {
  if (showcases.length === 0) return null
  const copy = SECTION_COPY[kind]
  // Nintendo gets the spotlight: first and double-width in the platforms grid.
  const ordered =
    kind === "platform"
      ? [...showcases].sort((a, b) => Number(b.slug === "nintendo") - Number(a.slug === "nintendo"))
      : showcases
  return (
    <section id={kind} aria-labelledby={`${kind}-title`} className="scroll-mt-24">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id={`${kind}-title`} className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <copy.icon className={cn("size-5", copy.tone)} />
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <span className="hidden shrink-0 font-pixel text-[10px] tracking-[0.2em] text-muted-foreground uppercase sm:block">
          {showcases.length} {showcases.length === 1 ? "category" : "categories"}
        </span>
      </div>
      <div className={cn("grid gap-3 sm:gap-4", GRID[kind])}>
        {ordered.map((showcase) => {
          const nintendo = kind === "platform" && showcase.slug === "nintendo"
          return (
            <CategoryTile
              key={showcase.slug}
              showcase={showcase}
              highlight={nintendo}
              className={cn(nintendo && "col-span-2")}
            />
          )
        })}
      </div>
    </section>
  )
}
