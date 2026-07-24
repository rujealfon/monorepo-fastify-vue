<script setup lang="ts">
import type { AbilityAction, AbilitySubject, CreateAbilityRule } from '@monorepo-fastify-vue/api-client'
import { useQuery } from '@pinia/colada'
import { computed, reactive, ref, watch } from 'vue'

import { useAbilityRuleMutations } from '@/features/permissions/mutations'
import { abilityRulesQuery, authorizationCatalogQuery } from '@/features/permissions/queries'

const rules = useQuery(abilityRulesQuery)
const catalog = useQuery(authorizationCatalogQuery)
const { create, remove } = useAbilityRuleMutations()
const state = reactive({
  key: '',
  description: '',
  effect: 'allow' as 'allow' | 'deny',
  action: 'read' as AbilityAction,
  subject: 'Task' as AbilitySubject,
  priority: 0,
  fields: [] as string[],
  actorConditions: '',
  resourceConditions: ''
})
const pending = computed(() => create.asyncStatus.value === 'loading' || remove.asyncStatus.value === 'loading')
const formError = ref<Error | null>(null)
const error = computed(() => formError.value ?? rules.error.value ?? catalog.error.value ?? create.error.value ?? remove.error.value)
const subjectCatalog = computed(() => catalog.data.value?.subjects.find(item => item.subject === state.subject))
const fieldItems = computed(() => state.action === 'read'
  ? subjectCatalog.value?.readableFields ?? []
  : subjectCatalog.value?.writableFields ?? [])
const parseConditions = (value: string) => value.trim() ? JSON.parse(value) as Record<string, unknown> : undefined

watch([() => state.subject, () => state.action], () => {
  state.fields = state.fields.filter(field => fieldItems.value.includes(field))
})

async function submit() {
  formError.value = null
  try {
    const body: CreateAbilityRule = {
      key: state.key.trim(),
      description: state.description.trim() || null,
      effect: state.effect,
      action: state.action,
      subject: state.subject,
      priority: state.priority,
      isActive: true,
      fields: state.fields,
      actorConditions: parseConditions(state.actorConditions),
      resourceConditions: parseConditions(state.resourceConditions)
    }
    await create.mutateAsync(body)
    Object.assign(state, { key: '', description: '', fields: [], actorConditions: '', resourceConditions: '' })
  }
  catch (error) {
    if (error instanceof SyntaxError)
      formError.value = new Error('Conditions must be valid JSON objects')
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Ability Rules
      </h1>
      <p class="text-muted">
        Compose database-backed allow and deny rules from the deployed authorization catalog.
      </p>
    </div>
    <UAlert v-if="error" color="error" variant="subtle" :title="error.message" />
    <UForm :state="state" class="grid gap-3 rounded-lg border border-default p-4 md:grid-cols-2" @submit.prevent="submit">
      <UFormField label="Key">
        <UInput v-model="state.key" required class="w-full" />
      </UFormField>
      <UFormField label="Description">
        <UInput v-model="state.description" class="w-full" />
      </UFormField>
      <UFormField label="Effect">
        <USelect v-model="state.effect" :items="['allow', 'deny']" class="w-full" />
      </UFormField>
      <UFormField label="Action">
        <USelect v-model="state.action" :items="catalog.data.value?.actions ?? []" class="w-full" />
      </UFormField>
      <UFormField label="Subject">
        <USelect v-model="state.subject" :items="catalog.data.value?.subjects.map(item => item.subject) ?? []" class="w-full" />
      </UFormField>
      <UFormField label="Priority">
        <UInput v-model.number="state.priority" type="number" class="w-full" />
      </UFormField>
      <UFormField label="Fields">
        <USelectMenu v-model="state.fields" :items="fieldItems" multiple placeholder="All available fields" class="w-full" />
      </UFormField>
      <UFormField label="Actor conditions (JSON)">
        <UTextarea v-model="state.actorConditions" class="w-full" />
      </UFormField>
      <UFormField label="Resource conditions (JSON)" class="md:col-span-2">
        <UTextarea v-model="state.resourceConditions" class="w-full" />
      </UFormField>
      <div class="md:col-span-2">
        <UButton type="submit" label="Create rule" :loading="pending" />
      </div>
    </UForm>
    <div class="flex flex-col gap-2">
      <div v-for="rule in rules.data.value" :key="rule.id" class="flex items-start gap-3 rounded-lg border border-default p-4">
        <div class="min-w-0 flex-1">
          <p class="font-medium">
            {{ rule.key }}
          </p>
          <p class="text-sm text-muted">
            {{ rule.effect }} · {{ rule.action }} · {{ rule.subject }} · priority {{ rule.priority }}
          </p>
          <p v-if="rule.resourceConditions" class="truncate text-xs text-dimmed">
            {{ JSON.stringify(rule.resourceConditions) }}
          </p>
        </div>
        <UButton v-if="!rule.isSystem" icon="i-lucide-trash-2" color="error" variant="ghost" :disabled="pending" @click="remove.mutate(rule.id)" />
      </div>
    </div>
  </div>
</template>
