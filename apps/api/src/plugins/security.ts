import { randomUUID } from 'node:crypto'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fp from 'fastify-plugin'
import { Redis } from 'ioredis'

import { config } from '#api/config/index.js'

export default fp(async (fastify) => {
  await fastify.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === 'development'
      ? {
          directives: {
            imgSrc: ['\'self\'', 'data:', 'blob:'],
            scriptSrc: ['\'self\'', '\'unsafe-inline\''],
            styleSrc: ['\'self\'', '\'unsafe-inline\'']
          }
        }
      : undefined
  })

  // Vercel runs the API as isolated serverless instances with no shared memory, so the
  // default in-memory rate-limit store only caps requests per instance, not globally.
  // Backing it with Redis when configured makes the limit (including the health/ready
  // DB probe) hold across instances.
  const redis = config.REDIS_URL
    ? new Redis(config.REDIS_URL, { connectTimeout: 2000, maxRetriesPerRequest: 1 })
    : undefined

  if (redis) {
    // ioredis emits 'error' on connection failures and failed reconnects; per Node's
    // EventEmitter contract, an 'error' event with no listener throws and crashes the
    // process. Listening here just logs it instead.
    redis.on('error', (err) => {
      fastify.log.error({ err }, 'Redis connection error')
    })

    fastify.addHook('onClose', async () => {
      await redis.quit()
    })
  }

  await fastify.register(rateLimit, {
    allowList: (request) => {
      const path = request.url.split('?', 1)[0]
      return !path.startsWith('/api/v1/') || path === '/api/v1/health/live'
    },
    max: 100,
    timeWindow: '1 minute',
    redis,
    // Redis outlives each test process, so a per-app namespace prevents counters
    // from a previous run from making an otherwise isolated test start at 429.
    nameSpace: config.NODE_ENV === 'test'
      ? `fastify-rate-limit-test-${randomUUID()}-`
      : undefined,
    // Fail open by default so a Redis outage does not 500 every /api/v1/* request,
    // including the health/ready probe. The credential-processing /register and
    // /login routes intentionally override this with skipOnError: false in
    // users.constants.ts, preventing a limiter outage from admitting Argon2 work.
    skipOnError: true
  })
}, { name: 'security-plugin' })
