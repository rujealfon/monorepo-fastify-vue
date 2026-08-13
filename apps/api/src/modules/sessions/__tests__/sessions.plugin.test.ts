import type { FastifyInstance, FastifyRequest } from 'fastify'

import Fastify from 'fastify'
import fp from 'fastify-plugin'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import sessionPlugin from '#api/modules/sessions/sessions.plugin.js'
import { UnauthorizedError } from '#api/modules/users'

const sessionService = vi.hoisted(() => ({
  authenticate: vi.fn(),
  issue: vi.fn(),
  revoke: vi.fn()
}))
vi.mock('#api/modules/sessions/sessions.service.js', () => sessionService)

describe('session plugin', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = Fastify()
    app.register(fp(async () => {}, { name: 'db-plugin' }))
    app.register(sessionPlugin)
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

    await expect(app.session.authenticate(request)).rejects.toThrow(UnauthorizedError)
    expect(sessionService.authenticate).not.toHaveBeenCalled()
  })

  it('preserves persistence failures after claims are verified', async () => {
    const dbError = new Error('connection lost')
    sessionService.authenticate.mockRejectedValue(dbError)
    const request = {
      jwtVerify: vi.fn().mockResolvedValue({
        sid: '00000000-0000-4000-8000-000000000001',
        sub: '00000000-0000-4000-8000-000000000002'
      })
    } as unknown as FastifyRequest

    await expect(app.session.authenticate(request)).rejects.toBe(dbError)
  })

  it('revokes a valid Session before clearing its cookie', async () => {
    const request = {
      jwtVerify: vi.fn().mockResolvedValue({
        sid: '00000000-0000-4000-8000-000000000001',
        sub: '00000000-0000-4000-8000-000000000002'
      })
    } as unknown as FastifyRequest
    const clearCookie = vi.fn()
    const reply = { clearCookie } as never

    await app.session.end(request, reply)

    expect(sessionService.revoke).toHaveBeenCalledWith({
      id: '00000000-0000-4000-8000-000000000001',
      userId: '00000000-0000-4000-8000-000000000002'
    })
    expect(clearCookie).toHaveBeenCalled()
  })

  it('clears the cookie even when revocation fails', async () => {
    const request = {
      jwtVerify: vi.fn().mockResolvedValue({
        sid: '00000000-0000-4000-8000-000000000001',
        sub: '00000000-0000-4000-8000-000000000002'
      })
    } as unknown as FastifyRequest
    const clearCookie = vi.fn()
    const reply = { clearCookie } as never
    sessionService.revoke.mockRejectedValue(new Error('db unavailable'))

    await expect(app.session.end(request, reply)).rejects.toThrow('db unavailable')
    expect(clearCookie).toHaveBeenCalled()
  })
})
