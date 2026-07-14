import type { Permission, User } from '@monorepo-fastify-vue/api-client'

// UX helpers only: the API is the enforcement point for every permission.
export function can(user: Pick<User, 'permissions'> | null | undefined, permission: Permission): boolean {
  return !!user?.permissions.includes(permission)
}

export function isSuperAdmin(user: Pick<User, 'role'> | null | undefined): boolean {
  return !!user && user.role.isSystem && user.role.name === 'super_admin'
}
