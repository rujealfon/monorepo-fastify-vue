<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

import { computed } from 'vue'

import AppHeader from './AppHeader.vue'
import GuestActions from './GuestActions.vue'

const props = withDefaults(defineProps<{
  brandHref: string
  brandLabel?: string
  links: NavigationMenuItem[]
  loginHref: string
  onLogout: () => Promise<void>
  profileHref: string
  registerHref: string
  userEmail?: string | null
}>(), {
  brandLabel: 'Starter Template',
  userEmail: null
})

const emit = defineEmits<{ logoutError: [error: unknown] }>()

async function logout() {
  try {
    await props.onLogout()
  }
  catch (error) {
    emit('logoutError', error)
  }
}

const userMenu = computed(() => [[
  { label: props.userEmail ?? '', type: 'label' as const },
  { label: 'Profile', icon: 'i-lucide-user', to: props.profileHref }
], [
  { label: 'Logout', icon: 'i-lucide-log-out', onSelect: logout }
]])
</script>

<template>
  <AppHeader :brand-href="brandHref" :brand-label="brandLabel" :links="links">
    <template #right>
      <template v-if="userEmail">
        <UDropdownMenu :items="userMenu">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-user-circle"
            :label="userEmail"
            class="max-w-48"
            :ui="{ label: 'truncate' }"
          />
        </UDropdownMenu>
      </template>
      <template v-else>
        <GuestActions :login-href="loginHref" :register-href="registerHref" />
      </template>
    </template>
  </AppHeader>
</template>
