import { z } from 'zod'

import { db } from '#api/db/index.js'
import { promoteByEmail } from '#api/modules/users'

const email = z.string().trim().toLowerCase().email().safeParse(process.argv[2])

try {
  if (!email.success)
    throw new Error('Usage: pnpm admin:promote <existing-account-email>')

  await promoteByEmail(email.data)
  process.stdout.write(`Granted the admin role to ${email.data}\n`)
}
finally {
  await db.$client.end()
}
