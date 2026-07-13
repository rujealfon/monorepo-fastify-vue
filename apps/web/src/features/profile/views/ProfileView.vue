<script setup lang="ts">
import type { UpdateProfile } from '@monorepo-fastify-vue/api-client'
import { useQuery } from '@pinia/colada'
import { computed, reactive, useTemplateRef, watchEffect } from 'vue'
import { useRouter } from 'vue-router'

import { sessionQuery, useAuthMutations } from '@/features/auth'

import { useProfileMutation } from '@/features/profile/mutations'
import { apiFormErrors } from '@/shared/api/form-errors'

const router = useRouter()
const session = useQuery(sessionQuery)
const update = useProfileMutation()
const { logout } = useAuthMutations()
const form = useTemplateRef('form')
const state = reactive({
  firstName: '',
  lastName: '',
  gender: '' as NonNullable<UpdateProfile['gender']> | '',
  birthDate: '',
  bio: ''
})
const genderOptions: Array<{ label: string, value: NonNullable<UpdateProfile['gender']> | '' }> = [
  { label: 'Not specified', value: '' },
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
  { label: 'Intersex', value: 'intersex' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' }
]
const pending = computed(() => update.asyncStatus.value === 'loading' || logout.asyncStatus.value === 'loading')

watchEffect(() => {
  const profile = session.data.value?.profile
  state.firstName = profile?.firstName ?? ''
  state.lastName = profile?.lastName ?? ''
  state.gender = profile?.gender ?? ''
  state.birthDate = profile?.birthDate ?? ''
  state.bio = profile?.bio ?? ''
})

async function save() {
  try {
    await update.mutateAsync({
      firstName: state.firstName.trim() || null,
      lastName: state.lastName.trim() || null,
      gender: state.gender || null,
      birthDate: state.birthDate || null,
      bio: state.bio.trim() || null
    })
  }
  catch (error) {
    form.value?.setErrors(apiFormErrors(error))
  }
}

async function signOut() {
  try {
    await logout.mutateAsync()
    await router.push('/login')
  }
  catch {}
}
</script>

<template>
  <div class="mx-auto flex max-w-xl flex-col gap-6">
    <div class="flex items-center gap-4">
      <UAvatar icon="i-lucide-user" size="xl" />
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          Profile
        </h1>
        <p class="text-muted">
          {{ session.data.value?.email }}
        </p>
      </div>
    </div>

    <UCard :ui="{ body: 'space-y-4' }">
      <UForm ref="form" :state="state" class="grid grid-cols-1 gap-4 sm:grid-cols-2" novalidate @submit.prevent="save">
        <UFormField name="firstName" label="First name" class="w-full">
          <UInput v-model="state.firstName" autocomplete="given-name" maxlength="100" class="w-full" />
        </UFormField>
        <UFormField name="lastName" label="Last name" class="w-full">
          <UInput v-model="state.lastName" autocomplete="family-name" maxlength="100" class="w-full" />
        </UFormField>
        <UFormField name="gender" label="Gender" class="w-full">
          <USelect v-model="state.gender" :items="genderOptions" class="w-full" />
        </UFormField>
        <UFormField name="birthDate" label="Birth date" class="w-full">
          <UInput v-model="state.birthDate" type="date" class="w-full" />
        </UFormField>
        <UFormField name="bio" label="Bio" class="col-span-full">
          <UTextarea v-model="state.bio" maxlength="500" :rows="3" autoresize class="w-full" />
        </UFormField>

        <UAlert
          v-if="update.error.value && update.error.value.status !== 422"
          role="alert"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Could not update your profile."
          :description="update.error.value?.message"
          class="col-span-full"
        />

        <div class="col-span-full flex justify-end">
          <UButton type="submit" label="Save" :disabled="pending" :loading="update.asyncStatus.value === 'loading'" />
        </div>
      </UForm>
    </UCard>

    <UCard>
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="font-medium text-default">
            Sign out
          </p>
          <p class="text-sm text-muted">
            End your session on this device.
          </p>
        </div>
        <UButton
          label="Logout"
          icon="i-lucide-log-out"
          color="error"
          variant="outline"
          :disabled="pending"
          @click="signOut"
        />
      </div>
      <UAlert
        v-if="logout.error.value"
        role="alert"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Could not log out."
        class="mt-4"
      />
    </UCard>
  </div>
</template>
