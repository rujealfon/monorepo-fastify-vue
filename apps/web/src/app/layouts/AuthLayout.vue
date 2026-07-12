<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="auth-layout">
    <RouterLink to="/" aria-label="Home">
      <img alt="Vue logo" src="@/assets/images/logo.svg" width="96" height="96">
    </RouterLink>
    <RouterView />
  </div>
</template>

<style scoped>
.auth-layout {
  display: grid;
  grid-column: 1 / -1;
  gap: 2rem;
  width: min(100%, 28rem);
  margin: auto;
}

.auth-layout > a {
  justify-self: center;
}
</style>
