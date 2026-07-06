<script setup lang="ts">
import { insertTasksSchema } from "@monorepo-fastify-vue/api/schema";
import { useMutation, useQueryCache } from "@pinia/colada";
import { ref } from "vue";

import { createTask, TASK_KEYS } from "@/web/lib/queries";

const queryCache = useQueryCache();

const name = ref("");
const errors = ref<Record<string, string>>({});

const createMutation = useMutation({
  mutation: createTask,
  onSuccess: () => {
    name.value = "";
    errors.value = {};
    return queryCache.invalidateQueries({ key: TASK_KEYS.root });
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
        <input v-model="name" :disabled="createMutation.isLoading.value" placeholder="Task name">
        <p v-if="errors.name" class="error">
          {{ errors.name }}
        </p>
      </label>
      <button type="submit" :disabled="createMutation.isLoading.value">
        Create
      </button>
    </form>
    <progress v-if="createMutation.isLoading.value" />
  </div>
</template>
