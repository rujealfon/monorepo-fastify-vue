<script setup lang="ts">
import type { CreateRole, Permission, PolicyExpression, Role } from '@monorepo-fastify-vue/api-client'
import type { TableColumn } from '@nuxt/ui'
import { useQuery } from '@pinia/colada'
import { computed, reactive, ref } from 'vue'

import PolicyExpressionBuilder from '@/features/admin/components/PolicyExpressionBuilder.vue'
import { useAccessMutations } from '@/features/admin/mutations'
import { permissionsQuery, rolesQuery } from '@/features/admin/queries'
import { sessionQuery } from '@/features/auth'

const ownCondition: PolicyExpression = {
  type: 'compare',
  field: 'task.ownerId',
  operator: 'eq',
  value: { type: 'field', field: 'actor.id' }
}
const customCondition: PolicyExpression = {
  type: 'compare',
  field: 'task.name',
  operator: 'contains',
  value: { type: 'literal', value: '' }
}

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
const state = reactive({ name: '', description: '', permissionPolicies: [] as CreateRole['permissionPolicies'] })

const columns: TableColumn<Role>[] = [
  { accessorKey: 'name', header: 'Role' },
  { id: 'policies', header: 'Policies' },
  { id: 'actions' }
]
const error = computed(() => roles.error.value
  ?? permissions.error.value
  ?? createRole.error.value
  ?? updateRole.error.value
  ?? deleteRole.error.value)
const pending = computed(() => [createRole, updateRole, deleteRole].some(mutation => mutation.asyncStatus.value === 'loading'))

function openCreate() {
  editing.value = undefined
  Object.assign(state, { name: '', description: '', permissionPolicies: [] })
  editOpen.value = true
}

function openEdit(role: Role) {
  editing.value = role
  Object.assign(state, {
    name: role.name,
    description: role.description ?? '',
    permissionPolicies: role.policies.map(policy => ({
      permissionId: policy.permissionId,
      effect: policy.effect,
      condition: policy.condition
    }))
  })
  editOpen.value = true
}

async function save() {
  try {
    const body = {
      name: state.name,
      description: state.description || null,
      permissionPolicies: state.permissionPolicies
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

function policyFor(permissionId: string, effect: 'allow' | 'deny') {
  return state.permissionPolicies.find(policy => policy.permissionId === permissionId && policy.effect === effect)
}

function togglePolicy(permission: Permission, effect: 'allow' | 'deny', selected: boolean | 'indeterminate') {
  const index = state.permissionPolicies.findIndex(policy => policy.permissionId === permission.id && policy.effect === effect)
  if (selected && index === -1)
    state.permissionPolicies.push({ permissionId: permission.id, effect, condition: null })
  else if (!selected && index !== -1)
    state.permissionPolicies.splice(index, 1)
}

function presetFor(permissionId: string, effect: 'allow' | 'deny') {
  const condition = policyFor(permissionId, effect)?.condition
  if (condition === null)
    return 'all'
  return JSON.stringify(condition) === JSON.stringify(ownCondition) ? 'own' : 'custom'
}

function setPreset(permissionId: string, effect: 'allow' | 'deny', preset: unknown) {
  if (preset === 'all')
    setCondition(permissionId, effect, null)
  else if (preset === 'own')
    setCondition(permissionId, effect, structuredClone(ownCondition))
  else if (preset === 'custom')
    setCondition(permissionId, effect, structuredClone(customCondition))
}

function setCondition(permissionId: string, effect: 'allow' | 'deny', condition: PolicyExpression | null) {
  const policy = policyFor(permissionId, effect)
  if (policy)
    policy.condition = condition
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
          Compose allow and deny policies. Matching denies always win.
        </p>
      </div>
      <UButton
        v-if="granted.includes('roles.create') && granted.includes('permissions.read')"
        icon="i-lucide-plus"
        label="Create role"
        @click="openCreate"
      />
    </div>

    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :title="error.message" />

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

      <template #policies-cell="{ row }">
        <div v-if="row.original.name === 'admin'" class="text-sm text-muted">
          Full access (protected)
        </div>
        <div v-else class="flex max-w-xl flex-wrap gap-1">
          <UBadge
            v-for="policy in row.original.policies"
            :key="policy.id"
            :label="`${policy.effect}: ${policy.permission.key}${policy.condition ? ' (conditional)' : ''}`"
            :color="policy.effect === 'deny' ? 'error' : 'success'"
            variant="subtle"
          />
          <span v-if="!row.original.policies.length" class="text-sm text-muted">No policies</span>
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

    <UModal v-model:open="editOpen" :title="editing ? `Edit ${editing.name}` : 'Create role'" description="Configure one allow and one deny policy per permission." :ui="{ content: 'sm:max-w-5xl' }">
      <template #body>
        <form id="role-form" class="space-y-4" @submit.prevent="save">
          <UFormField label="Name" name="name" required>
            <UInput v-model="state.name" class="w-full" placeholder="project-manager" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxlength="64" required :disabled="editing?.system" />
          </UFormField>
          <UFormField label="Description" name="description">
            <UInput v-model="state.description" class="w-full" maxlength="255" />
          </UFormField>
          <UFormField label="Policies" name="permissionPolicies">
            <div class="divide-y divide-default rounded-md border border-default">
              <div v-for="permission in permissions.data.value" :key="permission.id" class="space-y-3 px-3 py-3">
                <div>
                  <p class="font-medium text-highlighted">
                    {{ permission.key }}
                  </p>
                  <p class="text-sm text-muted">
                    {{ permission.description }}
                  </p>
                </div>
                <div v-for="effect in (['allow', 'deny'] as const)" :key="effect" class="space-y-2 rounded-md bg-muted/40 p-2">
                  <div class="flex items-center gap-3">
                    <UCheckbox
                      :aria-label="`${effect} ${permission.key}`"
                      :model-value="Boolean(policyFor(permission.id, effect))"
                      @update:model-value="togglePolicy(permission, effect, $event)"
                    />
                    <span class="w-12 text-sm font-medium capitalize">{{ effect }}</span>
                    <USelect
                      v-if="permission.conditionFields.length && policyFor(permission.id, effect)"
                      :aria-label="`${effect} ${permission.key} preset`"
                      :model-value="presetFor(permission.id, effect)"
                      :items="[{ label: 'All', value: 'all' }, { label: 'Own', value: 'own' }, { label: 'Custom', value: 'custom' }]"
                      value-key="value"
                      class="w-28"
                      @update:model-value="setPreset(permission.id, effect, $event)"
                    />
                    <span v-else-if="policyFor(permission.id, effect)" class="text-sm text-muted">Unconditional</span>
                  </div>
                  <PolicyExpressionBuilder
                    v-if="policyFor(permission.id, effect)?.condition && presetFor(permission.id, effect) === 'custom'"
                    :model-value="policyFor(permission.id, effect)!.condition!"
                    :fields="permission.conditionFields"
                    @update:model-value="setCondition(permission.id, effect, $event)"
                  />
                </div>
              </div>
            </div>
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
