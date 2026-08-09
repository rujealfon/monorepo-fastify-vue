<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

withDefaults(defineProps<{
  brandHref: string
  brandLabel?: string
  links: NavigationMenuItem[]
}>(), {
  brandLabel: 'Starter Template'
})
</script>

<template>
  <UHeader :to="brandHref" :ui="{ root: 'border-b border-default' }">
    <template #title>
      <UIcon name="i-lucide-check-check" class="size-6 text-primary" />
      {{ brandLabel }}
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
