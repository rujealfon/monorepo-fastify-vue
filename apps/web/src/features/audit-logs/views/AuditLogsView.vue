<script setup lang="ts">
import type { AuditAction, AuditEntityType } from '@monorepo-fastify-vue/api-client'

import { useQuery } from '@pinia/colada'
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { auditLogsQuery } from '@/features/audit-logs/queries'
import { useAuthorization } from '@/features/permissions'

const page = ref(1)
const actorEmail = ref('')
const action = ref<AuditAction | null>(null)
const entityType = ref<AuditEntityType | null>(null)
const from = ref('')
const to = ref('')
const { can } = useAuthorization()

const logs = useQuery(() => auditLogsQuery({
  page: page.value,
  actorEmail: actorEmail.value.trim(),
  action: action.value,
  entityType: entityType.value,
  from: from.value || null,
  to: to.value || null
}))

watch([actorEmail, action, entityType, from, to], () => page.value = 1)

const actionItems: { label: string, value: AuditAction | null }[] = [
  { label: 'All actions', value: null },
  { label: 'Task created', value: 'task.created' },
  { label: 'Task updated', value: 'task.updated' },
  { label: 'Task deleted', value: 'task.deleted' },
  { label: 'Role created', value: 'role.created' },
  { label: 'Role updated', value: 'role.updated' },
  { label: 'Role deleted', value: 'role.deleted' },
  { label: 'Role permissions replaced', value: 'role.permissions_replaced' },
  { label: 'User roles replaced', value: 'user.roles_replaced' },
  { label: 'User registered', value: 'user.registered' },
  { label: 'Profile updated', value: 'profile.updated' },
  { label: 'Login', value: 'auth.login' },
  { label: 'Login failed', value: 'auth.login_failed' },
  { label: 'Logout', value: 'auth.logout' },
  { label: 'Permission denied', value: 'auth.permission_denied' }
]

const entityTypeItems: { label: string, value: AuditEntityType | null }[] = [
  { label: 'All entities', value: null },
  { label: 'Task', value: 'task' },
  { label: 'Role', value: 'role' },
  { label: 'User', value: 'user' }
]

const actionLabels = computed(() => new Map(actionItems.map(item => [item.value, item.label])))

function hasMetadata(metadata: Record<string, unknown> | null | undefined) {
  return metadata != null && Object.keys(metadata).length > 0
}

function requestContext(log: { ipAddress: string | null, userAgent: string | null, requestId: string | null }) {
  return [
    log.ipAddress,
    log.userAgent,
    log.requestId ? `req ${log.requestId}` : null
  ].filter(Boolean).join(' · ')
}
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Audit Logs
      </h1>
      <p class="text-muted">
        Who changed what, and when.
      </p>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row">
      <UInput
        v-model="actorEmail"
        aria-label="Filter by actor email"
        placeholder="Filter by actor email"
        icon="i-lucide-search"
        class="flex-1"
      />
      <USelectMenu
        v-model="action"
        :items="actionItems"
        value-key="value"
        aria-label="Filter by action"
        class="w-full sm:w-56"
      />
      <USelectMenu
        v-model="entityType"
        :items="entityTypeItems"
        value-key="value"
        aria-label="Filter by entity type"
        class="w-full sm:w-40"
      />
    </div>

    <div class="flex flex-col gap-2 sm:flex-row">
      <UInput
        v-model="from"
        type="date"
        aria-label="From date"
        class="w-full sm:w-48"
      />
      <UInput
        v-model="to"
        type="date"
        aria-label="To date"
        class="w-full sm:w-48"
      />
    </div>

    <UAlert
      v-if="logs.error.value"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="logs.error.value.message"
    />

    <div v-if="logs.status.value === 'pending'" class="flex flex-col gap-2">
      <USkeleton v-for="i in 5" :key="i" class="h-16 w-full" />
    </div>

    <UEmpty
      v-else-if="!logs.data.value?.data.length"
      icon="i-lucide-scroll-text"
      title="No audit events"
      description="Mutations will show up here as they happen."
    />

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="log in logs.data.value?.data"
        :key="log.id"
        class="flex flex-col gap-1 rounded-lg border border-default bg-elevated/50 px-4 py-3"
      >
        <div class="flex flex-wrap items-center gap-2">
          <UBadge color="primary" variant="subtle" :label="actionLabels.get(log.action) ?? log.action" />
          <RouterLink
            v-if="log.entityType === 'role' && can('roles.read')"
            :to="`/admin/roles/${log.entityId}`"
            class="text-sm text-primary hover:underline"
          >
            {{ log.entityType }} #{{ log.entityId }}
          </RouterLink>
          <span v-else class="text-sm text-muted">{{ log.entityType }} #{{ log.entityId }}</span>
          <span class="ml-auto text-sm text-muted">{{ new Date(log.createdAt).toLocaleString() }}</span>
        </div>
        <p class="truncate text-sm text-default">
          {{ log.actorEmail ?? 'Deleted user' }}
        </p>
        <p v-if="requestContext(log)" class="truncate text-xs text-muted">
          {{ requestContext(log) }}
        </p>
        <details v-if="hasMetadata(log.metadata)" class="text-sm">
          <summary class="cursor-pointer text-muted">
            Details
          </summary>
          <pre class="mt-1 overflow-x-auto rounded bg-elevated p-2 text-xs">{{ JSON.stringify(log.metadata, null, 2) }}</pre>
        </details>
      </li>
    </ul>

    <div v-if="(logs.data.value?.pagination.totalPages ?? 0) > 1" class="flex justify-center">
      <UPagination
        v-model:page="page"
        :total="logs.data.value?.pagination.total ?? 0"
        :items-per-page="20"
      />
    </div>
  </div>
</template>
