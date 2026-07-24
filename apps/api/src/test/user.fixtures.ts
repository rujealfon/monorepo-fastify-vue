import { db } from '#api/db/index.js'
import { assignRoleBySlug, DEFAULT_ROLE_SLUG } from '#api/modules/roles'
import { users } from '#api/modules/users/users.schema.js'

export function createTestUsers(emails: string[]) {
  return db.transaction(async (tx) => {
    const created = await tx.insert(users)
      .values(emails.map(email => ({ email, passwordHash: 'hash' })))
      .returning()
    for (const user of created)
      await assignRoleBySlug(tx, user.id, DEFAULT_ROLE_SLUG)
    return created
  })
}
