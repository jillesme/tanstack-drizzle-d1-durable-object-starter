import { defineConfig } from "drizzle-kit";

// NOTE: We do not specify credentials, that's for drizzle-kit push
// instead, we use drizzle-kit generate and wrangler migrations apply

export default defineConfig({
  dialect: "sqlite",
  driver: "d1-http",
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
});
