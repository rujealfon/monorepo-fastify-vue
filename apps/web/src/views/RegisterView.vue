<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import { useAuth } from "@/web/composables/use-auth";

const router = useRouter();
const { register } = useAuth();

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await register(email.value, password.value);
    router.push("/profile");
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : "Registration failed";
  }
  finally {
    loading.value = false;
  }
}
</script>

<template>
  <article style="max-width: 400px; margin: 4rem auto">
    <h2>Register</h2>
    <form @submit.prevent="handleSubmit">
      <label>
        Email
        <input v-model="email" type="email" placeholder="you@example.com" required>
      </label>
      <label>
        Password
        <input v-model="password" type="password" placeholder="At least 8 characters" required>
      </label>
      <p v-if="error" class="error">
        {{ error }}
      </p>
      <button type="submit" :aria-busy="loading">
        Register
      </button>
    </form>
    <p style="text-align: center; margin-top: 1rem">
      Already have an account?
      <RouterLink to="/login">
        Login
      </RouterLink>
    </p>
  </article>
</template>
