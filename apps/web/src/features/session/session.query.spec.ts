import { beforeEach, describe, expect, it, vi } from 'vitest'

import { currentUserQuery } from './session.query'

const sessionClient = vi.hoisted(() => ({ currentUser: vi.fn() }))
vi.mock('@/shared/api/client', () => ({ sessionClient }))

describe('current User query', () => {
  beforeEach(() => vi.clearAllMocks())

  it('delegates Session semantics to the shared client', async () => {
    const user = { id: '1', email: 'person@example.com' }
    sessionClient.currentUser.mockResolvedValue(user)

    await expect(currentUserQuery.query({} as never)).resolves.toEqual(user)
    expect(sessionClient.currentUser).toHaveBeenCalledOnce()
  })
})
