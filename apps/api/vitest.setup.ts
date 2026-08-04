import { config } from 'dotenv'

config({ path: '.env.test', override: true })

const { config: appConfig } = await import('./src/config/index.js')
if (!new URL(appConfig.DATABASE_URL).pathname.endsWith('_test'))
  throw new Error('Tests must use a database whose name ends in _test from .env.test')
