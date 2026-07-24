<script setup lang="ts">
import type { AbilityRule, UpdateRole } from '@monorepo-fastify-vue/api-client'
import { useQuery } from '@pinia/colada'
import { computed, reactive, ref, watch } from 'vue'

import { abilityRulesQuery, subject, useAuthorization } from '@/features/permissions'
import { useRoleMutations } from '@/features/roles/mutations'
import { roleQuery } from '@/features/roles/queries'

const props = defineProps<{ roleId: number }>()

const role = useQuery(() => roleQuery(props.roleId))
const abilityRules = useQuery(abilityRulesQuery)
const { update: updateMutation, replaceAbilityRules: replaceMutation } = useRoleMutations()
const { can } = useAuthorization()

const state = reactive({ name: '', description: '', isActive: true })
const selectedIds = ref(new Set<number>())

watch(role.data, (value) => {
  if (!value)
    return
  state.name = value.name ?? ''
  state.description = value.description ?? ''
  state.isActive = value.isActive ?? false
  selectedIds.value = new Set((value.abilityRules ?? []).map(rule => rule.id))
}, { immediate: true })

const rulesBySubject = computed(() => {
  const groups = new Map<string, AbilityRule[]>()
  for (const rule of abilityRules.data.value ?? []) {
    const group = groups.get(rule.subject) ?? []
    group.push(rule)
    groups.set(rule.subject, group)
  }
  return [...groups.entries()]
})

const pending = computed(() => [updateMutation, replaceMutation]
  .some(mutation => mutation.asyncStatus.value === 'loading'))
const error = computed(() => role.error.value
  ?? abilityRules.error.value
  ?? updateMutation.error.value
  ?? replaceMutation.error.value)

const canEdit = computed(() => role.data.value ? can('update', subject('Role', role.data.value)) : false)
function canEditField(field: 'name' | 'description' | 'isActive') {
  return role.data.value ? can('update', subject('Role', role.data.value), field) : false
}
const canAssign = computed(() => can('manage', 'all'))

function toggleRule(id: number, checked: boolean) {
  const next = new Set(selectedIds.value)
  if (checked)
    next.add(id)
  else
    next.delete(id)
  selectedIds.value = next
}

async function save() {
  const abilityRuleIds = [...selectedIds.value]
  try {
    if (canEdit.value) {
      const body: UpdateRole & { roleId: number } = { roleId: props.roleId }
      if (canEditField('name'))
        body.name = state.name.trim()
      if (canEditField('description'))
        body.description = state.description.trim() || null
      if (canEditField('isActive'))
        body.isActive = state.isActive
      if (Object.keys(body).length > 1)
        await updateMutation.mutateAsync(body)
    }
    if (canAssign.value) {
      await replaceMutation.mutateAsync({
        roleId: props.roleId,
        abilityRuleIds
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
          <UInput v-model="state.name" maxlength="100" required :disabled="!canEditField('name')" class="w-full" />
        </UFormField>
        <UFormField name="description" label="Description">
          <UInput v-model="state.description" maxlength="500" :disabled="!canEditField('description')" class="w-full" />
        </UFormField>
        <UFormField name="isActive">
          <UCheckbox v-model="state.isActive" label="Active" :disabled="!canEditField('isActive')" />
        </UFormField>

        <div class="flex flex-col gap-4">
          <h2 class="text-lg font-semibold text-highlighted">
            Ability rules
          </h2>
          <div
            v-for="[ruleSubject, group] in rulesBySubject"
            :key="ruleSubject"
            class="rounded-lg border border-default bg-elevated/50 p-4"
          >
            <h3 class="mb-2 font-medium capitalize text-default">
              {{ ruleSubject }}
            </h3>
            <div class="flex flex-col gap-2">
              <UCheckbox
                v-for="ruleItem in group"
                :key="ruleItem.id"
                :model-value="selectedIds.has(ruleItem.id)"
                :label="`${ruleItem.effect === 'deny' ? 'Deny' : 'Allow'} ${ruleItem.action} ${ruleItem.subject}`"
                :description="[ruleItem.description, ruleItem.fields?.length ? `Fields: ${ruleItem.fields.join(', ')}` : null, ruleItem.resourceConditions ? `When: ${JSON.stringify(ruleItem.resourceConditions)}` : null].filter(Boolean).join(' · ')"
                :disabled="!canAssign"
                @update:model-value="toggleRule(ruleItem.id, $event === true)"
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
