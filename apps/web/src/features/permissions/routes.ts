import type { RouteRecordRaw } from 'vue-router'

export const permissionRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/ability-rules',
    name: 'admin-ability-rules',
    component: () => import('./views/AbilityRulesView.vue'),
    meta: { requiresAuth: true, ability: { action: 'read', subject: 'AbilityRule' } }
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('./views/ForbiddenView.vue')
  }
]
