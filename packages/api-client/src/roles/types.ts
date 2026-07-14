import type { paths } from '../schema.js'

type AdminRolesPath = paths['/api/v1/admin/roles/']
type AdminRolePath = paths['/api/v1/admin/roles/{id}']
type PermissionsPath = paths['/api/v1/admin/permissions/']

export type RoleList = AdminRolesPath['get']['responses'][200]['content']['application/json']
export type Role = RoleList['data'][number]
export type CreateRole = AdminRolesPath['post']['requestBody']['content']['application/json']
export type UpdateRole = AdminRolePath['patch']['requestBody']['content']['application/json']
export type PermissionCatalog = PermissionsPath['get']['responses'][200]['content']['application/json']
