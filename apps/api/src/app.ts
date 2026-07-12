import type { FastifyInstance } from 'fastify'
// import cors from "@fastify/cors";
import fastifyStatic from '@fastify/static'
import swagger from '@fastify/swagger'
import scalar from '@scalar/fastify-api-reference'
import Fastify from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler
} from 'fastify-type-provider-zod'

import { config } from './config/index.js'
import { modules } from './modules/index.js'
import authPlugin from './plugins/auth.js'
import dbPlugin from './plugins/db.js'
import errorHandlerPlugin from './plugins/error-handler.js'
import securityPlugin from './plugins/security.js'
import sensiblePlugin from './plugins/sensible.js'

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    trustProxy: true
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.register(sensiblePlugin)
  app.register(dbPlugin)
  app.register(authPlugin)
  app.register(fastifyStatic, {
    root: new URL('../../../dist', import.meta.url)
  })
  // CORS is intentionally disabled for the one-project same-origin deploy.
  // If API and web are split later, uncomment the import above and this:
  // app.register(cors, { origin: config.CORS_ORIGIN });

  app.register(swagger, {
    openapi: {
      info: { title: 'Monorepo Fastify Vue API', version: '1.0.0' }
    },
    transform: jsonSchemaTransform
  })
  if (config.NODE_ENV === 'development')
    app.register(scalar, { routePrefix: '/' })

  app.register(securityPlugin)
  app.register(errorHandlerPlugin)
  app.register(modules)
  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api/')) {
      return reply.sendFile('index.html', { maxAge: 0 })
    }

    return reply.code(404).send({
      message: `Route ${request.method}:${request.url} not found`,
      error: 'Not Found',
      statusCode: 404
    })
  })

  return app
}
