import type { FastifyReply, FastifyRequest } from 'fastify'
import type { CreateRole, PatchRole, ReplaceRolePermissions, ReplaceUserRoles, UsersPageQuery } from './roles.schema.js'

import * as service from './roles.service.js'

type RoleParams = { roleId: number }
type UserParams = { userId: string }

export function listRoles() {
  return service.listRoles()
}

export async function createRole(request: FastifyRequest<{ Body: CreateRole }>, reply: FastifyReply) {
  const role = await service.createRole(request.body, request.authorization!.user.id)
  reply.code(201)
  return role
}

export function getRole(request: FastifyRequest<{ Params: RoleParams }>) {
  return service.getRole(request.params.roleId)
}

export function patchRole(request: FastifyRequest<{ Params: RoleParams, Body: PatchRole }>) {
  return service.updateRole(request.params.roleId, request.body, request.authorization!.user.id)
}

export async function deleteRole(request: FastifyRequest<{ Params: RoleParams }>, reply: FastifyReply) {
  await service.deleteRole(request.params.roleId, request.authorization!.user.id)
  reply.code(204)
}

export function putRolePermissions(request: FastifyRequest<{ Params: RoleParams, Body: ReplaceRolePermissions }>) {
  return service.replaceRolePermissions(request.params.roleId, request.body.permissionIds, request.authorization!)
}

export function listUsers(request: FastifyRequest<{ Querystring: UsersPageQuery }>) {
  const { page, limit, search } = request.query
  return service.listUsers(page, limit, search)
}

export function getUserRoles(request: FastifyRequest<{ Params: UserParams }>) {
  return service.getUserRoles(request.params.userId)
}

export function putUserRoles(request: FastifyRequest<{ Params: UserParams, Body: ReplaceUserRoles }>) {
  return service.replaceUserRoles(request.params.userId, request.body.roleIds, request.authorization!)
}

export function getMyAuthorization(request: FastifyRequest) {
  const { user, roles, permissions, authorizationVersion } = request.authorization!
  return { user, roles, permissions: [...permissions].sort(), authorizationVersion }
}
