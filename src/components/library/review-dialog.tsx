"use client"

import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react"
import { ThumbsDownIcon, ThumbsUpIcon, Trash2Icon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { ActionResult } from "@/lib/effect/runtime"
import { formatNumber, timeAgo } from "@/lib/format"
import {
  HOURS_PLAYED_MAX,
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  type LibraryState,
  type OwnReview,
  type ReviewDraft,
} from "@/lib/library/types"
import { cn } from "@/lib/utils"

type Submit = () => Promise<ActionResult<LibraryState>>

/** Fields that can show an inline error. */
const FORM_FIELDS = new Set(["recommended", "body", "hoursPlayed", "containsSpoilers"])

/**
 * Steam-style review editor: thumbs up / down (required), body with live
 * counter, optional hours played and a spoiler switch. Edits the existing
 * review when there is one; deleting asks for confirmation first.
 */
export function ReviewDialog({
  open,
  onOpenChange,
  gameTitle,
  review,
  ratingSlot,
  onSave,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameTitle: string
  review: OwnReview | null
  /** rating control rendered at the top of the editor */
  ratingSlot?: ReactNode
  onSave: (draft: ReviewDraft) => Promise<ActionResult<LibraryState>>
  onDelete: Submit
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-5 overflow-y-auto sm:max-w-xl">
        {/* Radix unmounts the content while closed, so the form re-initialises from `review` on every open */}
        <ReviewForm
          gameTitle={gameTitle}
          review={review}
          ratingSlot={ratingSlot}
          onSave={onSave}
          onDelete={onDelete}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function ReviewForm({
  gameTitle,
  review: reviewProp,
  ratingSlot,
  onSave,
  onDelete,
  onDone,
}: {
  gameTitle: string
  review: OwnReview | null
  ratingSlot?: ReactNode
  onSave: (draft: ReviewDraft) => Promise<ActionResult<LibraryState>>
  onDelete: Submit
  onDone: () => void
}) {
  const id = useId()
  // snapshot: the prop updates while the dialog fades out after a save — keep the copy stable
  const [review] = useState(reviewProp)
  const [recommended, setRecommended] = useState<boolean | null>(review?.recommended ?? null)
  const [body, setBody] = useState(review?.body ?? "")
  const [hours, setHours] = useState(review?.hoursPlayed != null ? String(review.hoursPlayed) : "")
  const [spoilers, setSpoilers] = useState(review?.containsSpoilers ?? false)
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const [deleting, startDeleting] = useTransition()

  const length = body.trim().length
  const remainingToMin = Math.max(0, REVIEW_BODY_MIN - length)
  const overMax = length > REVIEW_BODY_MAX

  const clearError = (key: string) => {
    if (!errors[key]) return
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)
    const trimmedHours = hours.trim()
    const hoursPlayed = trimmedHours === "" ? null : Number(trimmedHours)
    startSaving(async () => {
      const result = await onSave({ body, recommended, hoursPlayed, containsSpoilers: spoilers })
      if (result.ok) {
        onDone()
        return
      }
      const fieldErrors = result.fieldErrors ?? {}
      setErrors(fieldErrors)
      // errors we can't pin to a field (sign-in, unknown game, DB hiccup…) go in the banner
      if (!Object.keys(fieldErrors).some((key) => FORM_FIELDS.has(key))) setFormError(result.error)
    })
  }

  const confirmDelete = () => {
    startDeleting(async () => {
      const result = await onDelete()
      if (result.ok) onDone()
    })
  }

  const busy = saving || deleting

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="pr-8 text-lg font-bold tracking-tight text-balance break-words">
          {review ? "Edit your review" : "Review"} <span className="text-primary">{gameTitle}</span>
        </DialogTitle>
        <DialogDescription>
          {review
            ? `Last edited ${timeAgo(review.updatedAt)}.`
            : "Would you recommend it to other players? Tell them why."}
        </DialogDescription>
      </DialogHeader>

      {ratingSlot && (
        <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 py-3">
          <span className="font-pixel text-[10px] tracking-widest text-muted-foreground">YOUR RATING</span>
          {ratingSlot}
        </div>
      )}

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <Field data-invalid={!!errors.recommended}>
        <FieldLabel id={`${id}-rec`}>Do you recommend this game?</FieldLabel>
        <div
          role="radiogroup"
          aria-labelledby={`${id}-rec`}
          aria-required
          aria-invalid={!!errors.recommended || undefined}
          className="grid grid-cols-2 gap-2"
          onKeyDown={(e) => {
            // ARIA radio group: arrows move the selection (and focus) between the two options
            const next =
              e.key === "ArrowLeft" || e.key === "ArrowUp"
                ? true
                : e.key === "ArrowRight" || e.key === "ArrowDown"
                  ? false
                  : null
            if (next === null) return
            e.preventDefault()
            setRecommended(next)
            clearError("recommended")
            e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next ? 0 : 1]?.focus()
          }}
        >
          <RecommendButton
            selected={recommended === true}
            focusable={recommended !== false}
            tone="positive"
            onClick={() => {
              setRecommended(true)
              clearError("recommended")
            }}
          >
            <ThumbsUpIcon className="size-5" /> Recommended
          </RecommendButton>
          <RecommendButton
            selected={recommended === false}
            focusable={recommended === false}
            tone="negative"
            onClick={() => {
              setRecommended(false)
              clearError("recommended")
            }}
          >
            <ThumbsDownIcon className="size-5" /> Not recommended
          </RecommendButton>
        </div>
        {errors.recommended && <FieldError>{errors.recommended}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.body || overMax}>
        <FieldLabel htmlFor={`${id}-body`}>Your review</FieldLabel>
        <Textarea
          id={`${id}-body`}
          value={body}
          onChange={(e) => {
            setBody(e.target.value)
            clearError("body")
          }}
          rows={7}
          maxLength={REVIEW_BODY_MAX + 500}
          aria-invalid={!!errors.body || overMax}
          aria-describedby={`${id}-count`}
          placeholder="What hooked you? What didn't land? Would you play it again?"
          className="max-h-[40dvh] min-h-36 resize-y text-sm leading-relaxed"
        />
        <div className="flex items-start justify-between gap-3 text-xs">
          {errors.body ? (
            <FieldError className="text-xs">{errors.body}</FieldError>
          ) : (
            <FieldDescription className="text-xs">
              {remainingToMin > 0 ? `${remainingToMin} more character${remainingToMin === 1 ? "" : "s"} to go` : "Looking good."}
            </FieldDescription>
          )}
          <span
            id={`${id}-count`}
            aria-live="polite"
            className={cn(
              "shrink-0 tabular-nums transition-colors",
              overMax ? "font-semibold text-destructive" : length >= REVIEW_BODY_MIN ? "text-primary" : "text-muted-foreground",
            )}
          >
            {formatNumber(length)} / {formatNumber(REVIEW_BODY_MAX)}
          </span>
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.hoursPlayed}>
          <FieldLabel htmlFor={`${id}-hours`}>
            Hours played <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id={`${id}-hours`}
              type="number"
              inputMode="decimal"
              min={0}
              max={HOURS_PLAYED_MAX}
              step={0.5}
              value={hours}
              onChange={(e) => {
                setHours(e.target.value)
                clearError("hoursPlayed")
              }}
              aria-invalid={!!errors.hoursPlayed}
              placeholder="e.g. 42"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>hrs</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          {errors.hoursPlayed && <FieldError className="text-xs">{errors.hoursPlayed}</FieldError>}
        </Field>
        <Field orientation="horizontal" className="items-center justify-between self-end rounded-lg border px-3 py-2">
          <FieldLabel htmlFor={`${id}-spoilers`} className="flex-col items-start gap-0.5">
            Contains spoilers
            <span className="text-xs font-normal text-muted-foreground">Hidden until readers click</span>
          </FieldLabel>
          <Switch id={`${id}-spoilers`} checked={spoilers} onCheckedChange={setSpoilers} />
        </Field>
      </div>

      <DialogFooter className="sm:justify-between">
        {review ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" disabled={busy} className="sm:mr-auto">
                {deleting ? <Spinner /> : <Trash2Icon />} Delete review
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-destructive/15 text-destructive">
                  <Trash2Icon />
                </AlertDialogMedia>
                <AlertDialogTitle>Delete your review?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your review of {gameTitle} and its votes will be removed for good. Your rating and played status stay.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={confirmDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {saving && <Spinner />} {review ? "Save changes" : "Publish review"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

function RecommendButton({
  selected,
  focusable,
  tone,
  onClick,
  children,
}: {
  selected: boolean
  /** roving tab stop: only the selected option (or the first one when none is) is tabbable */
  focusable: boolean
  tone: "positive" | "negative"
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={focusable ? 0 : -1}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold outline-none",
        "transition-all duration-200 ease-out hover:scale-[1.03] active:scale-95 focus-visible:ring-2 focus-visible:ring-ring",
        "[&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:-rotate-12",
        tone === "positive"
          ? selected
            ? "border-steam-blue/70 bg-steam-blue/15 text-steam-blue shadow-[0_0_24px_-10px_var(--steam-blue)]"
            : "text-muted-foreground hover:border-steam-blue/50 hover:bg-steam-blue/10 hover:text-steam-blue"
          : selected
            ? "border-steam-negative bg-steam-negative/25 text-foreground shadow-[0_0_24px_-10px_var(--steam-negative)] [&_svg]:text-steam-negative"
            : "text-muted-foreground hover:border-steam-negative/70 hover:bg-steam-negative/15 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
