import type { FastifyInstance } from 'fastify'

import cors from '@fastify/cors'
import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'

import { config } from './config/index.js'
import { modules } from './modules/index.js'
import authPlugin from './plugins/auth.js'
import compressPlugin from './plugins/compress.js'
import dbPlugin from './plugins/db.js'
import errorHandlerPlugin from './plugins/error-handler.js'
import multipartPlugin from './plugins/multipart.js'
import openapiPlugin from './plugins/openapi.js'
import securityPlugin from './plugins/security.js'
import sensiblePlugin from './plugins/sensible.js'

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    // Vercel's edge is the only reverse proxy in front of the API in production,
    // so trust exactly one hop. Other environments (e.g. docker-compose) expose
    // the API directly, so X-Forwarded-* headers must not be trusted there.
    trustProxy: config.NODE_ENV === 'production' ? 1 : false
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.register(compressPlugin)
  app.register(multipartPlugin)
  app.register(sensiblePlugin)
  app.register(dbPlugin)
  app.register(authPlugin)
  // web (app.mysite.com) and site (mysite.com) are separate Vercel projects/origins
  // from the API (api.mysite.com), so cross-origin requests need explicit CORS.
  // CORS_ORIGIN is required in production (see config); falls back to reflecting
  // the request origin in dev/test where it's unset.
  app.register(cors, { origin: config.CORS_ORIGIN ?? true, credentials: true })

  app.register(openapiPlugin)
  app.register(securityPlugin)
  app.register(errorHandlerPlugin)
  app.register(modules)

  return app
}
