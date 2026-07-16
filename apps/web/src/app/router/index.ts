import type { PermissionKey } from '@monorepo-fastify-vue/api-client'

import { useQueryCache } from '@pinia/colada'
import { createRouter, createWebHistory } from 'vue-router'

import AuthLayout from '@/app/layouts/AuthLayout.vue'
import DefaultLayout from '@/app/layouts/DefaultLayout.vue'
import { aboutRoutes } from '@/features/about'
import { auditLogRoutes } from '@/features/audit-logs'
import { authRoutes } from '@/features/auth'
import { healthRoutes } from '@/features/health'
import { homeRoutes } from '@/features/home'
import { authorizationQuery, canAll, canAny, permissionRoutes } from '@/features/permissions'
import { profileRoutes } from '@/features/profile'
import { roleRoutes } from '@/features/roles'
import { taskRoutes } from '@/features/tasks'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: DefaultLayout,
      children: [...homeRoutes, ...aboutRoutes, ...healthRoutes, ...taskRoutes, ...profileRoutes, ...roleRoutes, ...permissionRoutes, ...auditLogRoutes]
    },
    {
      path: '/',
      component: AuthLayout,
      children: [...authRoutes]
    }
  ]
})

router.beforeEach(async (to) => {
  const cache = useQueryCache()
  const requiredPermissions = (to.meta.permissions as PermissionKey[] | undefined) ?? []

  if (!to.meta.requiresAuth && requiredPermissions.length === 0)
    return

  const state = await cache.refresh(cache.ensure(authorizationQuery)).catch(() => null)
  if (!state || state.status === 'error')
    return { path: '/login', query: { redirect: to.fullPath } }

  const authorization = state.data
  if (!authorization)
    return { path: '/login', query: { redirect: to.fullPath } }

  if (requiredPermissions.length === 0)
    return

  const allowed = to.meta.permissionMode === 'any'
    ? canAny(authorization, requiredPermissions)
    : canAll(authorization, requiredPermissions)

  if (!allowed)
    return { name: 'forbidden' }
})

export default router
