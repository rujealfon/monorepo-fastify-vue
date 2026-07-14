import multipart from '@fastify/multipart'
import fp from 'fastify-plugin'

export default fp(async (fastify) => {
  await fastify.register(multipart)
})
