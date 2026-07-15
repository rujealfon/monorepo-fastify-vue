import type { Authorization, PermissionKey } from '@monorepo-fastify-vue/api-client'

const WILDCARD: PermissionKey = '*'

export function can(authorization: Authorization | null | undefined, permission: PermissionKey) {
  const granted = authorization?.permissions
  return Boolean(granted && (granted.includes(WILDCARD) || granted.includes(permission)))
}

export function canAll(authorization: Authorization | null | undefined, permissions: readonly PermissionKey[]) {
  return permissions.every(permission => can(authorization, permission))
}

export function canAny(authorization: Authorization | null | undefined, permissions: readonly PermissionKey[]) {
  return permissions.some(permission => can(authorization, permission))
}
