import { config } from '../src/config/index.js'
import { db } from '../src/db/index.js'
import { ensureSuperAdmin } from '../src/modules/users/users.service.js'

if (!config.SUPER_ADMIN_EMAIL || !config.SUPER_ADMIN_PASSWORD) {
  console.error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables are required')
  process.exit(1)
}

await ensureSuperAdmin(config.SUPER_ADMIN_EMAIL, config.SUPER_ADMIN_PASSWORD)
console.warn(`Super admin ensured for ${config.SUPER_ADMIN_EMAIL}`)

await db.$client.end()
