<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import { useAuth } from "@/web/composables/use-auth";

const router = useRouter();
const { login } = useAuth();

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await login(email.value, password.value);
    router.push("/profile");
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : "Login failed";
  }
  finally {
    loading.value = false;
  }
}
</script>

<template>
  <article style="max-width: 400px; margin: 4rem auto">
    <h2>Login</h2>
    <form @submit.prevent="handleSubmit">
      <label>
        Email
        <input v-model="email" type="email" placeholder="you@example.com" required>
      </label>
      <label>
        Password
        <input v-model="password" type="password" placeholder="Password" required>
      </label>
      <p v-if="error" class="error">
        {{ error }}
      </p>
      <button type="submit" :aria-busy="loading">
        Login
      </button>
    </form>
    <p style="text-align: center; margin-top: 1rem">
      No account?
      <RouterLink to="/register">
        Register
      </RouterLink>
    </p>
  </article>
</template>
