import type { FastifyReply, FastifyRequest } from 'fastify'
import type { SessionClaims } from './sessions.schema.js'
import type { SessionIdentity } from './sessions.types.js'

import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import fp from 'fastify-plugin'

import { config } from '#api/config/index.js'
import { UnauthorizedError } from '#api/modules/users'

import { SESSION_COOKIE, SESSION_SECONDS } from './sessions.constants.js'
import { sessionClaimsSchema } from './sessions.schema.js'
import * as sessions from './sessions.service.js'

async function verifiedIdentity(request: FastifyRequest): Promise<SessionIdentity> {
  const claims = sessionClaimsSchema.safeParse(await request.jwtVerify<Record<string, unknown>>())
  if (!claims.success)
    throw new UnauthorizedError()
  return { id: claims.data.sid, userId: claims.data.sub }
}

function clearCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, {
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
    path: '/'
  })
}

export default fp(async (fastify) => {
  await fastify.register(cookie)
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
    sign: { expiresIn: SESSION_SECONDS }
  })

  fastify.decorate('session', {
    async establish(reply: FastifyReply, userId: string) {
      const session = await sessions.issue(userId)
      reply.setCookie(SESSION_COOKIE, fastify.jwt.sign({ sid: session.id, sub: session.userId }), {
        ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
        expires: session.expiresAt,
        httpOnly: true,
        maxAge: SESSION_SECONDS,
        path: '/',
        sameSite: 'strict',
        secure: config.NODE_ENV === 'production'
      })
    },

    async authenticate(request: FastifyRequest) {
      let identity: SessionIdentity
      try {
        identity = await verifiedIdentity(request)
      }
      catch {
        throw new UnauthorizedError()
      }

      // Persistence failures stay outside the credential-error branch so a
      // database outage remains a 5xx rather than becoming a false 401.
      await sessions.authenticate(identity)
    },

    async end(request: FastifyRequest, reply: FastifyReply) {
      let identity: SessionIdentity | undefined
      try {
        identity = await verifiedIdentity(request)
      }
      catch {}

      try {
        if (identity)
          await sessions.revoke(identity)
      }
      finally {
        clearCookie(reply)
      }
    }
  })
}, { name: 'session-plugin', dependencies: ['db-plugin'] })

declare module 'fastify' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyInstance {
    session: {
      authenticate: (request: FastifyRequest) => Promise<void>
      end: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
      establish: (reply: FastifyReply, userId: string) => Promise<void>
    }
  }
}

declare module '@fastify/jwt' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyJWT {
    payload: SessionClaims
    user: SessionClaims
  }
}
