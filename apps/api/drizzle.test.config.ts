import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.test', override: true })

// eslint-disable-next-line node/no-process-env
const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL

if (!databaseUrl || new URL(databaseUrl).pathname !== '/fastify_vue_test')
  throw new Error('Test migrations must use the fastify_vue_test database')

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl
  }
})
