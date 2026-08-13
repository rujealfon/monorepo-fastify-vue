<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const redirect = computed(() => {
  const value = route.query.redirect
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/profile'
})

async function retry() {
  await router.replace(redirect.value)
}
</script>

<template>
  <main class="grid min-h-dvh place-items-center bg-default px-6 py-12">
    <UCard class="w-full max-w-lg" :ui="{ body: 'flex flex-col gap-6' }">
      <UAlert
        color="error"
        variant="subtle"
        icon="i-lucide-server-off"
        title="Service unavailable"
        description="We couldn't verify your session. The service may be temporarily offline."
      />

      <UButton
        label="Try again"
        icon="i-lucide-refresh-cw"
        class="self-start"
        @click="retry"
      />
    </UCard>
  </main>
</template>
