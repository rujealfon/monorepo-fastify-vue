import type { FastifyInstance } from 'fastify'
// import cors from "@fastify/cors";
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
import staticPlugin from './plugins/static.js'

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
  app.register(staticPlugin)
  // CORS is intentionally disabled for the one-project same-origin deploy.
  // If API and web are split later, uncomment the import above and this:
  // app.register(cors, { origin: config.CORS_ORIGIN });

  app.register(openapiPlugin)
  app.register(securityPlugin)
  app.register(errorHandlerPlugin)
  app.register(modules)

  return app
}
