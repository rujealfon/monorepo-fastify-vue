import type { paths } from '../schema.js'

type RegisterPath = paths['/api/v1/auth/register']
type LoginPath = paths['/api/v1/auth/login']
type ProfilePath = paths['/api/v1/profile/']
type AdminUsersPath = paths['/api/v1/admin/users/']
type AdminUserRolePath = paths['/api/v1/admin/users/{id}/role']

export type RegisterUser = RegisterPath['post']['requestBody']['content']['application/json']
export type LoginUser = LoginPath['post']['requestBody']['content']['application/json']
export type UpdateProfile = ProfilePath['patch']['requestBody']['content']['application/json']
export type User = ProfilePath['get']['responses'][200]['content']['application/json']
export type Permission = User['permissions'][number]
export type RoleRef = User['role']
export type AdminUserPage = AdminUsersPath['get']['responses'][200]['content']['application/json']
export type AdminUser = AdminUserPage['data'][number]
export type ChangeUserRole = AdminUserRolePath['patch']['requestBody']['content']['application/json']
