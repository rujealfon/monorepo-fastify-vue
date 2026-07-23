<script setup lang="ts">
import { computed } from 'vue'

import { useAuthorization } from '@/features/permissions/composables/use-authorization'

const props = defineProps<{
  action: string
  subject: string
  resource?: Record<string, unknown>
}>()

const authorization = useAuthorization()
const allowed = computed(() => authorization.can(props.action, props.subject, props.resource))
</script>

<template>
  <slot v-if="allowed" />
  <slot v-else name="fallback" />
</template>
