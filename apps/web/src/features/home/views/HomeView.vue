<script setup lang="ts">
import { useQuery } from '@pinia/colada'

import { profileQuery } from '@/features/profile'

const profile = useQuery(profileQuery)
</script>

<template>
  <UPageHero
    title="A minimal starting point for your account"
    description="A simple, fast Fastify + Vue starter template with registration, login, and a user profile."
    orientation="vertical"
    :ui="{ container: 'py-12 sm:py-16 lg:py-20' }"
  >
    <template #links>
      <UButton
        v-if="profile.data.value"
        to="/profile"
        size="lg"
        icon="i-lucide-user"
        label="Go to Profile"
      />
      <template v-else>
        <UButton to="/register" size="lg" icon="i-lucide-user-plus" label="Get started" />
        <UButton to="/login" size="lg" color="neutral" variant="outline" label="Login" />
      </template>
    </template>
  </UPageHero>

  <UPageGrid class="pb-16">
    <UPageCard
      icon="i-lucide-user"
      title="User accounts"
      description="Registration and login backed by session cookies and a Postgres database."
    />
    <UPageCard
      icon="i-lucide-shield-check"
      title="Secure by default"
      description="Session-based authentication keeps your account private."
    />
    <UPageCard
      icon="i-lucide-activity"
      title="Always available"
      description="Live health checks let you know the API is up and responding."
    />
  </UPageGrid>
</template>
