<script setup lang="ts">
import { reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { internalRedirect } from '@/features/auth/auth.utils'
import { useAuthMutations } from '@/features/auth/mutations'

const state = reactive({ email: '', password: '' })
const route = useRoute()
const router = useRouter()
const { register } = useAuthMutations()

async function submit() {
  try {
    await register.mutateAsync({ email: state.email, password: state.password })
    await router.push(internalRedirect(route.query.redirect))
  }
  catch {}
}
</script>

<template>
  <UCard class="w-full max-w-sm" :ui="{ body: 'space-y-4' }">
    <template #header>
      <div class="text-center">
        <h1 class="text-xl font-semibold text-highlighted">
          Create an account
        </h1>
        <p class="mt-1 text-sm text-muted">
          Start tracking your tasks
        </p>
      </div>
    </template>

    <UForm :state="state" class="space-y-4" @submit="submit">
      <UFormField name="email" label="Email" required>
        <UInput
          id="register-email"
          v-model="state.email"
          type="email"
          autocomplete="email"
          maxlength="254"
          placeholder="you@example.com"
          required
          class="w-full"
        />
      </UFormField>

      <UFormField name="password" label="Password" description="At least 12 characters." required>
        <UInput
          id="register-password"
          v-model="state.password"
          type="password"
          autocomplete="new-password"
          minlength="12"
          maxlength="128"
          required
          class="w-full"
        />
      </UFormField>

      <UAlert
        v-if="register.error.value"
        role="alert"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Registration failed."
        description="The email may already be in use."
      />

      <UButton type="submit" label="Create account" block :loading="register.asyncStatus.value === 'loading'" />
    </UForm>

    <template #footer>
      <p class="text-center text-sm text-muted">
        Already have an account?
        <ULink to="/login" class="font-medium text-primary">
          Login
        </ULink>
      </p>
    </template>
  </UCard>
</template>
