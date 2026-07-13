<script setup lang="ts">
import type { Permission, Role } from '@monorepo-fastify-vue/api-client'
import { hasPermission } from '@monorepo-fastify-vue/api-client'
import { useQuery } from '@pinia/colada'
import { computed, ref } from 'vue'

import { sessionQuery } from '@/features/auth'
import { useRoleMutations } from '@/features/roles/mutations'
import { permissionsQuery, rolesQuery } from '@/features/roles/queries'

const session = useQuery(sessionQuery)
const roles = useQuery(rolesQuery)
const catalog = useQuery(permissionsQuery)

const editing = ref<Role | null>(null)
const creating = ref(false)
const deleteTarget = ref<Role | null>(null)
const form = ref({ name: '', description: '', permissions: [] as Permission[] })

const { create: createMutation, update: updateMutation, remove: removeMutation } = useRoleMutations(closeForm)

const canManage = computed(() => hasPermission(session.data.value?.permissions, 'roles:manage'))
const isSuperAdminRole = (role: Role) => role.isSystem && role.name === 'super_admin'

const pending = computed(() => [createMutation, updateMutation, removeMutation]
  .some(mutation => mutation.asyncStatus.value === 'loading'))
const error = computed(() => roles.error.value
  ?? catalog.error.value
  ?? createMutation.error.value
  ?? updateMutation.error.value
  ?? removeMutation.error.value)

const formOpen = computed(() => creating.value || !!editing.value)
const permissionsLocked = computed(() => !!editing.value && isSuperAdminRole(editing.value))

function openCreate() {
  form.value = { name: '', description: '', permissions: [] }
  creating.value = true
}

function openEdit(role: Role) {
  form.value = { name: role.name, description: role.description ?? '', permissions: [...role.permissions] }
  editing.value = role
}

function closeForm() {
  creating.value = false
  editing.value = null
}

function togglePermission(permission: Permission, checked: boolean) {
  form.value.permissions = checked
    ? [...form.value.permissions, permission]
    : form.value.permissions.filter(item => item !== permission)
}

function save() {
  const name = form.value.name.trim()
  const description = form.value.description.trim() || null
  if (creating.value) {
    if (name)
      createMutation.mutate({ name, description, permissions: form.value.permissions })
    return
  }
  if (!editing.value)
    return
  if (isSuperAdminRole(editing.value)) {
    updateMutation.mutate({ id: editing.value.id, description })
    return
  }
  updateMutation.mutate({
    id: editing.value.id,
    ...editing.value.isSystem ? {} : { name },
    description,
    permissions: form.value.permissions
  })
}

function confirmDelete() {
  if (deleteTarget.value)
    removeMutation.mutate(deleteTarget.value.id)
  deleteTarget.value = null
}
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          Roles
        </h1>
        <p class="text-muted">
          Define roles and the permissions they grant.
        </p>
      </div>
      <UButton
        v-if="canManage"
        label="New role"
        icon="i-lucide-plus"
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

    <div v-if="roles.status.value === 'pending'" class="flex flex-col gap-2">
      <USkeleton v-for="i in 3" :key="i" class="h-20 w-full" />
    </div>

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="role in roles.data.value?.data"
        :key="role.id"
        class="flex items-center gap-3 rounded-lg border border-default bg-elevated/50 px-4 py-3"
      >
        <div class="min-w-0 flex-1">
          <p class="flex items-center gap-2 text-default">
            <span class="font-medium">{{ role.name }}</span>
            <UBadge v-if="role.isSystem" label="System" color="neutral" variant="subtle" size="sm" />
            <UBadge :label="`${role.userCount} user${role.userCount === 1 ? '' : 's'}`" variant="subtle" size="sm" />
          </p>
          <p v-if="role.description" class="text-sm text-muted">
            {{ role.description }}
          </p>
          <p class="mt-1 flex flex-wrap gap-1">
            <UBadge
              v-for="permission in role.permissions"
              :key="permission"
              :label="permission"
              color="primary"
              variant="soft"
              size="sm"
            />
            <span v-if="!role.permissions.length" class="text-sm text-dimmed">No permissions</span>
          </p>
        </div>
        <template v-if="canManage">
          <UButton
            :aria-label="`Edit ${role.name}`"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="pending"
            @click="openEdit(role)"
          />
          <UButton
            v-if="!role.isSystem"
            :aria-label="`Delete ${role.name}`"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="sm"
            :disabled="pending || role.userCount > 0"
            @click="deleteTarget = role"
          />
        </template>
      </li>
    </ul>

    <UModal
      :open="formOpen"
      :title="creating ? 'New role' : `Edit ${editing?.name}`"
      :description="permissionsLocked ? 'The super admin role always has every permission.' : 'Pick the permissions this role grants.'"
      @update:open="closeForm"
    >
      <template #body>
        <form id="role-form" class="flex flex-col gap-4" @submit.prevent="save">
          <UFormField label="Name">
            <UInput
              v-model="form.name"
              name="role-name"
              :disabled="!creating && editing?.isSystem"
              maxlength="50"
              :required="creating"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Description">
            <UInput v-model="form.description" name="role-description" maxlength="255" class="w-full" />
          </UFormField>
          <fieldset v-if="!permissionsLocked" class="flex flex-col gap-3">
            <div v-for="group in catalog.data.value?.data" :key="group.group">
              <p class="mb-1 text-sm font-medium text-highlighted">
                {{ group.group }}
              </p>
              <div class="flex flex-col gap-1">
                <UCheckbox
                  v-for="permission in group.permissions"
                  :key="permission.value"
                  :label="permission.label"
                  :description="permission.description"
                  :model-value="form.permissions.includes(permission.value)"
                  @update:model-value="togglePermission(permission.value, $event === true)"
                />
              </div>
            </div>
          </fieldset>
        </form>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="closeForm" />
          <UButton type="submit" form="role-form" label="Save" :disabled="pending" />
        </div>
      </template>
    </UModal>

    <UModal
      :open="!!deleteTarget"
      title="Delete role"
      :description="`This permanently deletes the ${deleteTarget?.name} role.`"
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
