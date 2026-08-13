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
})
