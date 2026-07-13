import type { Role } from '@monorepo-fastify-vue/api-client'

import { roleAtLeast } from '@monorepo-fastify-vue/api-client'
import { useQueryCache } from '@pinia/colada'
import { createRouter, createWebHistory } from 'vue-router'

import AuthLayout from '@/app/layouts/AuthLayout.vue'
import DefaultLayout from '@/app/layouts/DefaultLayout.vue'
import { aboutRoutes } from '@/features/about'
import { authRoutes, sessionQuery } from '@/features/auth'
import { healthRoutes } from '@/features/health'
import { homeRoutes } from '@/features/home'
import { profileRoutes } from '@/features/profile'
import { taskRoutes } from '@/features/tasks'
import { adminUserRoutes } from '@/features/users'

declare module 'vue-router' {
  // eslint-disable-next-line ts/consistent-type-definitions -- interface required for declaration merging
  interface RouteMeta {
    requiresAuth?: boolean
    requiresRole?: Role
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: DefaultLayout,
      children: [...homeRoutes, ...aboutRoutes, ...healthRoutes, ...taskRoutes, ...profileRoutes, ...adminUserRoutes]
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
  const state = await cache.refresh(cache.ensure(sessionQuery)).catch(() => null)
  if (!state || state.status === 'error')
    return

  const user = state.data

  if (!user)
    return { path: '/login', query: { redirect: to.fullPath } }

  if (to.meta.requiresRole && !roleAtLeast(user.role, to.meta.requiresRole))
    return { path: '/' }
})

export default router
