<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-dvh bg-default">
    <UHeader :ui="{ root: 'border-b border-default' }">
      <template #title>
        <RouterLink to="/" class="flex items-center gap-2 font-semibold text-highlighted">
          <UIcon name="i-lucide-blocks" class="size-6 text-primary" />
          Fastify + Vue Starter
        </RouterLink>
      </template>

      <template #right>
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <UContainer class="py-10">
        <RouterView />
      </UContainer>
    </UMain>
  </div>
</template>
