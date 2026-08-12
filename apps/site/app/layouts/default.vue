<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { AppHeader } from '@monorepo-fastify-vue/ui'
import { computed } from 'vue'

const { public: { webUrl } } = useRuntimeConfig()
const { user, logout } = useSession()
const toast = useToast()

const links: NavigationMenuItem[] = [
  { label: 'Home', to: '/', icon: 'i-lucide-house' },
  { label: 'About', to: '/about', icon: 'i-lucide-info' }
]

async function signOut() {
  try {
    await logout()
  }
  catch {
    toast.add({
      title: 'Could not log out.',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    })
  }
}

const userMenu = computed(() => [[
  { label: user.value?.email ?? '', type: 'label' as const },
  { label: 'Profile', icon: 'i-lucide-user', to: `${webUrl}/profile` }
], [
  { label: 'Logout', icon: 'i-lucide-log-out', onSelect: signOut }
]])
</script>

<template>
  <div class="min-h-dvh bg-default">
    <AppHeader brand-href="/" :links="links">
      <template #right>
        <template v-if="user">
          <UDropdownMenu :items="userMenu">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-user-circle"
              :label="user.email"
              class="max-w-48"
              :ui="{ label: 'truncate' }"
            />
          </UDropdownMenu>
        </template>
        <template v-else>
          <UButton :to="`${webUrl}/login`" color="neutral" variant="ghost" label="Login" />
          <UButton :to="`${webUrl}/register`" color="primary" label="Register" />
        </template>
      </template>
    </AppHeader>

    <UMain>
      <UContainer class="py-10">
        <slot />
      </UContainer>
    </UMain>
  </div>
</template>
