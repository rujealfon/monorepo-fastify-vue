<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { computed, ref, watch } from 'vue'

import { useAuthorization } from '@/features/permissions'
import { useUserRoleMutations } from '@/features/roles/mutations'
import { rolesQuery, usersQuery } from '@/features/roles/queries'

const page = ref(1)
const search = ref('')
const users = useQuery(() => usersQuery({ page: page.value, search: search.value.trim() }))
const roles = useQuery(rolesQuery)
const { replaceRoles: replaceMutation } = useUserRoleMutations()
const { can, authorization } = useAuthorization()

watch(search, () => page.value = 1)

const canAssign = computed(() => can('assign_roles', 'users'))
const pending = computed(() => replaceMutation.asyncStatus.value === 'loading')
const error = computed(() => users.error.value ?? roles.error.value ?? replaceMutation.error.value)

const roleItems = computed(() => (roles.data.value ?? [])
  .filter(role => role.isActive)
  .map(role => ({ label: role.name, value: role.id })))

function isSelf(userId: string) {
  return authorization.value?.user.id === userId
}

function saveRoles(userId: string, roleIds: number[]) {
  replaceMutation.mutate({ userId, roleIds })
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Users
      </h1>
      <p class="text-muted">
        Assign roles to users.
      </p>
    </div>

    <UInput
      v-model="search"
      aria-label="Search users by email"
      placeholder="Search by email"
      icon="i-lucide-search"
      size="lg"
    />

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error.message"
    />

    <div v-if="users.status.value === 'pending'" class="flex flex-col gap-2">
      <USkeleton v-for="i in 4" :key="i" class="h-16 w-full" />
    </div>

    <UEmpty
      v-else-if="!users.data.value?.data.length"
      icon="i-lucide-users"
      title="No users found"
      description="Try a different search."
    />

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="user in users.data.value?.data"
        :key="user.id"
        class="flex flex-col gap-2 rounded-lg border border-default bg-elevated/50 px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium text-default">
            {{ user.email }}
            <UBadge v-if="isSelf(user.id)" color="primary" variant="subtle" label="You" class="ml-1" />
          </p>
          <p class="text-sm text-muted">
            Joined {{ new Date(user.createdAt).toLocaleDateString() }}
          </p>
        </div>
        <USelectMenu
          :model-value="user.roles.map(role => role.id)"
          :items="roleItems"
          value-key="value"
          multiple
          :placeholder="canAssign ? 'No roles' : 'No roles assigned'"
          :disabled="!canAssign || pending"
          :aria-label="`Roles for ${user.email}`"
          class="w-full sm:w-64"
          @update:model-value="saveRoles(user.id, $event)"
        />
      </li>
    </ul>

    <div v-if="(users.data.value?.pagination.totalPages ?? 0) > 1" class="flex justify-center">
      <UPagination
        v-model:page="page"
        :total="users.data.value?.pagination.total ?? 0"
        :items-per-page="20"
      />
    </div>
  </div>
</template>
