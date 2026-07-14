import type { paths } from '../schema.js'

type UsersPath = paths['/api/v1/admin/users']
type UserRolesPath = paths['/api/v1/admin/users/{id}/roles']
type RolesPath = paths['/api/v1/admin/roles']
type RolePath = paths['/api/v1/admin/roles/{id}']
type PermissionsPath = paths['/api/v1/admin/permissions']

export type ManagedUsersPage = UsersPath['get']['responses'][200]['content']['application/json']
export type ManagedUser = ManagedUsersPage['data'][number]
export type ReplaceUserRoles = UserRolesPath['put']['requestBody']['content']['application/json']
export type Role = RolesPath['get']['responses'][200]['content']['application/json'][number]
export type CreateRole = RolesPath['post']['requestBody']['content']['application/json']
export type UpdateRole = RolePath['patch']['requestBody']['content']['application/json']
export type Permission = PermissionsPath['get']['responses'][200]['content']['application/json'][number]
export type PermissionKey = Permission['key']
