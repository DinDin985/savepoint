import type { Metadata } from "next"
import Form from "next/form"
import Link from "next/link"
import { Effect } from "effect"
import { ArrowRightIcon, SearchIcon, SearchXIcon, UsersIcon, XIcon } from "lucide-react"
import { SectionHeading } from "@/components/profile/section-heading"
import { SignInCta } from "@/components/profile/sign-in-cta"
import { MemberCard } from "@/components/social/member-card"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { getCurrentUser } from "@/lib/auth/current-user"
import { runEffect } from "@/lib/effect/runtime"
import type { MemberSummary } from "@/lib/social/types"
import { popularMembers, recentMembers, searchMembers } from "@/lib/social/members"

export const metadata: Metadata = {
  title: "Members",
  description: "Find players with great taste, see their Top 10 and follow them.",
}

const firstString = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [sp, viewer] = await Promise.all([searchParams, getCurrentUser()])
  const q = firstString(sp.q).trim().slice(0, 50)
  const viewerId = viewer?.id ?? null
  const signedIn = viewer !== null

  const data = q
    ? { results: await runEffect(searchMembers(q, viewerId)), popular: [], recent: [] }
    : {
        results: [] as MemberSummary[],
        ...(await runEffect(
          Effect.all(
            { popular: popularMembers(viewerId, 8), recent: recentMembers(viewerId, 8) },
            { concurrency: "unbounded" },
          ),
        )),
      }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-pixel text-[10px] tracking-widest text-primary uppercase">Player select</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <UsersIcon className="size-7 text-primary" />
            Members
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find players with great taste — peek at their Top 10 and follow them for their reviews.
          </p>
        </div>
        <Form action="/members" role="search" className="w-full md:max-w-sm">
          <InputGroup className="h-10 bg-card/60 transition-colors hover:border-primary/50">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              name="q"
              type="text"
              enterKeyHint="search"
              defaultValue={q}
              placeholder="Search by name or @username"
              aria-label="Search members"
              maxLength={50}
              autoComplete="off"
            />
            <InputGroupAddon align="inline-end" className="gap-1">
              {q && (
                <Link
                  href="/members"
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-all duration-200 hover:scale-110 hover:bg-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <XIcon className="size-4" />
                </Link>
              )}
              <InputGroupButton type="submit" size="icon-sm" variant="ghost" aria-label="Search" className="hover:text-primary">
                <ArrowRightIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Form>
      </header>

      {!signedIn && <SignInCta next={q ? `/members?q=${encodeURIComponent(q)}` : "/members"} className="mb-8" />}

      {q ? (
        <section aria-labelledby="results-heading">
          <SectionHeading
            id="results-heading"
            kicker="Search"
            title={
              <>
                {data.results.length} {data.results.length === 1 ? "player" : "players"} matching &ldquo;{q}&rdquo;
              </>
            }
          />
          {data.results.length ? (
            <MemberGrid members={data.results} signedIn={signedIn} />
          ) : (
            <Empty className="border border-dashed border-border bg-card/30 py-14">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchXIcon />
                </EmptyMedia>
                <EmptyTitle>No players found</EmptyTitle>
                <EmptyDescription>
                  Nobody matches &ldquo;{q}&rdquo;. Check the spelling or try part of their name.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href="/members">Show all members</Link>
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </section>
      ) : (
        <div className="space-y-12">
          <section aria-labelledby="popular-heading">
            <SectionHeading id="popular-heading" kicker="Most followed" title="Popular members" />
            {data.popular.length ? (
              <MemberGrid members={data.popular} signedIn={signedIn} />
            ) : (
              <Empty className="border border-dashed border-border bg-card/30 py-14">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UsersIcon />
                  </EmptyMedia>
                  <EmptyTitle>No members yet</EmptyTitle>
                  <EmptyDescription>Be the very first player on Savepoint.</EmptyDescription>
                </EmptyHeader>
                {!signedIn && (
                  <EmptyContent>
                    <Button asChild>
                      <Link href="/sign-up?next=/members">Create an account</Link>
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            )}
          </section>
          {data.recent.length > 0 && (
            <section aria-labelledby="recent-heading">
              <SectionHeading id="recent-heading" kicker="Fresh spawns" title="Recently joined" />
              <MemberGrid members={data.recent} signedIn={signedIn} />
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function MemberGrid({ members, signedIn }: { members: readonly MemberSummary[]; signedIn: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {members.map((m) => (
        <MemberCard key={m.id} member={m} signedIn={signedIn} />
      ))}
    </div>
  )
}
