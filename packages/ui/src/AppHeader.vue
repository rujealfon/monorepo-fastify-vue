<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

defineProps<{
  brandHref: string
  links: NavigationMenuItem[]
}>()
</script>

<template>
  <UHeader :ui="{ root: 'border-b border-default' }">
    <template #title>
      <ULink :to="brandHref" class="flex items-center gap-2 font-semibold text-highlighted">
        <UIcon name="i-lucide-check-check" class="size-6 text-primary" />
        Starter Template
      </ULink>
    </template>

    <UNavigationMenu :items="links" variant="link" />

    <template #right>
      <UColorModeButton />
      <slot name="right" />
    </template>

    <template #body>
      <UNavigationMenu :items="links" orientation="vertical" class="-mx-2.5" />
    </template>
  </UHeader>
</template>
