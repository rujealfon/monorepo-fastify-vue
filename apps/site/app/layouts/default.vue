<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { AppHeader } from '@monorepo-fastify-vue/ui'

const { public: { webUrl } } = useRuntimeConfig()

const links: NavigationMenuItem[] = [
  { label: 'Home', to: '/', icon: 'i-lucide-house' },
  { label: 'About', to: '/about', icon: 'i-lucide-info' }
]
</script>

<template>
  <div class="min-h-dvh bg-default">
    <AppHeader brand-href="/" :links="links">
      <template #right>
        <UButton :to="`${webUrl}/login`" color="neutral" variant="ghost" label="Login" />
        <UButton :to="`${webUrl}/register`" color="primary" label="Register" />
      </template>
    </AppHeader>

    <UMain>
      <UContainer class="py-10">
        <slot />
      </UContainer>
    </UMain>
  </div>
</template>
