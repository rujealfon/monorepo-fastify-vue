<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { AppHeader } from '@monorepo-fastify-vue/ui'
import { useToast } from '@nuxt/ui/composables'
import { useQuery } from '@pinia/colada'
import { computed } from 'vue'
import { RouterView, useRouter } from 'vue-router'

import { useAuthMutations } from '@/features/auth'
import { profileQuery } from '@/features/profile'
import { siteUrl } from '@/shared/site-url'

const router = useRouter()
const { logout } = useAuthMutations()
const profile = useQuery(profileQuery)
const toast = useToast()

const links: NavigationMenuItem[] = [
  { label: 'Health', to: '/health', icon: 'i-lucide-activity' }
]

async function signOut() {
  try {
    await logout.mutateAsync()
    await router.push('/login')
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
  { label: profile.data.value?.email ?? '', type: 'label' as const },
  { label: 'Profile', icon: 'i-lucide-user', to: '/profile' }
], [
  { label: 'Logout', icon: 'i-lucide-log-out', onSelect: signOut }
]])
</script>

<template>
  <div class="min-h-dvh bg-default">
    <AppHeader :brand-href="siteUrl" :links="links">
      <template #right>
        <template v-if="profile.data.value">
          <UDropdownMenu :items="userMenu">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-user-circle"
              :label="profile.data.value.email"
              class="max-w-48"
              :ui="{ label: 'truncate' }"
            />
          </UDropdownMenu>
        </template>
        <template v-else>
          <UButton to="/login" color="neutral" variant="ghost" label="Login" />
          <UButton to="/register" color="primary" label="Register" />
        </template>
      </template>
    </AppHeader>

    <UMain>
      <UContainer class="py-10">
        <RouterView />
      </UContainer>
    </UMain>
  </div>
</template>
