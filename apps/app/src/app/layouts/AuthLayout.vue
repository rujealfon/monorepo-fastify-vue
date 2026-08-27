<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { AppHeader } from '@monorepo-fastify-vue/ui'
import { RouterView, useRoute } from 'vue-router'

import { webUrl } from '@/shared/web-url'

const route = useRoute()

// Home and About live on the public web site, not app — see apps/web.
const links: NavigationMenuItem[] = [
  { label: 'Home', to: webUrl, icon: 'i-lucide-house' },
  { label: 'About', to: `${webUrl}/about`, icon: 'i-lucide-info' }
]
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-default">
    <AppHeader :brand-href="webUrl" :links="links">
      <template #right>
        <UButton v-if="route.path !== '/login'" to="/login" color="neutral" variant="ghost" label="Login" />
        <UButton v-if="route.path !== '/register'" to="/register" color="primary" label="Register" />
      </template>
    </AppHeader>

    <UMain class="flex flex-1 items-center justify-center">
      <UContainer class="flex flex-col items-center gap-6 py-10">
        <RouterView />
      </UContainer>
    </UMain>
  </div>
</template>
