import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ActiveSession, SessionIdentity } from '#api/modules/users'

import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import fp from 'fastify-plugin'
import { z } from 'zod'

import { config } from '#api/config/index.js'
import { authenticateSession, SESSION_SECONDS, UnauthorizedError } from '#api/modules/users'

export const SESSION_COOKIE = 'session'

const sessionClaimsSchema = z.object({
  sid: z.uuid(),
  sub: z.uuid()
})

async function verifiedSessionIdentity(request: FastifyRequest): Promise<SessionIdentity> {
  const claims = sessionClaimsSchema.safeParse(await request.jwtVerify<Record<string, unknown>>())
  if (!claims.success)
    throw new UnauthorizedError()
  return { id: claims.data.sid, userId: claims.data.sub }
}

export default fp(async (fastify) => {
  await fastify.register(cookie)
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
    sign: { expiresIn: SESSION_SECONDS }
  })

  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    let identity: SessionIdentity
    try {
      identity = await verifiedSessionIdentity(request)
    }
    catch {
      throw new UnauthorizedError()
    }

    // Keep persistence failures outside the credential-error boundary so a
    // database outage remains a 5xx instead of being misreported as a 401.
    await authenticateSession(identity)
  })

  fastify.decorate('setSession', (reply: FastifyReply, session: ActiveSession) => {
    reply.setCookie(SESSION_COOKIE, fastify.jwt.sign({ sid: session.id, sub: session.userId }), {
      ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
      expires: session.expiresAt,
      httpOnly: true,
      maxAge: SESSION_SECONDS,
      path: '/',
      sameSite: 'strict',
      secure: config.NODE_ENV === 'production'
    })
  })

  fastify.decorate('sessionIdentity', async (request: FastifyRequest): Promise<SessionIdentity | undefined> => {
    try {
      return await verifiedSessionIdentity(request)
    }
    catch {
      return undefined
    }
  })

  fastify.decorate('clearSession', (reply: FastifyReply) => {
    reply.clearCookie(SESSION_COOKIE, {
      ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
      path: '/'
    })
  })
}, { name: 'auth-plugin', dependencies: ['db-plugin', 'sensible-plugin'] })

declare module 'fastify' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>
    clearSession: (reply: FastifyReply) => void
    sessionIdentity: (request: FastifyRequest) => Promise<SessionIdentity | undefined>
    setSession: (reply: FastifyReply, session: ActiveSession) => void
  }
}

declare module '@fastify/jwt' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyJWT {
    payload: { sid: string, sub: string }
    user: { sid: string, sub: string }
  }
}
