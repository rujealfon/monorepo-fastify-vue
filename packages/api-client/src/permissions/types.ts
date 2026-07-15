import type { paths } from '../schema.js'

type PermissionsPath = paths['/api/v1/permissions/']
type AuthorizationPath = paths['/api/v1/me/authorization']

export type Permission = PermissionsPath['get']['responses'][200]['content']['application/json'][number]
export type Authorization = AuthorizationPath['get']['responses'][200]['content']['application/json']
export type PermissionKey = Authorization['permissions'][number]
