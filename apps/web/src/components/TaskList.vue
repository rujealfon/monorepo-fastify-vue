<script setup lang="ts">
import TaskItem from "./TaskItem.vue";

// Dates arrive as ISO strings over JSON, not Date objects
type Task = { id: number; name: string; done: boolean; createdAt: string; updatedAt: string };

defineProps<{ tasks: Task[] }>();
</script>

<template>
  <TaskItem v-for="task in tasks" :key="task.id" :task="task" />
</template>
