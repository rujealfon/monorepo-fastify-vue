import { WILDCARD_PERMISSION } from './permissions.schema.js'

export function hasPermission(granted: ReadonlySet<string>, required: string) {
  return granted.has(WILDCARD_PERMISSION) || granted.has(required)
}

export function hasAllPermissions(granted: ReadonlySet<string>, required: readonly string[]) {
  return required.every(permission => hasPermission(granted, permission))
}

export function hasAnyPermission(granted: ReadonlySet<string>, required: readonly string[]) {
  return required.some(permission => hasPermission(granted, permission))
}
