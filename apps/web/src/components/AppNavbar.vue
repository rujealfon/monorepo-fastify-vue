<script setup lang="ts">
import { useRoute } from "vue-router";

import { useAuth } from "@/web/composables/use-auth";

const route = useRoute();
const { isAuthenticated } = useAuth();
</script>

<template>
  <nav class="container">
    <ul>
      <li><strong>Tasks App</strong></li>
    </ul>
    <ul>
      <li v-if="route.path !== '/'">
        <RouterLink to="/">
          Home
        </RouterLink>
      </li>
      <li v-if="isAuthenticated">
        <RouterLink to="/profile">
          Profile
        </RouterLink>
      </li>
      <li v-else>
        <RouterLink to="/login">
          Login
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
