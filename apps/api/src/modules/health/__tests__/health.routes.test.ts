import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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

  it('rate limits API routes but not health checks', async () => {
    for (let request = 0; request < 100; request++) {
      await app.inject({ method: 'POST', url: '/api/v1/tasks/', payload: {} })
    }

    const limited = await app.inject({ method: 'POST', url: '/api/v1/tasks/', payload: {} })
    expect(limited.statusCode).toBe(429)
    expect(limited.headers['retry-after']).toBeDefined()

    const health = await app.inject({ method: 'GET', url: '/api/v1/health/live' })
    expect(health.statusCode).toBe(200)
  })
})
