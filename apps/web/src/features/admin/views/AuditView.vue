<script setup lang="ts">
import type { AuditEvent, AuditEventsQuery } from '@monorepo-fastify-vue/api-client'
import type { TableColumn } from '@nuxt/ui'
import { useQuery } from '@pinia/colada'
import { computed, reactive, ref } from 'vue'

import { auditEventsQuery } from '@/features/admin/queries'

const page = ref(1)
const selected = ref<AuditEvent>()
const detailsOpen = ref(false)
const draft = reactive({ eventType: '', outcome: 'any', actor: '', permission: '', from: '', to: '' })
const filters = ref({ ...draft })
const query = computed<AuditEventsQuery>(() => ({
  page: page.value,
  limit: 20,
  ...Object.fromEntries(Object.entries(filters.value).filter(([, value]) => value && value !== 'any'))
}))
const events = useQuery(() => auditEventsQuery(query.value))
const columns: TableColumn<AuditEvent>[] = [
  { accessorKey: 'createdAt', header: 'Time' },
  { accessorKey: 'eventType', header: 'Event' },
  { accessorKey: 'outcome', header: 'Outcome' },
  { accessorKey: 'actorEmail', header: 'Actor' },
  { accessorKey: 'permission', header: 'Permission' },
  { id: 'actions' }
]

function applyFilters() {
  filters.value = { ...draft }
  page.value = 1
}

function showDetails(event: AuditEvent) {
  selected.value = event
  detailsOpen.value = true
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Audit
      </h1>
      <p class="text-muted">
        Authorization decisions and access-control changes, newest first.
      </p>
    </div>

    <form class="grid gap-3 rounded-lg border border-default bg-elevated/40 p-4 sm:grid-cols-2 lg:grid-cols-4" @submit.prevent="applyFilters">
      <UFormField label="Event type">
        <UInput v-model="draft.eventType" placeholder="authorization.decision" class="w-full" />
      </UFormField>
      <UFormField label="Outcome">
        <USelect v-model="draft.outcome" :items="[{ label: 'Any', value: 'any' }, { label: 'Allow', value: 'allow' }, { label: 'Deny', value: 'deny' }, { label: 'Success', value: 'success' }]" value-key="value" class="w-full" />
      </UFormField>
      <UFormField label="Actor">
        <UInput v-model="draft.actor" placeholder="Email or UUID" class="w-full" />
      </UFormField>
      <UFormField label="Permission">
        <UInput v-model="draft.permission" placeholder="tasks.read" class="w-full" />
      </UFormField>
      <UFormField label="From">
        <UInput v-model="draft.from" type="datetime-local" class="w-full" />
      </UFormField>
      <UFormField label="To">
        <UInput v-model="draft.to" type="datetime-local" class="w-full" />
      </UFormField>
      <div class="flex items-end">
        <UButton type="submit" label="Apply filters" icon="i-lucide-filter" />
      </div>
    </form>

    <UAlert v-if="events.error.value" color="error" variant="subtle" icon="i-lucide-triangle-alert" :title="events.error.value.message" />

    <UTable :data="events.data.value?.data" :columns="columns" :loading="events.asyncStatus.value === 'loading'" empty="No audit events found.">
      <template #createdAt-cell="{ row }">
        {{ new Date(row.original.createdAt).toLocaleString() }}
      </template>
      <template #outcome-cell="{ row }">
        <UBadge :label="row.original.outcome" :color="row.original.outcome === 'deny' ? 'error' : row.original.outcome === 'allow' ? 'success' : 'neutral'" variant="subtle" />
      </template>
      <template #permission-cell="{ row }">
        {{ row.original.permission ?? '—' }}
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <UButton label="Details" color="neutral" variant="ghost" size="sm" @click="showDetails(row.original)" />
        </div>
      </template>
    </UTable>

    <div v-if="events.data.value?.pagination.totalPages" class="flex justify-center">
      <UPagination v-model:page="page" :total="events.data.value.pagination.total" :items-per-page="20" />
    </div>

    <UModal v-model:open="detailsOpen" title="Audit event details">
      <template #body>
        <dl v-if="selected" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt class="text-muted">
            Event
          </dt><dd>{{ selected.eventType }}</dd>
          <dt class="text-muted">
            Actor
          </dt><dd class="break-all">
            {{ selected.actorEmail }} ({{ selected.actorId ?? 'deleted' }})
          </dd>
          <dt class="text-muted">
            Permission
          </dt><dd>{{ selected.permission ?? '—' }}</dd>
          <dt class="text-muted">
            Resource
          </dt><dd>{{ selected.resourceType ?? '—' }} {{ selected.resourceId ?? '' }}</dd>
          <dt class="text-muted">
            Matched allows
          </dt><dd class="break-all">
            {{ selected.matchedAllowPolicyIds.join(', ') || '—' }}
          </dd>
          <dt class="text-muted">
            Matched denies
          </dt><dd class="break-all">
            {{ selected.matchedDenyPolicyIds.join(', ') || '—' }}
          </dd>
        </dl>
        <pre v-if="selected" class="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">{{ JSON.stringify(selected.details, null, 2) }}</pre>
      </template>
    </UModal>
  </div>
</template>
