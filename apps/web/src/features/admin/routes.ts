import type { RouteRecordRaw } from 'vue-router'

export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('./views/UsersView.vue'),
    meta: { permission: 'users.read' }
  },
  {
    path: '/admin/roles',
    name: 'admin-roles',
    component: () => import('./views/RolesView.vue'),
    meta: { permission: 'roles.read' }
  }
]
