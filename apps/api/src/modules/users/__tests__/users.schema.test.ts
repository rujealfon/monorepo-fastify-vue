import { describe, expect, it } from 'vitest'

import { patchProfileSchema, registerUserSchema } from '#api/modules/users'

describe('user schemas', () => {
  it.each([
    { email: 'invalid', password: 'correct horse battery staple' },
    { email: 'person@example.com', password: '12345678901' },
    { email: 'person@example.com', password: 'x'.repeat(129) }
  ])('rejects invalid registration input', (input) => {
    expect(registerUserSchema.safeParse(input).success).toBe(false)
  })

  it.each([
    { firstName: 'x'.repeat(101) },
    { lastName: 'x'.repeat(101) },
    { gender: 'unknown' },
    { birthDate: '20-05-1990' },
    { bio: 'x'.repeat(501) }
  ])('rejects invalid profile input', (input) => {
    expect(patchProfileSchema.safeParse(input).success).toBe(false)
  })

  it('allows profile fields to be cleared', () => {
    expect(patchProfileSchema.safeParse({
      firstName: null,
      lastName: null,
      gender: null,
      birthDate: null,
      bio: null
    }).success).toBe(true)
  })

  it('rejects an empty profile patch', () => {
    expect(patchProfileSchema.safeParse({}).success).toBe(false)
  })
})
