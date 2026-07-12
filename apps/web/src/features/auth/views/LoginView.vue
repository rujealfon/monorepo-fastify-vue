<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { internalRedirect } from '@/features/auth/auth.utils'
import { useAuthMutations } from '@/features/auth/mutations'

const email = ref('')
const password = ref('')
const route = useRoute()
const router = useRouter()
const { login } = useAuthMutations()
const pending = computed(() => login.asyncStatus.value === 'loading')

async function submit() {
  try {
    await login.mutateAsync({ email: email.value, password: password.value })
    await router.push(internalRedirect(route.query.redirect))
  }
  catch {}
}
</script>

<template>
  <main>
    <h1>Login</h1>
    <form @submit.prevent="submit">
      <label for="login-email">Email
        <input id="login-email" v-model="email" type="email" autocomplete="email" maxlength="254" required>
      </label>
      <label for="login-password">Password
        <input id="login-password" v-model="password" type="password" autocomplete="current-password" minlength="12" maxlength="128" required>
      </label>
      <p v-if="login.error.value" role="alert">
        Invalid email or password.
      </p>
      <button :disabled="pending" type="submit">
        Login
      </button>
    </form>
  </main>
</template>
