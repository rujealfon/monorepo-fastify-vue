import type { FastifyInstance, FastifyRequest } from 'fastify'

import Fastify from 'fastify'
import fp from 'fastify-plugin'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UnauthorizedError } from '#api/modules/users'
import authPlugin from '#api/plugins/auth.js'

const authenticateSession = vi.hoisted(() => vi.fn())
vi.mock('#api/modules/users', async (importOriginal) => {
  const original = await importOriginal<typeof import('#api/modules/users')>()
  return { ...original, authenticateSession }
})

describe('auth plugin', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = Fastify()
    app.register(fp(async () => {}, { name: 'db-plugin' }))
    app.register(fp(async () => {}, { name: 'sensible-plugin' }))
    app.register(authPlugin)
    await app.ready()
  })

  afterEach(async () => {
    vi.resetAllMocks()
    await app.close()
  })

  it('rejects signed claims whose Session identity is malformed', async () => {
    const request = {
      jwtVerify: vi.fn().mockResolvedValue({ sid: 'not-a-uuid', sub: 'also-not-a-uuid' })
    } as unknown as FastifyRequest

    await expect(app.authenticate(request)).rejects.toThrow(UnauthorizedError)
    expect(authenticateSession).not.toHaveBeenCalled()
  })

  it('preserves persistence failures after claims are verified', async () => {
    const dbError = new Error('connection lost')
    authenticateSession.mockRejectedValue(dbError)
    const request = {
      jwtVerify: vi.fn().mockResolvedValue({
        sid: '00000000-0000-4000-8000-000000000001',
        sub: '00000000-0000-4000-8000-000000000002'
      })
    } as unknown as FastifyRequest

    await expect(app.authenticate(request)).rejects.toBe(dbError)
  })
})
