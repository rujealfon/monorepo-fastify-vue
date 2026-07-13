import type { RouteRecordRaw } from 'vue-router'

export const adminRoleRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/roles',
    name: 'admin-roles',
    component: () => import('./views/RolesView.vue'),
    meta: { requiresAuth: true, requiresPermission: 'roles:read' }
  }
]
