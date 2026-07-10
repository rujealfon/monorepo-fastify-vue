<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <main class="home">
    <h1>Task Manager</h1>
    <p>Track and manage your tasks in one place.</p>

    <RouterLink to="/tasks" class="cta">
      Go to Tasks
    </RouterLink>
  </main>
</template>

<style scoped>
.home {
  display: grid;
  gap: 1rem;
}

h1 {
  font-size: 2rem;
  line-height: 1.1;
}

.cta {
  width: fit-content;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
}
</style>
