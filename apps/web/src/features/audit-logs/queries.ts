import type { AuditAction, AuditEntityType } from '@monorepo-fastify-vue/api-client'

import { defineQueryOptions } from '@pinia/colada'

import { api } from '@/shared/api/client'
import { fail } from '@/shared/api/fail'

export type AuditLogFilters = {
  page: number
  actorEmail: string
  action: AuditAction | null
  entityType: AuditEntityType | null
  from: string | null
  to: string | null
}

export const AUDIT_KEYS = {
  root: ['audit-logs'] as const,
  page: ({ page, actorEmail, action, entityType, from, to }: AuditLogFilters) =>
    [...AUDIT_KEYS.root, { page, actorEmail, action, entityType, from, to }] as const
}

export const auditLogsQuery = defineQueryOptions((filters: AuditLogFilters) => ({
  key: AUDIT_KEYS.page(filters),
  query: async () => {
    const { data, response } = await api.GET('/api/v1/audit-logs/', {
      params: {
        query: {
          page: filters.page,
          limit: 20,
          ...filters.actorEmail ? { actorEmail: filters.actorEmail } : {},
          ...filters.action ? { action: filters.action } : {},
          ...filters.entityType ? { entityType: filters.entityType } : {},
          ...filters.from ? { from: `${filters.from}T00:00:00.000Z` } : {},
          ...filters.to ? { to: `${filters.to}T23:59:59.999Z` } : {}
        }
      }
    })
    await fail(response)
    return data
  },
  placeholderData: previous => previous
}))
