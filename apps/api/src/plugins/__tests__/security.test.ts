import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'

vi.mock('#api/config/index.js', () => ({
  config: {
    NODE_ENV: 'test',
    PORT: 3000,
    HOST: '0.0.0.0',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db_test',
    JWT_SECRET: 'x'.repeat(32),
    CORS_ORIGIN: 'https://allowed.example.com',
    CORS_ORIGINS: ['https://allowed.example.com'],
    COOKIE_DOMAIN: undefined,
    LOG_LEVEL: 'silent',
    REDIS_URL: undefined
  }
}))

const { default: sensiblePlugin } = await import('#api/plugins/sensible.js')
const { default: securityPlugin } = await import('#api/plugins/security.js')

async function buildTestApp() {
  const app = Fastify({ logger: false })
  await app.register(sensiblePlugin)
  await app.register(securityPlugin)
  app.get('/protected', { preHandler: app.sameOrigin }, async () => ({ ok: true }))
  await app.ready()
  return app
}

describe('security plugin — sameOrigin', () => {
  it('allows a request with no Origin header', async () => {
    const app = await buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/protected' })
    expect(response.statusCode).toBe(200)
    await app.close()
  })

  it('allows a same-origin request whose Origin header matches the request host', async () => {
    const app = await buildTestApp()
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { host: 'example.test', origin: 'http://example.test' }
    })
    expect(response.statusCode).toBe(200)
    await app.close()
  })

  it('allows a cross-site request from an allowlisted Origin', async () => {
    const app = await buildTestApp()
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { 'origin': 'https://allowed.example.com', 'sec-fetch-site': 'cross-site' }
    })
    expect(response.statusCode).toBe(200)
    await app.close()
  })

  it('rejects a cross-site request from a non-allowlisted Origin', async () => {
    const app = await buildTestApp()
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { 'origin': 'https://evil.example.com', 'sec-fetch-site': 'cross-site' }
    })
    expect(response.statusCode).toBe(403)
    await app.close()
  })

  it('rejects a declared cross-site request even without an Origin header', async () => {
    const app = await buildTestApp()
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { 'sec-fetch-site': 'cross-site' }
    })
    expect(response.statusCode).toBe(403)
    await app.close()
  })

  it('rejects a mismatched Origin even without a sec-fetch-site header', async () => {
    const app = await buildTestApp()
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { origin: 'https://evil.example.com' }
    })
    expect(response.statusCode).toBe(403)
    await app.close()
  })
})
