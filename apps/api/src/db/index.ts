import { drizzle } from 'drizzle-orm/node-postgres'

import { config } from '#api/config/index.js'
import * as schema from './schema/index.js'

export const db = drizzle(config.DATABASE_URL, { schema })
