import fp from 'fastify-plugin'

import { db } from '#api/db/index.js'

export default fp(async (fastify) => {
  fastify.decorate('db', db)

  fastify.addHook('onClose', async () => {
    await db.$client.end()
  })
})

declare module 'fastify' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyInstance {
    db: typeof db
  }
}
