import type { paths } from '../schema.js'

type AdminRolesPath = paths['/api/v1/admin/roles/']
type AdminRolePath = paths['/api/v1/admin/roles/{id}']

export type RoleWithPermissions = AdminRolesPath['get']['responses'][200]['content']['application/json'][number]
export type CreateRole = AdminRolesPath['post']['requestBody']['content']['application/json']
export type UpdateRole = AdminRolePath['patch']['requestBody']['content']['application/json']
