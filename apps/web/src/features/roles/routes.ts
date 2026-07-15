import type { RouteRecordRaw } from 'vue-router'

export const roleRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/roles',
    name: 'admin-roles',
    component: () => import('./views/RolesView.vue'),
    meta: { requiresAuth: true, permissions: ['roles.read'] }
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('./views/UsersView.vue'),
    meta: { requiresAuth: true, permissions: ['users.read'] }
  },
  {
    path: '/admin/roles/:roleId(\\d+)',
    name: 'admin-role',
    component: () => import('./views/RoleDetailView.vue'),
    props: route => ({ roleId: Number(route.params.roleId) }),
    meta: { requiresAuth: true, permissions: ['roles.read'] }
  }
]
