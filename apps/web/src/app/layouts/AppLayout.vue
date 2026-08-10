<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { AppHeader } from '@monorepo-fastify-vue/ui'
import { useToast } from '@nuxt/ui/composables'
import { useQuery } from '@pinia/colada'
import { computed } from 'vue'
import { RouterView, useRouter } from 'vue-router'

import { useAuthMutations } from '@/features/auth'
import { profileQuery } from '@/features/profile'
import { api } from '@/shared/api/client'
import { siteUrl } from '@/shared/site-url'

const router = useRouter()
const { logout } = useAuthMutations()
const profile = useQuery(profileQuery)
const toast = useToast()

// site is a separate origin with no shared cookie domain (see AGENTS.md/README
// on *.vercel.app deployments), so it can't see this session on its own. Mint
// a short-lived, one-time handoff token and hand it to site via the URL so it
// can exchange it for its own session — falling back to a plain navigation
// (site just shows logged out) if minting fails for any reason.
//
// Once web and site share a registrable domain and COOKIE_DOMAIN is set on the
// API, the cookie is already visible to site directly, so the API's own
// mintHandoff handler skips minting and returns { token: null } instead —
// COOKIE_DOMAIN is the single source of truth for this, not a separate flag
// here, so this same code path stays correct in both deployments unchanged.
async function goToSite(path: string) {
  const url = `${siteUrl}${path}`
  try {
    const { data } = await api.POST('/api/v1/auth/handoff')
    window.location.href = data?.token ? `${url}?token=${data.token}` : url
  }
  catch {
    window.location.href = url
  }
}

// The brand logo (below, brand-href) still links straight to siteUrl without a
// handoff token -- AppHeader has no click-interception hook for it, and that's
// fine since this "Home" item is the primary, discoverable way back to site.
const links: NavigationMenuItem[] = [
  { label: 'Home', icon: 'i-lucide-house', onSelect: () => goToSite('/') },
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
