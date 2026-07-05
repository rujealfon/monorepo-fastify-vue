<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";

import { useAuth } from "@/web/composables/use-auth";

const router = useRouter();
const { user, fetchMe, logout } = useAuth();

onMounted(async () => {
  await fetchMe();
});

function handleLogout() {
  logout();
  router.push("/login");
}
</script>

<template>
  <article style="max-width: 480px; margin: 4rem auto">
    <h2>Profile</h2>
    <template v-if="user">
      <p><strong>ID:</strong> {{ user.id }}</p>
      <p><strong>Email:</strong> {{ user.email }}</p>
      <button class="secondary" @click="handleLogout">
        Logout
      </button>
    </template>
    <article v-else>
      <progress />
    </article>
  </article>
</template>
