import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { buildApp } from '#api/app.js'

describe('health routes', () => {
  const app = buildApp()

  beforeAll(() => app.ready())
  afterAll(() => app.close())

  it('reports the API is live', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/health/live' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
    expect(response.headers['x-content-type-options']).toBe('nosniff')
  })

  it('reports readiness when the database responds', async () => {
    vi.spyOn(app.db, 'execute').mockResolvedValueOnce({ rows: [] } as never)

    const response = await app.inject({ method: 'GET', url: '/api/v1/health/ready' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('reports unavailable when the database does not respond', async () => {
    vi.spyOn(app.db, 'execute').mockRejectedValueOnce(new Error('database unavailable'))

    const response = await app.inject({ method: 'GET', url: '/api/v1/health/ready' })

    expect(response.statusCode).toBe(503)
    expect(response.json()).toEqual({
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'Database unavailable'
    })
  })

  it('does not register API documentation outside development', () => {
    expect(app.hasRoute({ method: 'GET', url: '/openapi.json' })).toBe(false)
  })

  it('serves the web app only for unknown GET routes', async () => {
    const [webRoute, apiRoute, webMutation] = await Promise.all([
      app.inject({ method: 'GET', url: '/frontend-route' }),
      app.inject({ method: 'GET', url: '/api/missing' }),
      app.inject({ method: 'POST', url: '/frontend-route' })
    ])

    expect(webRoute.statusCode).toBe(200)
    expect(webRoute.headers['content-type']).toContain('text/html')
    expect(apiRoute.statusCode).toBe(404)
    expect(apiRoute.json()).toMatchObject({ error: 'Not Found', statusCode: 404 })
    expect(webMutation.statusCode).toBe(404)
  })

  it('rate limits API routes but not health checks', async () => {
    for (let request = 0; request < 100; request++) {
      await app.inject({ method: 'POST', url: '/api/v1/auth/logout' })
    }

    const limited = await app.inject({ method: 'POST', url: '/api/v1/auth/logout' })
    expect(limited.statusCode).toBe(429)
    expect(limited.headers['retry-after']).toBeDefined()

    const health = await app.inject({ method: 'GET', url: '/api/v1/health/live' })
    expect(health.statusCode).toBe(200)
  })
})
