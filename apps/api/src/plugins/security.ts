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
    ? new Redis(config.REDIS_URL, { connectTimeout: 500, maxRetriesPerRequest: 1 })
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
    // Fail open: rate limiting is defense-in-depth here (auth already relies on
    // sameSite cookies + sec-fetch-site checks, see plugins/auth.ts), not the only
    // control. Without this, a Redis outage would 500 every /api/v1/* request,
    // including the health/ready probe, instead of just losing the rate-limit guard.
    skipOnError: true
  })
})
