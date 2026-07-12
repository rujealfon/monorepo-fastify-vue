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
const sex = ref<NonNullable<UpdateProfile['sex']> | ''>('')
const birthDate = ref('')
const bio = ref('')
const pending = computed(() => update.asyncStatus.value === 'loading' || logout.asyncStatus.value === 'loading')

watchEffect(() => {
  const profile = session.data.value?.profile
  firstName.value = profile?.firstName ?? ''
  lastName.value = profile?.lastName ?? ''
  sex.value = profile?.sex ?? ''
  birthDate.value = profile?.birthDate ?? ''
  bio.value = profile?.bio ?? ''
})

async function save() {
  try {
    await update.mutateAsync({
      firstName: firstName.value.trim() || null,
      lastName: lastName.value.trim() || null,
      sex: sex.value || null,
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
  <main>
    <h1>Profile</h1>
    <p>{{ session.data.value?.email }}</p>
    <form @submit.prevent="save">
      <label for="profile-first-name">First name
        <input id="profile-first-name" v-model="firstName" autocomplete="given-name" maxlength="100">
      </label>
      <label for="profile-last-name">Last name
        <input id="profile-last-name" v-model="lastName" autocomplete="family-name" maxlength="100">
      </label>
      <label for="profile-sex">Sex
        <select id="profile-sex" v-model="sex">
          <option value="">Not specified</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="intersex">Intersex</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </label>
      <label for="profile-birth-date">Birth date
        <input id="profile-birth-date" v-model="birthDate" type="date">
      </label>
      <label for="profile-bio">Bio
        <textarea id="profile-bio" v-model="bio" maxlength="500" />
      </label>
      <p v-if="update.error.value" role="alert">
        Could not update your profile.
      </p>
      <button :disabled="pending" type="submit">
        Save
      </button>
    </form>
    <button :disabled="pending" type="button" @click="signOut">
      Logout
    </button>
    <p v-if="logout.error.value" role="alert">
      Could not log out.
    </p>
  </main>
</template>
