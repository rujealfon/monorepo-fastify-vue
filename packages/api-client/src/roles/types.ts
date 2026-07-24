import type { paths } from '../schema.js'

type RolesPath = paths['/api/v1/roles/']
type RolePath = paths['/api/v1/roles/{roleId}']
type RoleAbilityRulesPath = paths['/api/v1/roles/{roleId}/ability-rules']
type UsersPath = paths['/api/v1/users/']
type UserRolesPath = paths['/api/v1/users/{userId}/roles']

export type Role = RolesPath['get']['responses'][200]['content']['application/json'][number]
export type RoleWithAbilityRules = RolePath['get']['responses'][200]['content']['application/json']
export type CreateRole = RolesPath['post']['requestBody']['content']['application/json']
export type UpdateRole = RolePath['patch']['requestBody']['content']['application/json']
export type ReplaceRoleAbilityRules = RoleAbilityRulesPath['put']['requestBody']['content']['application/json']
export type ReplaceUserRoles = UserRolesPath['put']['requestBody']['content']['application/json']
export type UsersPage = UsersPath['get']['responses'][200]['content']['application/json']
export type UserWithRoles = UsersPage['data'][number]
export type AssignedRole = NonNullable<UserWithRoles['roles']>[number]
