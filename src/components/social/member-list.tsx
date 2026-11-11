import Link from "next/link"
import { UsersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { MemberSummary } from "@/lib/social/types"
import { MemberRow } from "./member-row"

/** Followers / following list with an empty state. */
export function MemberList({
  members,
  signedIn,
  emptyTitle,
  emptyDescription,
  emptyCta,
}: {
  members: readonly MemberSummary[]
  signedIn: boolean
  emptyTitle: string
  emptyDescription: string
  emptyCta?: { href: string; label: string }
}) {
  if (members.length === 0) {
    return (
      <Empty className="border border-dashed border-border bg-card/30 py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
        {emptyCta && (
          <EmptyContent>
            <Button asChild>
              <Link href={emptyCta.href}>{emptyCta.label}</Link>
            </Button>
          </EmptyContent>
        )}
      </Empty>
    )
  }
  return (
    <ul className="grid gap-2 xl:grid-cols-2">
      {members.map((m) => (
        <MemberRow key={m.id} member={m} signedIn={signedIn} />
      ))}
    </ul>
  )
}
