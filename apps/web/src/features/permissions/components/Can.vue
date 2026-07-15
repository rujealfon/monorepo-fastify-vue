<script setup lang="ts">
import type { PermissionKey } from '@monorepo-fastify-vue/api-client'
import { computed } from 'vue'

import { useAuthorization } from '@/features/permissions/composables/use-authorization'

const props = withDefaults(defineProps<{
  permission?: PermissionKey
  permissions?: PermissionKey[]
  mode?: 'all' | 'any'
}>(), {
  permission: undefined,
  permissions: () => [],
  mode: 'all'
})

const authorization = useAuthorization()

const requiredPermissions = computed(() =>
  props.permission ? [props.permission] : props.permissions)

const allowed = computed(() => {
  if (requiredPermissions.value.length === 0)
    return true
  return props.mode === 'any'
    ? authorization.canAny(requiredPermissions.value)
    : authorization.canAll(requiredPermissions.value)
})
</script>

<template>
  <slot v-if="allowed" />
  <slot v-else name="fallback" />
</template>
