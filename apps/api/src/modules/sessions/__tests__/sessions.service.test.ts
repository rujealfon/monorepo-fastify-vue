import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as repository from '#api/modules/sessions/sessions.repository.js'
import * as sessions from '#api/modules/sessions/sessions.service.js'
import { UnauthorizedError } from '#api/modules/users'

vi.mock('#api/modules/sessions/sessions.repository.js')

describe('sessions.service', () => {
  beforeEach(() => vi.resetAllMocks())

  it('issues an expiring Session for a User', async () => {
    const now = new Date('2026-08-12T00:00:00Z')
    const active = { id: 'session-1', userId: 'user-1', expiresAt: new Date('2026-08-19T00:00:00Z') }
    vi.mocked(repository.insert).mockResolvedValue(active)

    await expect(sessions.issue('user-1', now)).resolves.toBe(active)
    expect(repository.insert).toHaveBeenCalledWith('user-1', active.expiresAt, now)
  })

  it('authenticates only an active Session', async () => {
    const identity = { id: 'session-1', userId: 'user-1' }
    const now = new Date('2026-08-12T00:00:00Z')
    vi.mocked(repository.findActive).mockResolvedValueOnce({ id: identity.id }).mockResolvedValueOnce(undefined)

    await expect(sessions.authenticate(identity, now)).resolves.toBeUndefined()
    await expect(sessions.authenticate(identity, now)).rejects.toThrow(UnauthorizedError)
  })

  it('preserves persistence failures', async () => {
    const dbError = new Error('connection lost')
    vi.mocked(repository.findActive).mockRejectedValue(dbError)

    await expect(sessions.authenticate({ id: 'session-1', userId: 'user-1' })).rejects.toBe(dbError)
  })

  it('revokes a Session through its complete identity', async () => {
    const identity = { id: 'session-1', userId: 'user-1' }
    await sessions.revoke(identity)
    expect(repository.remove).toHaveBeenCalledWith(identity)
  })
})
