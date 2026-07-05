<script setup lang="ts">
// Dates arrive as ISO strings over JSON, not Date objects
type Task = { id: number; name: string; done: boolean; createdAt: string; updatedAt: string };

defineProps<{ task: Task }>();
</script>

<template>
  <article>
    <h3 :style="{ textDecoration: task.done ? 'line-through' : undefined }">
      {{ task.name }}
    </h3>
    <div class="buttons">
      <RouterLink :to="`/task/${task.id}`" role="button" class="outline">
        View
      </RouterLink>
    </div>
  </article>
</template>
