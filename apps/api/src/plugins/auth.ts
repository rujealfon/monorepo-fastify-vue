import type { FastifyReply, FastifyRequest } from 'fastify'

import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import fp from 'fastify-plugin'

import { config } from '#api/config/index.js'
import { UnauthorizedError } from '#api/modules/users'

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
      await request.jwtVerify<{ sub: string }>()
    }
    catch {
      throw new UnauthorizedError()
    }
  })

  fastify.decorate('sameOrigin', async (request: FastifyRequest) => {
    // app.mysite.com and api.mysite.com are separate origins but the same registrable
    // domain, so browsers report sec-fetch-site as 'same-site' (not 'cross-site') for
    // requests between them. On *.vercel.app deployments (on the public suffix list),
    // every subdomain is its own registrable domain, so the web app calling the API
    // always reports 'cross-site' even though it's the legitimate frontend — check the
    // origin against the configured web app allowlist instead of trusting sec-fetch-site
    // alone, which would reject those legitimate requests.
    const origin = request.headers.origin
    const isAllowedOrigin = origin === `${request.protocol}://${request.host}` || origin === config.CORS_ORIGIN

    if (request.headers['sec-fetch-site'] === 'cross-site' && !isAllowedOrigin)
      throw fastify.httpErrors.forbidden('Cross-site request rejected')

    if (origin && !isAllowedOrigin)
      throw fastify.httpErrors.forbidden('Cross-site request rejected')
  })

  fastify.decorate('setSession', (reply: FastifyReply, userId: string) => {
    const expires = new Date(Date.now() + SESSION_SECONDS * 1000)
    reply.setCookie(SESSION_COOKIE, fastify.jwt.sign({ sub: userId }), {
      expires,
      httpOnly: true,
      maxAge: SESSION_SECONDS,
      path: '/',
      sameSite: 'strict',
      secure: config.NODE_ENV === 'production'
    })
  })
})

declare module 'fastify' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>
    sameOrigin: (request: FastifyRequest) => Promise<void>
    setSession: (reply: FastifyReply, userId: string) => void
  }
}

declare module '@fastify/jwt' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyJWT {
    payload: { sub: string }
    user: { sub: string }
  }
}
