import { defineConfig } from "drizzle-kit"

// Only used to *generate* SQL migrations (`npm run db:generate`).
// Migrations are applied automatically at runtime by src/lib/db/bootstrap.ts.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
})
