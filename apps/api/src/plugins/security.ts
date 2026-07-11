import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fp from 'fastify-plugin'

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
  await fastify.register(rateLimit, {
    allowList: request => !request.url.startsWith('/api/v1/')
      || request.url.startsWith('/api/v1/health/'),
    max: 100,
    timeWindow: '1 minute'
  })
})
