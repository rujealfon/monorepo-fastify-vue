<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-6 bg-default p-6">
    <RouterLink to="/" class="flex items-center gap-2 text-lg font-semibold text-highlighted" aria-label="Home">
      <UIcon name="i-lucide-check-check" class="size-7 text-primary" />
      Task Manager
    </RouterLink>
    <RouterView />
  </div>
</template>
