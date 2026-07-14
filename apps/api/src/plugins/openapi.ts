import swagger from '@fastify/swagger'
import scalar from '@scalar/fastify-api-reference'
import fp from 'fastify-plugin'
import { jsonSchemaTransform, jsonSchemaTransformObject } from 'fastify-type-provider-zod'

import { config } from '#api/config/index.js'

export default fp(async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: { title: 'Monorepo Fastify Vue API', version: '1.0.0' }
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject
  })

  if (config.NODE_ENV === 'development')
    await fastify.register(scalar, { routePrefix: '/' })
})
