import type { FastifyInstance } from 'fastify'

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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

// `pnpm generate:certificates` mints a locally-trusted cert into the repo-root
// .certs/ dir (gitignored: it holds a private key), shared with web and site
// (apps/web/vite.config.ts, apps/site/nuxt.config.ts). Reusing that cert here
// avoids trusting a second CA just for the API. Enabling automatically once
// the cert exists (rather than an opt-in env flag) matches web/site, and keeps
// docker/host in sync without separate config.
//
// Development only, deliberately: in production TLS terminates upstream and a
// localhost-only cert (whose key is per-developer, not a deployment secret)
// must never serve real traffic, while in test the certs' presence is
// incidental -- gating on it would make local runs use HTTPS and CI, where
// .certs/ is gitignored and absent, use HTTP.
function resolveDevHttpsOptions(): { key: Buffer, cert: Buffer } | undefined {
  if (config.NODE_ENV !== 'development')
    return undefined

  const certDir = join(import.meta.dirname, '../../../.certs')
  const keyPath = join(certDir, 'dev.pem')
  const certPath = join(certDir, 'cert.pem')

  if (!existsSync(keyPath) || !existsSync(certPath))
    return undefined

  return {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath)
  }
}

export function buildApp(): FastifyInstance {
  const httpsOptions = resolveDevHttpsOptions()

  const baseOptions = {
    logger: {
      level: config.LOG_LEVEL,
      // Defense-in-depth: Fastify's default req/res serializers don't emit headers
      // or body, so these paths redact nothing today. They guard against future
      // logging code (custom serializers, explicit request.headers/body logging)
      // accidentally leaking these fields.
      redact: {
        paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]', 'req.body.password'],
        censor: '[REDACTED]'
      }
    },
    // Vercel's edge is the only reverse proxy in front of the API in production,
    // so trust exactly one hop. Other environments (e.g. docker-compose) expose
    // the API directly, so X-Forwarded-* headers must not be trusted there.
    trustProxy: config.NODE_ENV === 'production' ? 1 : false
  }

  // Fastify's https option changes its return type's generic (https.Server vs
  // http.Server); the rest of the app only uses the protocol-agnostic
  // FastifyRequest/FastifyReply API, so this cast is safe.
  const app = (httpsOptions
    ? Fastify({ ...baseOptions, https: httpsOptions })
    : Fastify(baseOptions)) as FastifyInstance

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
  app.register(cors, { origin: config.CORS_ORIGINS.length ? config.CORS_ORIGINS : true, credentials: true })

  app.register(openapiPlugin)
  app.register(securityPlugin)
  app.register(errorHandlerPlugin)
  app.register(modules)

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`
    })
  })

  return app
}
