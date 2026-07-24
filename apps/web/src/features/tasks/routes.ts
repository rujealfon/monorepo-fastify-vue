import type { RouteRecordRaw } from 'vue-router'

export const taskRoutes: RouteRecordRaw[] = [
  {
    path: '/tasks',
    name: 'tasks',
    component: () => import('./views/TasksView.vue'),
    meta: { requiresAuth: true, ability: { action: 'read', subject: 'Task' } }
  }
]
