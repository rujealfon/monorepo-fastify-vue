<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { SessionHeader } from '@monorepo-fastify-vue/ui'
import { useToast } from '@nuxt/ui/composables'
import { RouterView, useRouter } from 'vue-router'

import { useSessionActions, useSessionState } from '@/features/session'
import { siteUrl } from '@/shared/site-url'

const router = useRouter()
const { logout } = useSessionActions()
const profile = useSessionState()
const toast = useToast()

const links: NavigationMenuItem[] = [
  { label: 'Health', to: '/health', icon: 'i-lucide-activity' }
]

async function signOut() {
  await logout.mutateAsync()
  await router.push('/login')
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
      :brand-href="siteUrl"
      :links="links"
      login-href="/login"
      register-href="/register"
      profile-href="/profile"
      :user-email="profile.data.value?.email"
      :on-logout="signOut"
      @logout-error="notifyLogoutError"
    />

    <UMain>
      <UContainer class="py-10">
        <RouterView />
      </UContainer>
    </UMain>
  </div>
</template>
