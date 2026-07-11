import { createRouter, createWebHistory } from 'vue-router'

import DefaultLayout from '@/app/layouts/DefaultLayout.vue'
import { aboutRoutes } from '@/features/about'
import { healthRoutes } from '@/features/health'
import { homeRoutes } from '@/features/home'
import { taskRoutes } from '@/features/tasks'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [{
    path: '/',
    component: DefaultLayout,
    children: [...homeRoutes, ...aboutRoutes, ...healthRoutes, ...taskRoutes]
  }]
})
