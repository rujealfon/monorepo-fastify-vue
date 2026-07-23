<script setup lang="ts">
import type { Role } from '@monorepo-fastify-vue/api-client'

import { useQuery } from '@pinia/colada'
import { computed, reactive, ref, useTemplateRef } from 'vue'

import { Can } from '@/features/permissions'
import { useRoleMutations } from '@/features/roles/mutations'
import { rolesQuery } from '@/features/roles/queries'
import { apiFormErrors } from '@/shared/api/form-errors'

const state = reactive({ name: '', description: '' })
const form = useTemplateRef('form')
const roles = useQuery(rolesQuery)
const { create: createMutation, remove: deleteMutation } = useRoleMutations(() => {
  state.name = ''
  state.description = ''
})

const pending = computed(() => [createMutation, deleteMutation]
  .some(mutation => mutation.asyncStatus.value === 'loading'))
const error = computed(() => roles.error.value
  ?? (createMutation.error.value?.status === 422 ? null : createMutation.error.value)
  ?? deleteMutation.error.value)

const roleToDelete = ref<Role | null>(null)
const isConfirmOpen = computed({
  get: () => roleToDelete.value !== null,
  set: (open) => {
    if (!open)
      roleToDelete.value = null
  }
})

function slugify(name: string) {
  return name.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-+|-+$/g, '')
}

async function create() {
  try {
    await createMutation.mutateAsync({
      name: state.name.trim(),
      slug: slugify(state.name),
      description: state.description.trim() || null
    })
  }
  catch (error) {
    form.value?.setErrors(apiFormErrors(error))
  }
}

async function confirmDelete() {
  const role = roleToDelete.value
  if (!role)
    return
  try {
    await deleteMutation.mutateAsync(role.id)
  }
  finally {
    roleToDelete.value = null
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Roles
      </h1>
      <p class="text-muted">
        Manage roles and the permissions they grant.
      </p>
    </div>

    <Can action="create" subject="roles">
      <UForm ref="form" :state="state" class="flex items-start gap-2" novalidate @submit.prevent="create">
        <UFormField name="name" class="flex-1">
          <UInput
            v-model="state.name"
            aria-label="New role name"
            placeholder="Role name"
            maxlength="100"
            required
            icon="i-lucide-plus"
            class="w-full"
            size="lg"
          />
        </UFormField>
        <UFormField name="description" class="flex-1">
          <UInput
            v-model="state.description"
            aria-label="New role description"
            placeholder="Description (optional)"
            maxlength="500"
            class="w-full"
            size="lg"
          />
        </UFormField>
        <UButton type="submit" label="Add" size="lg" :disabled="pending" />
      </UForm>
    </Can>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error.message"
    />

    <div v-if="roles.status.value === 'pending'" class="flex flex-col gap-2">
      <USkeleton v-for="i in 3" :key="i" class="h-14 w-full" />
    </div>

    <UEmpty
      v-else-if="!roles.data.value?.length"
      icon="i-lucide-shield"
      title="No roles yet"
      description="Add your first role above to get started."
    />

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="role in roles.data.value"
        :key="role.id"
        class="flex items-center gap-3 rounded-lg border border-default bg-elevated/50 px-4 py-3"
      >
        <UIcon name="i-lucide-shield" class="size-5 text-primary" />
        <div class="flex-1 truncate">
          <RouterLink :to="{ name: 'admin-role', params: { roleId: role.id } }" class="font-medium text-default hover:underline">
            {{ role.name }}
          </RouterLink>
          <p class="truncate text-sm text-muted">
            {{ role.description ?? role.slug }}
          </p>
        </div>
        <UBadge v-if="role.isSystem" color="neutral" variant="subtle" label="System" />
        <UBadge v-if="!role.isActive" color="warning" variant="subtle" label="Inactive" />
        <Can action="delete" subject="roles">
          <UButton
            v-if="!role.isSystem"
            :aria-label="`Delete ${role.name}`"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="sm"
            :disabled="pending"
            @click="roleToDelete = role"
          />
        </Can>
      </li>
    </ul>

    <UModal v-model:open="isConfirmOpen" :title="`Delete ${roleToDelete?.name}?`" :ui="{ footer: 'justify-end' }">
      <template #body>
        <p v-if="roleToDelete?.userCount" class="text-sm text-default">
          This role is currently assigned to
          <strong>{{ roleToDelete.userCount }}</strong>
          {{ roleToDelete.userCount === 1 ? 'user' : 'users' }}. Deleting it will remove it, and any permissions it
          uniquely grants, from {{ roleToDelete.userCount === 1 ? 'them' : 'all of them' }} immediately.
        </p>
        <p v-else class="text-sm text-default">
          No users currently hold this role. This action cannot be undone.
        </p>
      </template>
      <template #footer>
        <UButton label="Cancel" color="neutral" variant="ghost" :disabled="pending" @click="isConfirmOpen = false" />
        <UButton label="Delete role" color="error" :loading="pending" @click="confirmDelete" />
      </template>
    </UModal>
  </div>
</template>
