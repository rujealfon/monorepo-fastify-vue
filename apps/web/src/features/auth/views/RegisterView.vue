<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { internalRedirect } from '@/features/auth/auth.utils'
import { useAuthMutations } from '@/features/auth/mutations'

const email = ref('')
const password = ref('')
const route = useRoute()
const router = useRouter()
const { register } = useAuthMutations()
const pending = computed(() => register.asyncStatus.value === 'loading')

async function submit() {
  try {
    await register.mutateAsync({ email: email.value, password: password.value })
    await router.push(internalRedirect(route.query.redirect))
  }
  catch {}
}
</script>

<template>
  <main>
    <h1>Register</h1>
    <form @submit.prevent="submit">
      <label for="register-email">Email
        <input id="register-email" v-model="email" type="email" autocomplete="email" maxlength="254" required>
      </label>
      <label for="register-password">Password
        <input id="register-password" v-model="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required>
      </label>
      <p v-if="register.error.value" role="alert">
        Registration failed. The email may already be in use.
      </p>
      <button :disabled="pending" type="submit">
        Create account
      </button>
    </form>
  </main>
</template>
