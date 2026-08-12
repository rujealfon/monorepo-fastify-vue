<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { SessionHeader } from '@monorepo-fastify-vue/ui'

const { public: { webUrl } } = useRuntimeConfig()
const { user, logout } = useSession()
const toast = useToast()

const links: NavigationMenuItem[] = [
  { label: 'Home', to: '/', icon: 'i-lucide-house' },
  { label: 'About', to: '/about', icon: 'i-lucide-info' }
]

async function signOut() {
  await logout()
}

function notifyLogoutError() {
  toast.add({
    title: 'Could not log out.',
    color: 'error',
    icon: 'i-lucide-triangle-alert'
  })
}
</script>

<template>
  <div class="min-h-dvh bg-default">
    <SessionHeader
      brand-href="/"
      :links="links"
      :login-href="`${webUrl}/login`"
      :register-href="`${webUrl}/register`"
      :profile-href="`${webUrl}/profile`"
      :user-email="user?.email"
      :on-logout="signOut"
      @logout-error="notifyLogoutError"
    />

    <UMain>
      <UContainer class="py-10">
        <slot />
      </UContainer>
    </UMain>
  </div>
</template>
