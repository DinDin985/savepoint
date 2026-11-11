import { requireUser } from "@/lib/auth/current-user"
import { SettingsNav } from "./settings-nav"

export default async function SettingsLayout({ children }: LayoutProps<"/settings">) {
  await requireUser("/settings")
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Settings</h1>
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
