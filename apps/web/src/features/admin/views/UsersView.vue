<script setup lang="ts">
import type { ManagedUser } from '@monorepo-fastify-vue/api-client'
import type { TableColumn } from '@nuxt/ui'
import { useQuery } from '@pinia/colada'
import { computed, ref } from 'vue'

import { useAccessMutations } from '@/features/admin/mutations'
import { rolesQuery, usersQuery } from '@/features/admin/queries'
import { sessionQuery } from '@/features/auth'

const page = ref(1)
const session = useQuery(sessionQuery)
const users = useQuery(() => usersQuery(page.value))
const canAssign = computed(() => session.data.value?.permissions.includes('users.roles.update') === true)
const canReadRoles = computed(() => session.data.value?.permissions.includes('roles.read') === true)
const availableRoles = useQuery({ ...rolesQuery, enabled: canReadRoles })
const { replaceUserRoles } = useAccessMutations()

const columns: TableColumn<ManagedUser>[] = [
  { accessorKey: 'email', header: 'Email' },
  { id: 'roles', header: 'Roles' },
  { accessorKey: 'createdAt', header: 'Created' }
]

const isAdmin = computed(() => session.data.value?.roles.some(role => role.name === 'admin') === true)
const roleOptions = computed(() => (availableRoles.data.value ?? [])
  .filter(role => isAdmin.value || !role.system)
  .map(role => ({ label: role.name, value: role.id })))
const error = computed(() => users.error.value ?? availableRoles.error.value ?? replaceUserRoles.error.value)

function assign(user: ManagedUser, roleIds: string[]) {
  replaceUserRoles.mutate({ id: user.id, body: { roleIds } })
}

function assignedRoleIds(user: ManagedUser) {
  return user.roles.map(role => role.id)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Users
      </h1>
      <p class="text-muted">
        Assign one or more roles to each account.
      </p>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error.message"
    />

    <UTable
      :data="users.data.value?.data"
      :columns="columns"
      :loading="users.status.value === 'pending'"
      empty="No users found."
    >
      <template #roles-cell="{ row }">
        <USelectMenu
          v-if="canAssign && canReadRoles"
          :model-value="assignedRoleIds(row.original)"
          :items="roleOptions"
          value-key="value"
          multiple
          :disabled="row.original.id === session.data.value?.id || replaceUserRoles.asyncStatus.value === 'loading'"
          :aria-label="`Roles for ${row.original.email}`"
          placeholder="No roles"
          class="min-w-52"
          @update:model-value="assign(row.original, $event)"
        />
        <div v-else class="flex flex-wrap gap-1">
          <UBadge v-for="role in row.original.roles" :key="role.id" :label="role.name" color="neutral" variant="subtle" />
          <span v-if="!row.original.roles.length" class="text-sm text-muted">No roles</span>
        </div>
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-sm text-muted">{{ new Date(row.original.createdAt).toLocaleDateString() }}</span>
      </template>
    </UTable>

    <div v-if="users.data.value?.pagination.totalPages" class="flex justify-center">
      <UPagination
        v-model:page="page"
        :total="users.data.value.pagination.total"
        :items-per-page="20"
      />
    </div>
  </div>
</template>
