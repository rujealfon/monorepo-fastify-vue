<script setup lang="ts">
import type { Role } from '@monorepo-fastify-vue/api-client'
import type { TableColumn } from '@nuxt/ui'
import { useQuery } from '@pinia/colada'
import { computed, reactive, ref } from 'vue'

import { useAccessMutations } from '@/features/admin/mutations'
import { permissionsQuery, rolesQuery } from '@/features/admin/queries'
import { sessionQuery } from '@/features/auth'

const session = useQuery(sessionQuery)
const roles = useQuery(rolesQuery)
const granted = computed(() => session.data.value?.permissions ?? [])
const canReadPermissions = computed(() => granted.value.includes('permissions.read'))
const permissions = useQuery({ ...permissionsQuery, enabled: canReadPermissions })
const { createRole, updateRole, deleteRole } = useAccessMutations()
const editOpen = ref(false)
const deleteOpen = ref(false)
const editing = ref<Role>()
const deleting = ref<Role>()
const state = reactive({ name: '', description: '', permissionIds: [] as string[] })

const columns: TableColumn<Role>[] = [
  { accessorKey: 'name', header: 'Role' },
  { id: 'permissions', header: 'Permissions' },
  { id: 'actions' }
]
const permissionOptions = computed(() => permissions.data.value?.map(permission => ({
  label: permission.key,
  value: permission.id,
  description: permission.description
})) ?? [])
const error = computed(() => roles.error.value
  ?? permissions.error.value
  ?? createRole.error.value
  ?? updateRole.error.value
  ?? deleteRole.error.value)
const pending = computed(() => [createRole, updateRole, deleteRole].some(mutation => mutation.asyncStatus.value === 'loading'))

function openCreate() {
  editing.value = undefined
  Object.assign(state, { name: '', description: '', permissionIds: [] })
  editOpen.value = true
}

function openEdit(role: Role) {
  editing.value = role
  Object.assign(state, {
    name: role.name,
    description: role.description ?? '',
    permissionIds: role.permissions.map(permission => permission.id)
  })
  editOpen.value = true
}

async function save() {
  try {
    const body = {
      name: state.name,
      description: state.description || null,
      permissionIds: state.permissionIds
    }
    if (editing.value)
      await updateRole.mutateAsync({ id: editing.value.id, body })
    else
      await createRole.mutateAsync(body)
    editOpen.value = false
  }
  catch {
    // Mutation state renders the API error above the table.
  }
}

async function remove() {
  if (!deleting.value)
    return
  try {
    await deleteRole.mutateAsync(deleting.value.id)
    deleteOpen.value = false
  }
  catch {
    // Mutation state renders the API error above the table.
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          Roles
        </h1>
        <p class="text-muted">
          Compose application access from enforced permissions.
        </p>
      </div>
      <UButton
        v-if="granted.includes('roles.create') && granted.includes('permissions.read')"
        icon="i-lucide-plus"
        label="Create role"
        @click="openCreate"
      />
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error.message"
    />

    <UTable
      :data="roles.data.value"
      :columns="columns"
      :loading="roles.status.value === 'pending' || permissions.status.value === 'pending'"
      empty="No roles found."
    >
      <template #name-cell="{ row }">
        <div>
          <div class="flex items-center gap-2 font-medium text-highlighted">
            {{ row.original.name }}
            <UBadge v-if="row.original.system" label="System" color="neutral" variant="subtle" />
          </div>
          <p v-if="row.original.description" class="text-sm text-muted">
            {{ row.original.description }}
          </p>
        </div>
      </template>

      <template #permissions-cell="{ row }">
        <div class="flex max-w-xl flex-wrap gap-1">
          <UBadge
            v-for="permission in row.original.permissions"
            :key="permission.id"
            :label="permission.key"
            color="neutral"
            variant="subtle"
          />
          <span v-if="!row.original.permissions.length" class="text-sm text-muted">No permissions</span>
        </div>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton
            v-if="granted.includes('roles.update') && granted.includes('permissions.read') && row.original.name !== 'admin'"
            :aria-label="`Edit ${row.original.name}`"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            @click="openEdit(row.original)"
          />
          <UButton
            v-if="granted.includes('roles.delete') && !row.original.system"
            :aria-label="`Delete ${row.original.name}`"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            @click="deleting = row.original; deleteOpen = true"
          />
        </div>
      </template>
    </UTable>

    <UModal v-model:open="editOpen" :title="editing ? `Edit ${editing.name}` : 'Create role'" description="Choose the permissions granted by this role.">
      <template #body>
        <form id="role-form" class="space-y-4" @submit.prevent="save">
          <UFormField label="Name" name="name" required>
            <UInput
              v-model="state.name"
              class="w-full"
              placeholder="project-manager"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              maxlength="64"
              required
              :disabled="editing?.system"
            />
          </UFormField>
          <UFormField label="Description" name="description">
            <UInput v-model="state.description" class="w-full" maxlength="255" />
          </UFormField>
          <UFormField label="Permissions" name="permissionIds">
            <USelectMenu
              v-model="state.permissionIds"
              :items="permissionOptions"
              value-key="value"
              multiple
              class="w-full"
              placeholder="No permissions"
            />
          </UFormField>
        </form>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" @click="editOpen = false" />
          <UButton type="submit" form="role-form" label="Save" :loading="pending" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen" title="Delete role" :description="`Delete ${deleting?.name ?? 'this role'}? This cannot be undone.`">
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" @click="deleteOpen = false" />
          <UButton label="Delete" color="error" :loading="pending" @click="remove" />
        </div>
      </template>
    </UModal>
  </div>
</template>
