import type { ApiClient } from './client.js'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RpcError } from './errors.js'
import { createSessionClient } from './session.js'

const user = {
  id: '1',
  email: 'person@example.com',
  profile: { firstName: null, lastName: null, gender: null, birthDate: null, bio: null, createdAt: '', updatedAt: '' },
  createdAt: '',
  updatedAt: ''
}

const api = {
  GET: vi.fn(),
  PATCH: vi.fn(),
  POST: vi.fn()
} as unknown as ApiClient
const session = createSessionClient(api)

describe('session client', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([401, 403])('maps HTTP %s to a signed-out User', async (status) => {
    vi.mocked(api.GET).mockResolvedValue({ response: new Response(null, { status }) })
    await expect(session.currentUser()).resolves.toBeNull()
  })

  it('preserves non-authentication failures', async () => {
    vi.mocked(api.GET).mockResolvedValue({ response: new Response(null, { status: 503 }) })
    await expect(session.currentUser()).rejects.toEqual(new RpcError(503))
  })

  it('normalizes transport failures and preserves their cause', async () => {
    const transportError = new TypeError('fetch failed')
    vi.mocked(api.GET).mockRejectedValue(transportError)

    await expect(session.currentUser()).rejects.toMatchObject({
      cause: transportError,
      message: 'API request failed',
      status: 0
    })
  })

  it('rejects a malformed successful response with no data', async () => {
    vi.mocked(api.POST).mockResolvedValue({ response: new Response(null, { status: 200 }) })

    await expect(session.login({ email: user.email, password: 'correct horse battery staple' }))
      .rejects
      .toMatchObject({ status: 200, cause: expect.any(Error) })
  })

  it('returns the signed-in User and updated Profile', async () => {
    vi.mocked(api.POST).mockResolvedValueOnce({ data: user, response: new Response(null, { status: 200 }) })
    vi.mocked(api.PATCH).mockResolvedValueOnce({ data: user, response: new Response(null, { status: 200 }) })

    await expect(session.login({ email: user.email, password: 'correct horse battery staple' })).resolves.toEqual(user)
    await expect(session.updateProfile({ firstName: 'Person' })).resolves.toEqual(user)
  })

  it('keeps registration and logout failures observable', async () => {
    vi.mocked(api.POST).mockResolvedValue({ response: new Response(null, { status: 500 }) })

    await expect(session.register({ email: user.email, password: 'correct horse battery staple' })).rejects.toEqual(new RpcError(500))
    await expect(session.logout()).rejects.toEqual(new RpcError(500))
  })
})
