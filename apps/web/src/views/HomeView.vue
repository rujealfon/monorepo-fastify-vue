<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

import TaskForm from "@/web/components/TaskForm.vue";
import TaskList from "@/web/components/TaskList.vue";
import { tasksQueryOptions } from "@/web/lib/queries";

const { data, isPending, error } = useQuery(tasksQueryOptions);
</script>

<template>
  <div>
    <article v-if="isPending">
      <progress />
    </article>
    <article v-else-if="error" class="error">
      {{ error.message }}
    </article>
    <template v-else>
      <TaskForm />
      <TaskList :tasks="data!" />
    </template>
  </div>
</template>
