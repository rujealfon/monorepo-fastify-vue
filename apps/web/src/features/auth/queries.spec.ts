import { RpcError } from '@monorepo-fastify-vue/api-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { sessionQuery } from './queries'

const api = vi.hoisted(() => ({ GET: vi.fn() }))
vi.mock('@/shared/api/client', () => ({ api }))

const user = {
  id: '1',
  email: 'person@example.com',
  profile: { firstName: null, lastName: null, gender: null, birthDate: null, bio: null, createdAt: '', updatedAt: '' },
  createdAt: '',
  updatedAt: ''
}

describe('session query', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the authenticated user', async () => {
    api.GET.mockResolvedValue({ data: user, response: { ok: true, status: 200 } })
    await expect(sessionQuery.query({} as never)).resolves.toEqual(user)
  })

  it('treats 401 as a signed-out session', async () => {
    api.GET.mockResolvedValue({ response: { ok: false, status: 401 } })
    await expect(sessionQuery.query({} as never)).resolves.toBeNull()
  })

  it('throws other API failures', async () => {
    api.GET.mockResolvedValue({ response: { ok: false, status: 503 } })
    await expect(sessionQuery.query({} as never)).rejects.toEqual(new RpcError(503))
  })
})
