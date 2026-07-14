<script setup lang="ts">
import type { PolicyExpression } from '@monorepo-fastify-vue/api-client'
import { computed } from 'vue'

defineOptions({ name: 'PolicyExpressionBuilder' })

const props = defineProps<{
  modelValue: PolicyExpression
  fields: PolicyExpression extends { field: infer Field } ? Field[] : string[]
  removable?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [value: PolicyExpression]
  'remove': []
}>()

type Field = Extract<PolicyExpression, { type: 'compare' }>['field']
type Compare = Extract<PolicyExpression, { type: 'compare' }>

const typeItems = [
  { label: 'All', value: 'all' },
  { label: 'Any', value: 'any' },
  { label: 'Not', value: 'not' },
  { label: 'Compare', value: 'compare' }
]
const fieldItems = computed(() => props.fields.map(field => ({ label: field, value: field })))
const compare = computed(() => props.modelValue.type === 'compare' ? props.modelValue : undefined)
const operatorItems = computed(() => {
  const field = compare.value?.field
  if (field === 'actor.roles')
    return [{ label: 'contains', value: 'contains' }]
  const items = ['eq', 'neq', 'in', 'notIn']
  if (field && !['task.id', 'task.done'].includes(field))
    items.push('contains', 'startsWith', 'endsWith')
  return items.map(value => ({ label: value, value }))
})

function defaultCompare(): Compare {
  return { type: 'compare', field: props.fields[0] as Field, operator: 'eq', value: { type: 'literal', value: '' } }
}

function setType(value: unknown) {
  if (value === 'compare')
    emit('update:modelValue', defaultCompare())
  else if (value === 'not')
    emit('update:modelValue', { type: 'not', child: defaultCompare() })
  else if (value === 'all' || value === 'any')
    emit('update:modelValue', { type: value, children: [defaultCompare()] })
}

function updateCompare(changes: Partial<Compare>) {
  if (compare.value)
    emit('update:modelValue', { ...compare.value, ...changes })
}

function setField(value: unknown) {
  if (typeof value !== 'string')
    return
  const field = value as Field
  const operator = field === 'actor.roles' ? 'contains' : 'eq'
  updateCompare({ field, operator, value: { type: 'literal', value: field === 'task.done' ? false : field === 'task.id' ? 0 : '' } })
}

function setOperator(value: unknown) {
  if (typeof value !== 'string' || !compare.value)
    return
  const list = value === 'in' || value === 'notIn'
  updateCompare({ operator: value as Compare['operator'], value: { type: 'literal', value: list ? [] : '' } })
}

function setValueType(value: unknown) {
  if (!compare.value)
    return
  updateCompare({ value: value === 'field'
    ? { type: 'field', field: props.fields[0] as Field }
    : { type: 'literal', value: compare.value.field === 'task.done' ? false : '' } })
}

function setLiteral(value: unknown) {
  if (!compare.value)
    return
  let parsed = value
  if (compare.value.operator === 'in' || compare.value.operator === 'notIn') {
    parsed = String(value).split(',').map(item => item.trim()).filter(Boolean)
    if (compare.value.field === 'task.id')
      parsed = (parsed as string[]).map(Number)
  }
  else if (compare.value.field === 'task.id') {
    parsed = Number(value)
  }
  else if (compare.value.field === 'task.done') {
    parsed = value === true || value === 'true'
  }
  updateCompare({ value: { type: 'literal', value: parsed } })
}

function literalText() {
  const value = compare.value?.value.type === 'literal' ? compare.value.value.value : ''
  return Array.isArray(value) ? value.join(', ') : String(value ?? '')
}

function updateChild(index: number, child: PolicyExpression) {
  if (!('children' in props.modelValue))
    return
  const children = [...props.modelValue.children]
  children[index] = child
  emit('update:modelValue', { ...props.modelValue, children })
}

function removeChild(index: number) {
  if ('children' in props.modelValue && props.modelValue.children.length > 1)
    emit('update:modelValue', { ...props.modelValue, children: props.modelValue.children.filter((_, childIndex) => childIndex !== index) })
}

function addChild() {
  if ('children' in props.modelValue && props.modelValue.children.length < 10)
    emit('update:modelValue', { ...props.modelValue, children: [...props.modelValue.children, defaultCompare()] })
}
</script>

<template>
  <div class="space-y-2 rounded-md border border-default bg-elevated/40 p-3">
    <div class="flex items-center gap-2">
      <USelect
        :model-value="modelValue.type"
        :items="typeItems"
        value-key="value"
        aria-label="Expression type"
        class="w-28"
        @update:model-value="setType"
      />
      <UButton
        v-if="removable"
        icon="i-lucide-x"
        color="error"
        variant="ghost"
        size="xs"
        aria-label="Remove expression"
        @click="emit('remove')"
      />
    </div>

    <template v-if="modelValue.type === 'all' || modelValue.type === 'any'">
      <PolicyExpressionBuilder
        v-for="(child, index) in modelValue.children"
        :key="index"
        :model-value="child"
        :fields="fields"
        :removable="modelValue.children.length > 1"
        @update:model-value="updateChild(index, $event)"
        @remove="removeChild(index)"
      />
      <UButton label="Add expression" icon="i-lucide-plus" color="neutral" variant="soft" size="xs" @click="addChild" />
    </template>

    <PolicyExpressionBuilder
      v-else-if="modelValue.type === 'not'"
      :model-value="modelValue.child"
      :fields="fields"
      @update:model-value="emit('update:modelValue', { type: 'not', child: $event })"
    />

    <div v-else-if="compare" class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <USelect :model-value="compare.field" :items="fieldItems" value-key="value" aria-label="Policy field" @update:model-value="setField" />
      <USelect :model-value="compare.operator" :items="operatorItems" value-key="value" aria-label="Policy operator" @update:model-value="setOperator" />
      <USelect
        :model-value="compare.value.type"
        :items="[{ label: 'Literal', value: 'literal' }, { label: 'Field', value: 'field' }]"
        value-key="value"
        aria-label="Comparison value type"
        @update:model-value="setValueType"
      />
      <USelect
        v-if="compare.value.type === 'field'"
        :model-value="compare.value.field"
        :items="fieldItems"
        value-key="value"
        aria-label="Comparison field"
        @update:model-value="updateCompare({ value: { type: 'field', field: $event as Field } })"
      />
      <USelect
        v-else-if="compare.field === 'task.done' && !['in', 'notIn'].includes(compare.operator)"
        :model-value="String(compare.value.value)"
        :items="[{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }]"
        value-key="value"
        aria-label="Literal value"
        @update:model-value="setLiteral"
      />
      <UInput
        v-else
        :model-value="literalText()"
        :type="compare.field === 'task.id' && !['in', 'notIn'].includes(compare.operator) ? 'number' : 'text'"
        :placeholder="['in', 'notIn'].includes(compare.operator) ? 'comma-separated values' : 'value'"
        aria-label="Literal value"
        @update:model-value="setLiteral"
      />
    </div>
  </div>
</template>
