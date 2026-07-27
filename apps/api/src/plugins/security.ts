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
    ? new Redis(config.REDIS_URL, {
        connectTimeout: 500,
        lazyConnect: true,
        maxRetriesPerRequest: 1
      })
    : undefined

  if (redis) {
    // An unhandled ioredis error event terminates the process.
    redis.on('error', (error) => {
      fastify.log.error({ err: error }, 'Redis connection error')
    })

    fastify.addHook('onClose', async () => {
      if (redis.status === 'ready')
        await redis.quit()
      else
        redis.disconnect()
    })
  }

  await fastify.register(rateLimit, {
    // Liveness must remain usable by the orchestrator during dependency
    // incidents. Readiness performs a database query and is rate limited.
    allowList: (request) => {
      const path = request.url.split('?', 1)[0]
      return !path.startsWith('/api/v1/') || path === '/api/v1/health/live'
    },
    max: 100,
    timeWindow: '1 minute',
    redis,
    // Rate limiting is defense in depth. Keep health endpoints observable if
    // the shared store is temporarily unavailable.
    skipOnError: true
  })
})
