<script setup lang="ts">
import type { AbilityAction, AbilitySubject } from '@monorepo-fastify-vue/api-client'
import { computed } from 'vue'

import { useAuthorization } from '@/features/permissions/composables/use-authorization'

const props = withDefaults(defineProps<{
  action: AbilityAction
  subject: AbilitySubject | object
  field?: string
}>(), {
  field: undefined
})

const authorization = useAuthorization()

const allowed = computed(() => authorization.can(props.action, props.subject, props.field))
</script>

<template>
  <slot v-if="allowed" />
  <slot v-else name="fallback" />
</template>
