import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fp from 'fastify-plugin'
import { Redis as Valkey } from 'ioredis'

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
  // Backing it with Valkey when configured makes the limit (including the health/ready
  // DB probe) hold across instances.
  const valkey = config.VALKEY_URL
    ? new Valkey(config.VALKEY_URL, { connectTimeout: 500, maxRetriesPerRequest: 1 })
    : undefined

  if (valkey) {
    fastify.addHook('onClose', async () => {
      await valkey.quit()
    })
  }

  await fastify.register(rateLimit, {
    allowList: (request) => {
      const path = request.url.split('?', 1)[0]
      return !path.startsWith('/api/v1/') || path === '/api/v1/health/live'
    },
    max: 100,
    timeWindow: '1 minute',
    redis: valkey
  })
})
