<script setup lang="ts">
import { computed } from 'vue'

import { useHealth } from '@/features/health/composables/useHealth'

const { status, error, loading, checkHealth } = useHealth()

const badge = computed(() => {
  if (status.value === 'unavailable')
    return { color: 'error' as const, icon: 'i-lucide-circle-x' }
  if (status.value === 'checking')
    return { color: 'neutral' as const, icon: 'i-lucide-loader-circle' }
  return { color: 'success' as const, icon: 'i-lucide-circle-check' }
})
</script>

<template>
  <div class="mx-auto flex max-w-lg flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Health
      </h1>
      <p class="text-muted">
        Live status of the API.
      </p>
    </div>

    <UCard class="items-center text-center" :ui="{ body: 'flex flex-col items-center gap-4' }">
      <UBadge :color="badge.color" variant="subtle" size="lg" :icon="badge.icon" class="capitalize">
        {{ status }}
      </UBadge>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="error"
        class="w-full text-left"
      />

      <UButton
        icon="i-lucide-refresh-cw"
        :label="loading ? 'Checking...' : 'Check again'"
        :loading="loading"
        color="neutral"
        variant="outline"
        @click="checkHealth"
      />
    </UCard>
  </div>
</template>
