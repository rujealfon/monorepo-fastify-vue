import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { buildApp } from '#api/app.js'

describe('app', () => {
  const app = buildApp()

  beforeAll(() => app.ready())
  afterAll(() => app.close())

  it('does not register API documentation outside development', () => {
    expect(app.hasRoute({ method: 'GET', url: '/openapi.json' })).toBe(false)
  })

  it('returns JSON 404 for unknown routes (API deploys separately from web/site)', async () => {
    const [unknownGet, apiRoute, unknownPost] = await Promise.all([
      app.inject({ method: 'GET', url: '/frontend-route' }),
      app.inject({ method: 'GET', url: '/api/missing' }),
      app.inject({ method: 'POST', url: '/frontend-route' })
    ])

    expect(unknownGet.statusCode).toBe(404)
    expect(unknownGet.json()).toMatchObject({ error: 'Not Found', statusCode: 404 })
    expect(unknownGet.headers['x-content-type-options']).toBe('nosniff')
    expect(unknownGet.headers['content-security-policy']).toBeDefined()
    expect(apiRoute.statusCode).toBe(404)
    expect(apiRoute.json()).toMatchObject({ error: 'Not Found', statusCode: 404 })
    expect(unknownPost.statusCode).toBe(404)
  })

  it('rate limits readiness but not liveness', async () => {
    for (let request = 0; request < 100; request++) {
      await app.inject({ method: 'POST', url: '/api/v1/auth/logout' })
    }

    const limited = await app.inject({ method: 'POST', url: '/api/v1/auth/logout' })
    expect(limited.statusCode).toBe(429)
    expect(limited.headers['retry-after']).toBeDefined()

    const health = await app.inject({ method: 'GET', url: '/api/v1/health/live' })
    expect(health.statusCode).toBe(200)

    const healthWithQuery = await app.inject({ method: 'GET', url: '/api/v1/health/live?ts=123' })
    expect(healthWithQuery.statusCode).toBe(200)

    const execute = vi.spyOn(app.db, 'execute')
    execute.mockClear()
    const readiness = await app.inject({ method: 'GET', url: '/api/v1/health/ready' })
    expect(readiness.statusCode).toBe(429)
    expect(execute).not.toHaveBeenCalled()
  })
})
