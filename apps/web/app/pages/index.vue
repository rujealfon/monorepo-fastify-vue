<script setup lang="ts">
const { public: { appUrl } } = useRuntimeConfig()
const { profile } = useProfile()
</script>

<template>
  <UPageHero
    title="A minimal starting point for your account"
    description="A simple, fast Fastify + Vue starter template with registration, login, and a user profile."
    orientation="vertical"
    :ui="{ container: 'py-12 sm:py-16 lg:py-20' }"
  >
    <template v-if="!profile" #links>
      <UButton :to="`${appUrl}/register`" size="lg" icon="i-lucide-user-plus" label="Get started" />
      <UButton :to="`${appUrl}/login`" size="lg" color="neutral" variant="outline" label="Login" />
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
