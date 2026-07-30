import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.test', override: true })

// eslint-disable-next-line node/no-process-env
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl || new URL(databaseUrl).pathname !== '/stock_sakto_test')
  throw new Error('Test migrations must use the stock_sakto_test database from .env.test')

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl
  }
})
