import type { FastifyReply, FastifyRequest } from 'fastify'

import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import { and, eq, gt, lte } from 'drizzle-orm'
import fp from 'fastify-plugin'

import { config } from '#api/config/index.js'
import { sessions, UnauthorizedError } from '#api/modules/users'

export const SESSION_COOKIE = 'session'
export const SESSION_SECONDS = 7 * 24 * 60 * 60

export default fp(async (fastify) => {
  await fastify.register(cookie)
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
    sign: { expiresIn: SESSION_SECONDS }
  })

  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      const payload = await request.jwtVerify<{ sid: string, sub: string }>()
      const [session] = await fastify.db
        .select({ id: sessions.id })
        .from(sessions)
        .where(and(
          eq(sessions.id, payload.sid),
          eq(sessions.userId, payload.sub),
          gt(sessions.expiresAt, new Date())
        ))
        .limit(1)

      if (!session)
        throw new UnauthorizedError()
    }
    catch {
      throw new UnauthorizedError()
    }
  })

  fastify.decorate('sameOrigin', async (request: FastifyRequest) => {
    // app.mysite.com and api.mysite.com are separate origins but the same registrable
    // domain, so browsers report sec-fetch-site as 'same-site' (not 'cross-site') for
    // requests between them. On *.vercel.app deployments (on the public suffix list),
    // every subdomain is its own registrable domain, so web or site calling the API
    // always reports 'cross-site' even though they're legitimate frontends — check the
    // origin against the configured allowlist instead of trusting sec-fetch-site alone,
    // which would reject those legitimate requests.
    const origin = request.headers.origin
    const isAllowedOrigin = origin === `${request.protocol}://${request.host}`
      || (origin !== undefined && config.CORS_ORIGINS.includes(origin))

    if (request.headers['sec-fetch-site'] === 'cross-site' && !isAllowedOrigin)
      throw fastify.httpErrors.forbidden('Cross-site request rejected')

    if (origin && !isAllowedOrigin)
      throw fastify.httpErrors.forbidden('Cross-site request rejected')
  })

  fastify.decorate('setSession', async (reply: FastifyReply, userId: string) => {
    const now = new Date()
    const expires = new Date(now.getTime() + SESSION_SECONDS * 1000)
    // Each login intentionally creates an independent device session. Do not
    // delete other live rows here unless product policy becomes single-session-per-user.
    const session = await fastify.db.transaction(async (tx) => {
      // This global sweep is intentionally simple for the current scale. Move it
      // to a scheduled or batched job if concurrent logins cause lock contention.
      await tx.delete(sessions).where(lte(sessions.expiresAt, now))

      const [createdSession] = await tx
        .insert(sessions)
        .values({ userId, expiresAt: expires })
        .returning({ id: sessions.id })

      return createdSession
    })

    reply.setCookie(SESSION_COOKIE, fastify.jwt.sign({ sid: session.id, sub: userId }), {
      ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
      expires,
      httpOnly: true,
      maxAge: SESSION_SECONDS,
      path: '/',
      sameSite: 'strict',
      secure: config.NODE_ENV === 'production'
    })
  })

  fastify.decorate('revokeSession', async (request: FastifyRequest) => {
    let payload: { sid: string, sub: string }

    try {
      payload = await request.jwtVerify<{ sid: string, sub: string }>()
    }
    catch {
      // Logout remains idempotent for missing, malformed, and expired cookies.
      return
    }

    // Let database failures propagate so callers are never told logout succeeded
    // while a still-valid server-side session remains active.
    await fastify.db.delete(sessions).where(and(
      eq(sessions.id, payload.sid),
      eq(sessions.userId, payload.sub)
    ))
  })
}, { name: 'auth-plugin', dependencies: ['db-plugin', 'sensible-plugin'] })

declare module 'fastify' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>
    revokeSession: (request: FastifyRequest) => Promise<void>
    sameOrigin: (request: FastifyRequest) => Promise<void>
    setSession: (reply: FastifyReply, userId: string) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyJWT {
    payload: { sid: string, sub: string }
    user: { sid: string, sub: string }
  }
}
