import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ReplaceRoleAbilityRules } from '#api/modules/authorization'
import type { CreateRole, PatchRole, ReplaceUserRoles, UsersPageQuery } from './roles.schema.js'

import * as service from './roles.service.js'

type RoleParams = { roleId: number }
type UserParams = { userId: string }

export function listRoles(request: FastifyRequest) {
  return service.listRoles(request.authorization!)
}

export async function createRole(request: FastifyRequest<{ Body: CreateRole }>, reply: FastifyReply) {
  const role = await service.createRole(request.body, request.authorization!.user.id, request.authorization!)
  reply.code(201)
  return role
}

export function getRole(request: FastifyRequest<{ Params: RoleParams }>) {
  return service.getRole(request.params.roleId, request.authorization!)
}

export function patchRole(request: FastifyRequest<{ Params: RoleParams, Body: PatchRole }>) {
  return service.updateRole(request.params.roleId, request.body, request.authorization!.user.id, request.authorization!)
}

export async function deleteRole(request: FastifyRequest<{ Params: RoleParams }>, reply: FastifyReply) {
  await service.deleteRole(request.params.roleId, request.authorization!.user.id, request.authorization!)
  reply.code(204)
}

export function putRoleAbilityRules(request: FastifyRequest<{ Params: RoleParams, Body: ReplaceRoleAbilityRules }>) {
  return service.replaceRoleAbilityRules(request.params.roleId, request.body.abilityRuleIds, request.authorization!)
}

export function listUsers(request: FastifyRequest<{ Querystring: UsersPageQuery }>) {
  const { page, limit, search } = request.query
  return service.listUsers(page, limit, search, request.authorization!)
}

export function getUserRoles(request: FastifyRequest<{ Params: UserParams }>) {
  return service.getUserRoles(request.params.userId, request.authorization!)
}

export function putUserRoles(request: FastifyRequest<{ Params: UserParams, Body: ReplaceUserRoles }>) {
  return service.replaceUserRoles(request.params.userId, request.body.roleIds, request.authorization!)
}
