import { createRouter, createWebHistory } from 'vue-router'

import DefaultLayout from '@/app/layouts/DefaultLayout.vue'
import { healthRoutes } from '@/features/health'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: DefaultLayout,
      children: healthRoutes
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

export default router
