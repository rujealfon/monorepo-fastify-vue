<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useToast } from '@nuxt/ui/composables'
import { useQuery } from '@pinia/colada'
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'

import { sessionQuery, useAuthMutations } from '@/features/auth'

const router = useRouter()
const session = useQuery(sessionQuery)
const { logout } = useAuthMutations()
const toast = useToast()

const baseLinks: NavigationMenuItem[] = [
  { label: 'Home', to: '/', icon: 'i-lucide-house' },
  { label: 'Tasks', to: '/tasks', icon: 'i-lucide-list-checks' },
  { label: 'Health', to: '/health', icon: 'i-lucide-activity' },
  { label: 'About', to: '/about', icon: 'i-lucide-info' }
]

const links = computed<NavigationMenuItem[]>(() => [
  ...baseLinks,
  ...(session.data.value?.permissions.includes('users.read')
    ? [{ label: 'Users', to: '/admin/users', icon: 'i-lucide-users' }]
    : []),
  ...(session.data.value?.permissions.includes('roles.read')
    ? [{ label: 'Roles', to: '/admin/roles', icon: 'i-lucide-shield-check' }]
    : []),
  ...(session.data.value?.permissions.includes('audit.read')
    ? [{ label: 'Audit', to: '/admin/audit', icon: 'i-lucide-scroll-text' }]
    : [])
])

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
  { label: session.data.value?.email ?? '', type: 'label' as const },
  { label: 'Profile', icon: 'i-lucide-user', to: '/profile' }
], [
  { label: 'Logout', icon: 'i-lucide-log-out', onSelect: signOut }
]])
</script>

<template>
  <div class="min-h-dvh bg-default">
    <UHeader :ui="{ root: 'border-b border-default' }">
      <template #title>
        <RouterLink to="/" class="flex items-center gap-2 font-semibold text-highlighted">
          <UIcon name="i-lucide-check-check" class="size-6 text-primary" />
          Task Manager
        </RouterLink>
      </template>

      <UNavigationMenu :items="links" variant="link" />

      <template #right>
        <UColorModeButton />
        <template v-if="session.data.value">
          <UDropdownMenu :items="userMenu">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-user-circle"
              :label="session.data.value.email"
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

      <template #body>
        <UNavigationMenu :items="links" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>

    <UMain>
      <UContainer class="py-10">
        <RouterView />
      </UContainer>
    </UMain>
  </div>
</template>
