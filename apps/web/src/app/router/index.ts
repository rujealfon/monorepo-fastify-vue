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
      children: [{ path: '/', name: 'root', redirect: '/profile' }, ...healthRoutes, ...profileRoutes]
    },
    {
      path: '/',
      component: AuthLayout,
      children: [...authRoutes]
    }
  ]
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth && !to.meta.guestOnly)
    return

  const cache = useQueryCache()
  const state = await cache.refresh(cache.ensure(profileQuery)).catch(() => null)
  const isAuthenticated = Boolean(state && state.status !== 'error' && state.data)

  if (to.meta.requiresAuth && !isAuthenticated)
    return { path: '/login', query: { redirect: to.fullPath } }

  if (to.meta.guestOnly && isAuthenticated)
    return { path: '/profile' }
})

export default router
