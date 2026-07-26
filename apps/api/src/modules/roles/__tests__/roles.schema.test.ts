import { describe, expect, it } from 'vitest'

import { replaceUserRolesSchema } from '#api/modules/roles/roles.schema.js'

describe('roles schemas', () => {
  it('requires at least one role when replacing user roles', () => {
    const empty = replaceUserRolesSchema.safeParse({ roleIds: [] })

    expect(empty.success).toBe(false)
    if (empty.success)
      throw new Error('Expected an empty role list to fail validation')

    expect(empty.error.issues).toContainEqual(
      expect.objectContaining({ message: 'At least one role is required', path: ['roleIds'] })
    )
    expect(replaceUserRolesSchema.safeParse({ roleIds: [1] }).success).toBe(true)
  })
})
