<script setup lang="ts">
import type { Permission } from '@monorepo-fastify-vue/api-client'
import { useQuery } from '@pinia/colada'
import { computed, reactive, ref, watch } from 'vue'

import { permissionsQuery, useAuthorization } from '@/features/permissions'
import { useRoleMutations } from '@/features/roles/mutations'
import { roleQuery } from '@/features/roles/queries'

const props = defineProps<{ roleId: number }>()

const role = useQuery(() => roleQuery(props.roleId))
const permissions = useQuery(permissionsQuery)
const { update: updateMutation, replacePermissions: replaceMutation } = useRoleMutations()
const { can } = useAuthorization()

const state = reactive({ name: '', description: '', isActive: true })
const selectedIds = ref(new Set<number>())

watch(role.data, (value) => {
  if (!value)
    return
  state.name = value.name
  state.description = value.description ?? ''
  state.isActive = value.isActive
  selectedIds.value = new Set(value.permissions.map(permission => permission.id))
}, { immediate: true })

const permissionsByResource = computed(() => {
  const groups = new Map<string, Permission[]>()
  for (const permission of permissions.data.value ?? []) {
    const group = groups.get(permission.resource) ?? []
    group.push(permission)
    groups.set(permission.resource, group)
  }
  return [...groups.entries()]
})

const pending = computed(() => [updateMutation, replaceMutation]
  .some(mutation => mutation.asyncStatus.value === 'loading'))
const error = computed(() => role.error.value
  ?? permissions.error.value
  ?? updateMutation.error.value
  ?? replaceMutation.error.value)

const canEdit = computed(() => can('update', 'roles'))
const canAssign = computed(() => can('assign_permissions', 'roles'))

function togglePermission(id: number, checked: boolean) {
  const next = new Set(selectedIds.value)
  if (checked)
    next.add(id)
  else
    next.delete(id)
  selectedIds.value = next
}

async function save() {
  const permissionIds = [...selectedIds.value]
  try {
    if (canEdit.value) {
      await updateMutation.mutateAsync({
        roleId: props.roleId,
        name: state.name.trim(),
        description: state.description.trim() || null,
        isActive: state.isActive
      })
    }
    if (canAssign.value) {
      await replaceMutation.mutateAsync({
        roleId: props.roleId,
        permissionIds
      })
    }
  }
  catch {
    // surfaced through the mutation error state rendered above
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6">
    <div class="flex items-center gap-3">
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        aria-label="Back to roles"
        :to="{ name: 'admin-roles' }"
      />
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ role.data.value?.name ?? 'Role' }}
        </h1>
        <p class="text-muted">
          {{ role.data.value?.slug }}
          <UBadge v-if="role.data.value?.isSystem" color="neutral" variant="subtle" label="System" class="ml-2" />
        </p>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error.message"
    />

    <div v-if="role.status.value === 'pending'" class="flex flex-col gap-2">
      <USkeleton v-for="i in 4" :key="i" class="h-14 w-full" />
    </div>

    <template v-else-if="role.data.value">
      <UForm :state="state" class="flex flex-col gap-4" novalidate @submit.prevent="save">
        <UFormField name="name" label="Name">
          <UInput v-model="state.name" maxlength="100" required :disabled="!canEdit" class="w-full" />
        </UFormField>
        <UFormField name="description" label="Description">
          <UInput v-model="state.description" maxlength="500" :disabled="!canEdit" class="w-full" />
        </UFormField>
        <UFormField name="isActive">
          <UCheckbox v-model="state.isActive" label="Active" :disabled="!canEdit" />
        </UFormField>

        <div class="flex flex-col gap-4">
          <h2 class="text-lg font-semibold text-highlighted">
            Permissions
          </h2>
          <div
            v-for="[resource, group] in permissionsByResource"
            :key="resource"
            class="rounded-lg border border-default bg-elevated/50 p-4"
          >
            <h3 class="mb-2 font-medium capitalize text-default">
              {{ resource }}
            </h3>
            <div class="flex flex-col gap-2">
              <UCheckbox
                v-for="permission in group"
                :key="permission.id"
                :model-value="selectedIds.has(permission.id)"
                :label="permission.key"
                :description="permission.description ?? undefined"
                :disabled="!canAssign"
                @update:model-value="togglePermission(permission.id, $event === true)"
              />
            </div>
          </div>
        </div>

        <div>
          <UButton
            type="submit"
            label="Save"
            :disabled="pending || (!canEdit && !canAssign)"
            :loading="pending"
          />
        </div>
      </UForm>
    </template>
  </div>
</template>
