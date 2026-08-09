import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'

import { LOGIN_RATE_LIMIT, REGISTER_RATE_LIMIT } from '#api/modules/users/users.constants.js'

type StoreResult = { current: number, ttl: number }
type StoreCallback = (error: Error | null, result?: StoreResult) => void

class FailingStore {
  child() {
    return this
  }

  incr(_key: string, callback: StoreCallback) {
    callback(new Error('rate-limit store unavailable'))
  }
}

class WorkingStore {
  child() {
    return this
  }

  incr(_key: string, callback: StoreCallback) {
    callback(null, { current: 1, ttl: 60_000 })
  }
}

async function injectWithStore(
  options: typeof REGISTER_RATE_LIMIT | typeof LOGIN_RATE_LIMIT,
  store: typeof FailingStore | typeof WorkingStore
) {
  const app = Fastify({ logger: false })
  let handled = false

  await app.register(rateLimit, { global: false, store })
  app.post('/', { config: { rateLimit: options } }, async () => {
    handled = true
    return { ok: true }
  })

  const response = await app.inject({ method: 'POST', url: '/' })
  await app.close()

  return { handled, response }
}

describe('authentication rate limits', () => {
  it.each([
    ['registration', REGISTER_RATE_LIMIT],
    ['login', LOGIN_RATE_LIMIT]
  ] as const)('%s fails closed when its store is unavailable', async (_name, options) => {
    const { handled, response } = await injectWithStore(options, FailingStore)

    expect(response.statusCode).toBe(500)
    expect(handled).toBe(false)
  })

  it('allows a request when the rate-limit store succeeds', async () => {
    const { handled, response } = await injectWithStore(LOGIN_RATE_LIMIT, WorkingStore)

    expect(response.statusCode).toBe(200)
    expect(handled).toBe(true)
  })
})
