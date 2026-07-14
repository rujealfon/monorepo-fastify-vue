import fastifyStatic from '@fastify/static'
import fp from 'fastify-plugin'

export default fp(async (fastify) => {
  await fastify.register(fastifyStatic, {
    root: new URL('../../../../dist', import.meta.url)
  })

  fastify.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api/'))
      return reply.sendFile('index.html', { maxAge: 0 })

    return reply.code(404).send({
      message: `Route ${request.method}:${request.url} not found`,
      error: 'Not Found',
      statusCode: 404
    })
  })
})
