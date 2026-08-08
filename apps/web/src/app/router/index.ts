import { useQueryCache } from '@pinia/colada'
import { createRouter, createWebHistory } from 'vue-router'

import AppLayout from '@/app/layouts/AppLayout.vue'
import AuthLayout from '@/app/layouts/AuthLayout.vue'
import { authRoutes } from '@/features/auth'
import { healthRoutes } from '@/features/health'
import { profileQuery, profileRoutes } from '@/features/profile'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppLayout,
      // Home and About are public marketing pages served by apps/site; web
      // only hosts authenticated app routes, so '/' redirects into the app.
      children: [{ path: '/', redirect: '/profile' }, ...healthRoutes, ...profileRoutes]
    },
    {
      path: '/',
      component: AuthLayout,
      children: [...authRoutes]
    }
  ]
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth)
    return

  const cache = useQueryCache()
  const state = await cache.refresh(cache.ensure(profileQuery)).catch(() => null)
  if (!state || state.status === 'error' || !state.data)
    return { path: '/login', query: { redirect: to.fullPath } }
})

export default router
