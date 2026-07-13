<script setup lang="ts">
import { reactive, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { internalRedirect } from '@/features/auth/auth.utils'
import { useAuthMutations } from '@/features/auth/mutations'
import { apiFormErrors } from '@/shared/api/form-errors'

const state = reactive({ email: '', password: '' })
const form = useTemplateRef('form')
const route = useRoute()
const router = useRouter()
const { login } = useAuthMutations()

async function submit() {
  try {
    await login.mutateAsync({ email: state.email, password: state.password })
    await router.push(internalRedirect(route.query.redirect))
  }
  catch (error) {
    form.value?.setErrors(apiFormErrors(error))
  }
}
</script>

<template>
  <UCard class="w-full max-w-sm" :ui="{ body: 'space-y-4' }">
    <template #header>
      <div class="text-center">
        <h1 class="text-xl font-semibold text-highlighted">
          Welcome back
        </h1>
        <p class="mt-1 text-sm text-muted">
          Sign in to your account
        </p>
      </div>
    </template>

    <UForm ref="form" :state="state" class="space-y-4" novalidate @submit.prevent="submit">
      <UFormField name="email" label="Email" required>
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="email"
          maxlength="254"
          placeholder="you@example.com"
          required
          class="w-full"
        />
      </UFormField>

      <UFormField name="password" label="Password" required>
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="current-password"
          minlength="12"
          maxlength="128"
          required
          class="w-full"
        />
      </UFormField>

      <UAlert
        v-if="login.error.value && login.error.value.status !== 422"
        role="alert"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Invalid email or password."
        :description="login.error.value?.message"
      />

      <UButton type="submit" label="Login" block :loading="login.asyncStatus.value === 'loading'" />
    </UForm>

    <template #footer>
      <p class="text-center text-sm text-muted">
        Don't have an account?
        <ULink to="/register" class="font-medium text-primary">
          Register
        </ULink>
      </p>
    </template>
  </UCard>
</template>
