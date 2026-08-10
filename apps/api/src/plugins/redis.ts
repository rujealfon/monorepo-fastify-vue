import fp from 'fastify-plugin'
import { Redis } from 'ioredis'

import { config } from '#api/config/index.js'

export default fp(async (fastify) => {
  // Optional in dev/test (see config): the rate-limit store falls back to
  // per-instance in-memory, and the handoff token store simply can't mint or
  // redeem tokens, when unset.
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

  fastify.decorate('redis', redis)
}, { name: 'redis-plugin' })

declare module 'fastify' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyInstance {
    redis: Redis | undefined
  }
}
