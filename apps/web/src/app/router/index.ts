import type { RouterHistory } from 'vue-router'
import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'

import AppLayout from '@/app/layouts/AppLayout.vue'
import AuthLayout from '@/app/layouts/AuthLayout.vue'
import { authRoutes } from '@/features/auth'
import { healthRoutes } from '@/features/health'
import { profileRoutes } from '@/features/profile'
import { checkSessionAccess } from '@/features/session'

export function createAppRouter(history: RouterHistory = createWebHistory(import.meta.env.BASE_URL)) {
  const router = createRouter({
    history,
    routes: [
      {
        path: '/service-unavailable',
        name: 'service-unavailable',
        component: () => import('@/app/views/ServiceUnavailableView.vue')
      },
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

  router.beforeEach(async (to, from) => {
    if (!to.meta.requiresAuth && !to.meta.guestOnly)
      return

    const access = await checkSessionAccess()

    // An initial navigation has no current page to preserve, so give the user
    // an actionable outage screen. Later failures keep the current route.
    if (access.status === 'unavailable') {
      if (from === START_LOCATION)
        return { path: '/service-unavailable', query: { redirect: to.fullPath } }
      return false
    }

    const isAuthenticated = access.status === 'authenticated'

    if (to.meta.requiresAuth && !isAuthenticated)
      return { path: '/login', query: { redirect: to.fullPath } }

    if (to.meta.guestOnly && isAuthenticated)
      return { path: '/profile' }
  })

  return router
}

const router = createAppRouter()

export default router
