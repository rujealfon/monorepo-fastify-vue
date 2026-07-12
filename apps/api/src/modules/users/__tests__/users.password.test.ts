import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from '#api/modules/users/users.password.js'

describe('user passwords', () => {
  it('hashes with Argon2id and verifies only the original password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/)
    await expect(verifyPassword(hash, 'correct horse battery staple')).resolves.toBe(true)
    await expect(verifyPassword(hash, 'wrong password')).resolves.toBe(false)
  })
})
