import type { FastifyRequest } from 'fastify'
import type { Actor } from '#api/modules/users'

import fp from 'fastify-plugin'

import { defineAbility } from '#api/modules/roles'
import { findActor, ForbiddenError, UnauthorizedError } from '#api/modules/users'

// Authorization is deliberately loaded fresh from the database on every request:
// the JWT only carries `sub`, so role or permission changes take effect immediately.
//
// The check runs against subject TYPES (plain strings), not resource instances,
// so CASL cannot evaluate per-row `conditions` here — which is why the roles
// input schema rejects them (see permissionInputSchema in roles.schema.ts).
export default fp(async (fastify) => {
  fastify.decorate('authorize', (action: string, subject: string) =>
    async (request: FastifyRequest) => {
      const actor = await findActor(request.user.sub)
      if (!actor)
        throw new UnauthorizedError()
      request.actor = { ...actor, ability: defineAbility(actor.permissions) }
      if (request.actor.ability.cannot(action, subject))
        throw new ForbiddenError()
    })
})

declare module 'fastify' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyInstance {
    authorize: (action: string, subject: string) => (request: FastifyRequest) => Promise<void>
  }

  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface FastifyRequest {
    actor: Actor
  }
}
