import type { FastifyReply, FastifyRequest } from 'fastify'
import type { CreateRole, RoleIdParams, UpdateRole } from './roles.schema.js'

import * as service from './roles.service.js'

export function listRoles() {
  return service.listRoles()
}

export async function createRole(request: FastifyRequest<{ Body: CreateRole }>, reply: FastifyReply) {
  const role = await service.createRole(request.body)
  reply.code(201)
  return role
}

export function updateRole(request: FastifyRequest<{ Params: RoleIdParams, Body: UpdateRole }>) {
  return service.updateRole(request.params.id, request.body)
}

export async function removeRole(request: FastifyRequest<{ Params: RoleIdParams }>, reply: FastifyReply) {
  await service.deleteRole(request.params.id)
  reply.code(204)
}

export function permissionCatalog() {
  return service.getPermissionCatalog()
}
