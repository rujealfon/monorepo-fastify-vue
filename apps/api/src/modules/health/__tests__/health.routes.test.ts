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
  })
})
