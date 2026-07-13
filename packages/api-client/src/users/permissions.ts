import type { Permission } from './types.js'

export function hasPermission(permissions: readonly Permission[] | undefined, needed: Permission) {
  return !!permissions?.includes(needed)
}
