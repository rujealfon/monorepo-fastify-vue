import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fp from 'fastify-plugin'

export default fp(async (fastify) => {
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        imgSrc: ['\'self\'', 'data:', 'validator.swagger.io'],
        scriptSrc: ['\'self\'', ...fastify.swaggerCSP.script],
        styleSrc: ['\'self\'', 'https:', ...fastify.swaggerCSP.style]
      }
    }
  })
  await fastify.register(rateLimit, {
    allowList: request => !request.url.startsWith('/api/v1/')
      || request.url.startsWith('/api/v1/health/'),
    max: 100,
    timeWindow: '1 minute'
  })
})
