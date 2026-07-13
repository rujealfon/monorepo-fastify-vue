<script setup lang="ts">
import type { AdminUser, Role } from '@monorepo-fastify-vue/api-client'
import { outranks, USER_ROLES } from '@monorepo-fastify-vue/api-client'
import { useQuery } from '@pinia/colada'
import { computed, ref } from 'vue'

import { sessionQuery } from '@/features/auth'
import { useAdminUserMutations } from '@/features/users/mutations'
import { adminUsersQuery } from '@/features/users/queries'

const page = ref(1)
const session = useQuery(sessionQuery)
const users = useQuery(() => adminUsersQuery(page.value))
const { changeRole: changeRoleMutation, remove: removeMutation } = useAdminUserMutations()

const deleteTarget = ref<AdminUser | null>(null)

const roleLabels: Record<Role, string> = {
  user: 'Standard User',
  admin: 'Admin',
  super_admin: 'Super Admin'
}

const actorRole = computed(() => session.data.value?.role)

const pending = computed(() => [changeRoleMutation, removeMutation]
  .some(mutation => mutation.asyncStatus.value === 'loading'))
const error = computed(() => users.error.value
  ?? changeRoleMutation.error.value
  ?? removeMutation.error.value)

// UX mirror of the server rules: the API remains the enforcement point.
function canManage(user: AdminUser) {
  const actor = actorRole.value
  if (!actor || user.id === session.data.value?.id)
    return false
  return actor === 'super_admin' || outranks(actor, user.role)
}

function roleItems(user: AdminUser) {
  const actor = actorRole.value
  if (!actor)
    return []
  const assignable = actor === 'super_admin'
    ? USER_ROLES
    : USER_ROLES.filter(role => outranks(actor, role))
  const options = assignable.includes(user.role) ? assignable : [...assignable, user.role]
  return options.map(role => ({ label: roleLabels[role], value: role }))
}

function onRoleChange(user: AdminUser, role: Role) {
  if (role !== user.role)
    changeRoleMutation.mutate({ id: user.id, role })
}

function confirmDelete() {
  if (deleteTarget.value)
    removeMutation.mutate(deleteTarget.value.id)
  deleteTarget.value = null
}
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Users
      </h1>
      <p class="text-muted">
        Manage user accounts and their roles.
      </p>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error.message"
    />

    <div v-if="users.status.value === 'pending'" class="flex flex-col gap-2">
      <USkeleton v-for="i in 4" :key="i" class="h-14 w-full" />
    </div>

    <UEmpty
      v-else-if="!users.data.value?.data.length"
      icon="i-lucide-users"
      title="No users found"
      description="Registered users will appear here."
    />

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="user in users.data.value?.data"
        :key="user.id"
        class="flex items-center gap-3 rounded-lg border border-default bg-elevated/50 px-4 py-3"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate text-default">
            {{ user.email }}
            <UBadge v-if="user.id === session.data.value?.id" label="You" variant="subtle" size="sm" />
          </p>
          <p class="text-sm text-muted">
            Joined {{ new Date(user.createdAt).toLocaleDateString() }}
          </p>
        </div>
        <template v-if="canManage(user)">
          <USelect
            :aria-label="`Role for ${user.email}`"
            :model-value="user.role"
            :items="roleItems(user)"
            :disabled="pending"
            class="w-40"
            @update:model-value="onRoleChange(user, $event as Role)"
          />
          <UButton
            :aria-label="`Delete ${user.email}`"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="sm"
            :disabled="pending"
            @click="deleteTarget = user"
          />
        </template>
        <UBadge v-else :label="roleLabels[user.role]" color="neutral" variant="subtle" />
      </li>
    </ul>

    <div v-if="users.data.value?.pagination.totalPages" class="flex justify-center">
      <UPagination
        v-model:page="page"
        :total="users.data.value.pagination.total"
        :items-per-page="20"
      />
    </div>

    <UModal
      :open="!!deleteTarget"
      title="Delete user"
      :description="`This permanently deletes ${deleteTarget?.email} and all of their data.`"
      @update:open="deleteTarget = null"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="deleteTarget = null" />
          <UButton color="error" label="Delete" @click="confirmDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
