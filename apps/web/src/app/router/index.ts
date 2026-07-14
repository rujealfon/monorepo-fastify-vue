import type { PermissionKey } from '@monorepo-fastify-vue/api-client'
import { useQueryCache } from '@pinia/colada'
import { createRouter, createWebHistory } from 'vue-router'

import AuthLayout from '@/app/layouts/AuthLayout.vue'
import DefaultLayout from '@/app/layouts/DefaultLayout.vue'
import { aboutRoutes } from '@/features/about'
import { adminRoutes } from '@/features/admin'
import { authRoutes, sessionQuery } from '@/features/auth'
import { healthRoutes } from '@/features/health'
import { homeRoutes } from '@/features/home'
import { profileRoutes } from '@/features/profile'
import { taskRoutes } from '@/features/tasks'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: DefaultLayout,
      children: [...homeRoutes, ...aboutRoutes, ...healthRoutes, ...taskRoutes, ...profileRoutes, ...adminRoutes]
    },
    {
      path: '/',
      component: AuthLayout,
      children: [...authRoutes]
    }
  ]
})

router.beforeEach(async (to) => {
  const permission = to.meta.permission as PermissionKey | undefined
  if (!to.meta.requiresAuth && !permission)
    return

  const cache = useQueryCache()
  const state = await cache.refresh(cache.ensure(sessionQuery)).catch(() => null)
  if (!state || state.status === 'error')
    return

  const user = state.data

  if (!user)
    return { path: '/login', query: { redirect: to.fullPath } }

  if (permission && !user.permissions.includes(permission))
    return { path: '/' }
})

export default router
