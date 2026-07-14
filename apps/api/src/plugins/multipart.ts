import multipart from '@fastify/multipart'
import fp from 'fastify-plugin'

export default fp(async (fastify) => {
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB per file
      files: 5,
      fields: 20,
      fieldSize: 1024 * 1024 // 1 MB per non-file field
    }
  })
})
