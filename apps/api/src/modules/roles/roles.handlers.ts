import type { FastifyReply, FastifyRequest } from 'fastify'
import type { CreateRole, UpdateRole } from './roles.schema.js'

import * as service from './roles.service.js'

export function list() {
  return service.listRoles()
}

export async function create(request: FastifyRequest<{ Body: CreateRole }>, reply: FastifyReply) {
  const role = await service.createRole(request.body)
  reply.code(201)
  return role
}

export function patch(request: FastifyRequest<{ Params: { id: string }, Body: UpdateRole }>) {
  return service.updateRole(request.params.id, request.body)
}

export async function remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  await service.deleteRole(request.params.id)
  reply.code(204)
}
