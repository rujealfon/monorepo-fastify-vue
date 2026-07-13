import type { RouteRecordRaw } from 'vue-router'

export const adminUserRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('./views/UsersView.vue'),
    meta: { requiresAuth: true, can: ['read', 'User'] }
  }
]
