<script setup lang="ts">
import type { UpdateProfile } from '@monorepo-fastify-vue/api-client'
import { useQuery } from '@pinia/colada'
import { computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'

import { sessionQuery, useAuthMutations } from '@/features/auth'

import { useProfileMutation } from '@/features/profile/mutations'

const router = useRouter()
const session = useQuery(sessionQuery)
const update = useProfileMutation()
const { logout } = useAuthMutations()
const firstName = ref('')
const lastName = ref('')
const gender = ref<NonNullable<UpdateProfile['gender']> | ''>('')
const birthDate = ref('')
const bio = ref('')
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
  firstName.value = profile?.firstName ?? ''
  lastName.value = profile?.lastName ?? ''
  gender.value = profile?.gender ?? ''
  birthDate.value = profile?.birthDate ?? ''
  bio.value = profile?.bio ?? ''
})

async function save() {
  try {
    await update.mutateAsync({
      firstName: firstName.value.trim() || null,
      lastName: lastName.value.trim() || null,
      gender: gender.value || null,
      birthDate: birthDate.value || null,
      bio: bio.value.trim() || null
    })
  }
  catch {}
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
      <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="save">
        <UFormField name="firstName" label="First name" class="w-full">
          <UInput v-model="firstName" autocomplete="given-name" maxlength="100" class="w-full" />
        </UFormField>
        <UFormField name="lastName" label="Last name" class="w-full">
          <UInput v-model="lastName" autocomplete="family-name" maxlength="100" class="w-full" />
        </UFormField>
        <UFormField name="gender" label="Gender" class="w-full">
          <USelect v-model="gender" :items="genderOptions" class="w-full" />
        </UFormField>
        <UFormField name="birthDate" label="Birth date" class="w-full">
          <UInput v-model="birthDate" type="date" class="w-full" />
        </UFormField>
        <UFormField name="bio" label="Bio" class="col-span-full">
          <UTextarea v-model="bio" maxlength="500" :rows="3" autoresize class="w-full" />
        </UFormField>

        <UAlert
          v-if="update.error.value"
          role="alert"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Could not update your profile."
          class="col-span-full"
        />

        <div class="col-span-full flex justify-end">
          <UButton type="submit" label="Save" :disabled="pending" :loading="update.asyncStatus.value === 'loading'" />
        </div>
      </form>
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
