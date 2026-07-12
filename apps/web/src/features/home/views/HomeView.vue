<script setup lang="ts">
import { useQuery } from '@pinia/colada'

import { sessionQuery } from '@/features/auth'

const session = useQuery(sessionQuery)
</script>

<template>
  <UPageHero
    title="Track and manage your tasks in one place"
    description="A simple, fast task manager built with Fastify, Vue, and Nuxt UI."
    orientation="vertical"
    :ui="{ container: 'py-12 sm:py-16 lg:py-20' }"
  >
    <template #links>
      <UButton
        v-if="session.data.value"
        to="/tasks"
        size="lg"
        icon="i-lucide-list-checks"
        label="Go to Tasks"
      />
      <template v-else>
        <UButton to="/register" size="lg" icon="i-lucide-user-plus" label="Get started" />
        <UButton to="/login" size="lg" color="neutral" variant="outline" label="Login" />
      </template>
    </template>
  </UPageHero>

  <UPageGrid class="pb-16">
    <UPageCard
      icon="i-lucide-list-checks"
      title="Stay organized"
      description="Create, complete, and track tasks with a clean, focused list view."
    />
    <UPageCard
      icon="i-lucide-shield-check"
      title="Secure by default"
      description="Session-based authentication keeps your tasks private to your account."
    />
    <UPageCard
      icon="i-lucide-activity"
      title="Always available"
      description="Live health checks let you know the API is up and responding."
    />
  </UPageGrid>
</template>
