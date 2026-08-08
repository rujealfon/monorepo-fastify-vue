<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { AppHeader } from '@monorepo-fastify-vue/ui'
import { RouterView } from 'vue-router'

const siteUrl = import.meta.env.VITE_SITE_URL ?? 'http://localhost:8000'

// Home and About live on the public site, not web — see apps/site.
const links: NavigationMenuItem[] = [
  { label: 'Home', to: siteUrl, icon: 'i-lucide-house' },
  { label: 'About', to: `${siteUrl}/about`, icon: 'i-lucide-info' }
]
</script>

<template>
  <div class="min-h-dvh bg-default">
    <AppHeader :brand-href="siteUrl" :links="links">
      <template #right>
        <UButton to="/login" color="neutral" variant="ghost" label="Login" />
        <UButton to="/register" color="primary" label="Register" />
      </template>
    </AppHeader>

    <UMain>
      <UContainer class="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-6 py-10">
        <RouterView />
      </UContainer>
    </UMain>
  </div>
</template>
