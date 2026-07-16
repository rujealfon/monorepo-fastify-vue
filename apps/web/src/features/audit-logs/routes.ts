import type { RouteRecordRaw } from 'vue-router'

export const auditLogRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/audit-logs',
    name: 'admin-audit-logs',
    component: () => import('./views/AuditLogsView.vue'),
    meta: { requiresAuth: true, permissions: ['audit.read'] }
  }
]
