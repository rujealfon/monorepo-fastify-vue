<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { insertTasksSchema } from "@tech-full-stack/api/schema";
import { ref } from "vue";

import { createTask, queryKeys } from "@/web/lib/queries";

const queryClient = useQueryClient();

const name = ref("");
const errors = ref<Record<string, string>>({});

const createMutation = useMutation({
  mutationFn: createTask,
  onSuccess: () => {
    name.value = "";
    errors.value = {};
    queryClient.invalidateQueries(queryKeys.LIST_TASKS);
  },
});

function onSubmit() {
  const result = insertTasksSchema.safeParse({ name: name.value, done: false });
  if (!result.success) {
    errors.value = Object.fromEntries(
      result.error.issues.map(i => [String(i.path[0]), i.message]),
    );
    return;
  }
  errors.value = {};
  createMutation.mutate(result.data);
}
</script>

<template>
  <div>
    <article v-if="createMutation.error.value" class="error" style="white-space: pre-wrap">
      {{ createMutation.error.value.message }}
    </article>
    <form @submit.prevent="onSubmit">
      <label>
        Name
        <input v-model="name" :disabled="createMutation.isPending.value" placeholder="Task name">
        <p v-if="errors.name" class="error">
          {{ errors.name }}
        </p>
      </label>
      <button type="submit" :disabled="createMutation.isPending.value">
        Create
      </button>
    </form>
    <progress v-if="createMutation.isPending.value" />
  </div>
</template>
