import type { RouteRecordRaw } from 'vue-router'

export const authRoutes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: () => import('./views/RegisterView.vue'), meta: { guestOnly: true } }
]
