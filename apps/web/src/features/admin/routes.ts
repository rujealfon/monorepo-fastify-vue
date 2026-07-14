import type { RouteRecordRaw } from 'vue-router'

export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('./views/AdminUsersView.vue'),
    meta: { requiresAuth: true, permission: 'users:read' }
  },
  {
    path: '/admin/roles',
    name: 'admin-roles',
    component: () => import('./views/AdminRolesView.vue'),
    meta: { requiresAuth: true, permission: 'roles:read' }
  }
]
