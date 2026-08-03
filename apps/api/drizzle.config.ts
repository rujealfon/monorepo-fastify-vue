import { defineConfig } from 'drizzle-kit'

import 'dotenv/config'

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    // Migrations take a session-scoped advisory lock, which transaction-mode
    // PgBouncer poolers (e.g. Neon's pooled endpoint) don't support — use the
    // direct connection string here even though runtime queries use the pooled one.
    // eslint-disable-next-line node/no-process-env
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!
  }
})
