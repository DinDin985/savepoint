"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { signInAction, signUpAction, type AuthFormState } from "@/actions/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

const initial: AuthFormState = {}

export function SignUpForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signUpAction, initial)
  const fe = state.fieldErrors ?? {}
  return (
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && !Object.keys(fe).length && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <Field data-invalid={!!fe.username}>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={20}
            defaultValue={state.values?.username}
            aria-invalid={!!fe.username}
            placeholder="pixel_pilgrim"
          />
          {fe.username ? <FieldError>{fe.username}</FieldError> : <FieldDescription>Letters, numbers and underscores.</FieldDescription>}
        </Field>
        <Field data-invalid={!!fe.displayName}>
          <FieldLabel htmlFor="displayName">Display name <span className="text-muted-foreground">(optional)</span></FieldLabel>
          <Input id="displayName" name="displayName" maxLength={40} defaultValue={state.values?.displayName} placeholder="Pixel Pilgrim" />
          {fe.displayName && <FieldError>{fe.displayName}</FieldError>}
        </Field>
        <Field data-invalid={!!fe.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
            aria-invalid={!!fe.email}
            placeholder="you@example.com"
          />
          {fe.email && <FieldError>{fe.email}</FieldError>}
        </Field>
        <PasswordField error={fe.password} autoComplete="new-password" description="At least 8 characters, with a letter and a number." />
      </FieldGroup>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending && <Spinner />} Create account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, initial)
  const fe = state.fieldErrors ?? {}
  return (
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <Field data-invalid={!!fe.identifier}>
          <FieldLabel htmlFor="identifier">Email or username</FieldLabel>
          <Input
            id="identifier"
            name="identifier"
            autoComplete="username"
            required
            defaultValue={state.values?.identifier}
            aria-invalid={!!fe.identifier}
          />
          {fe.identifier && <FieldError>{fe.identifier}</FieldError>}
        </Field>
        <PasswordField autoComplete="current-password" />
      </FieldGroup>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending && <Spinner />} Sign in
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New to Savepoint?{" "}
        <Link href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"} className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  )
}

function PasswordField({ error, autoComplete, description }: { error?: string; autoComplete: string; description?: string }) {
  const [show, setShow] = useState(false)
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="password">Password</FieldLabel>
      <div className="relative">
        <Input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          aria-invalid={!!error}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </button>
      </div>
      {error ? <FieldError>{error}</FieldError> : description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )
}
