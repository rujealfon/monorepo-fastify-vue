import type { FastifyReply, FastifyRequest } from 'fastify'
import type { PermissionMode } from '#api/modules/permissions'
import type { AuthorizationContext } from '#api/modules/roles'

import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import fp from 'fastify-plugin'

import { config } from '#api/config/index.js'
import { hasAllPermissions, hasAnyPermission, InsufficientPermissionError } from '#api/modules/permissions'
import { getAuthorization } from '#api/modules/roles'
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

  fastify.decorateRequest('authorization', null)

  fastify.decorate('loadAuthorization', async (request: FastifyRequest) => {
    if (request.authorization)
      return request.authorization
    const userId = request.user?.sub
    const context = userId ? await getAuthorization(userId) : null
    if (!context)
      throw new UnauthorizedError()
    request.authorization = context
    return context
  })

  fastify.decorate('authorize', (permissions: readonly string[], mode: PermissionMode = 'all') => {
    return async (request: FastifyRequest) => {
      const context = await fastify.loadAuthorization(request)
      const allowed = mode === 'any'
        ? hasAnyPermission(context.permissions, permissions)
        : hasAllPermissions(context.permissions, permissions)
      if (!allowed)
        throw new InsufficientPermissionError()
    }
  })

  fastify.decorate('sameOrigin', async (request: FastifyRequest) => {
    if (request.headers['sec-fetch-site'] === 'cross-site')
      throw fastify.httpErrors.forbidden('Cross-site request rejected')

    const origin = request.headers.origin
    if (origin && origin !== `${request.protocol}://${request.host}`)
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
    authorize: (permissions: readonly string[], mode?: PermissionMode) => (request: FastifyRequest) => Promise<void>
    loadAuthorization: (request: FastifyRequest) => Promise<AuthorizationContext>
    sameOrigin: (request: FastifyRequest) => Promise<void>
    setSession: (reply: FastifyReply, userId: string) => void
  }

  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyRequest {
    authorization: AuthorizationContext | null
  }
}

declare module '@fastify/jwt' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyJWT {
    payload: { sub: string }
    user: { sub: string }
  }
}
