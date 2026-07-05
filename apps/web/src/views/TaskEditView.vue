<script setup lang="ts">
import { patchTasksSchema } from "@monorepo-fastify-vue/api/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { createTaskQueryOptions, deleteTask, queryKeys, updateTask } from "@/web/lib/queries";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const id = route.params.id as string;

const { data } = useQuery(createTaskQueryOptions(id));

const name = ref("");
const done = ref(false);
const errors = ref<Record<string, string>>({});

watch(data, (val) => {
  if (val) {
    name.value = val.name;
    done.value = val.done;
  }
}, { immediate: true });

const deleteMutation = useMutation({
  mutationFn: deleteTask,
  onSuccess: async () => {
    await queryClient.invalidateQueries(queryKeys.LIST_TASKS);
    router.push("/");
  },
});

const updateMutation = useMutation({
  mutationFn: updateTask,
  onSuccess: async () => {
    await queryClient.invalidateQueries({
      queryKey: [
        ...queryKeys.LIST_TASKS.queryKey,
        ...queryKeys.LIST_TASK(id).queryKey,
      ],
    });
    router.push(`/task/${id}`);
  },
});

const pending = computed(() => deleteMutation.isPending.value || updateMutation.isPending.value);
const mutationError = computed(() => deleteMutation.error.value?.message || updateMutation.error.value?.message);

function onSubmit() {
  const result = patchTasksSchema.safeParse({ name: name.value, done: done.value });
  if (!result.success) {
    errors.value = Object.fromEntries(
      result.error.issues.map(i => [String(i.path[0]), i.message]),
    );
    return;
  }
  errors.value = {};
  updateMutation.mutate({ id, task: result.data });
}
</script>

<template>
  <article>
    <progress v-if="pending" />
    <article v-if="mutationError" class="error">
      {{ mutationError }}
    </article>
    <template v-if="data">
      <form @submit.prevent="onSubmit">
        <label>
          Name
          <input v-model="name" :disabled="pending">
          <p v-if="errors.name" class="error">
            {{ errors.name }}
          </p>
        </label>
        <fieldset>
          <label>
            <input v-model="done" type="checkbox" :disabled="pending">
            Done
          </label>
          <p v-if="errors.done" class="error">
            {{ errors.done }}
          </p>
        </fieldset>
        <button type="submit" :disabled="pending" class="contrast">
          Save
        </button>
      </form>
      <div class="buttons">
        <button type="button" class="contrast" :disabled="pending" @click="deleteMutation.mutate(id)">
          Delete
        </button>
        <RouterLink role="button" :to="`/task/${id}`" class="contrast outline">
          Cancel
        </RouterLink>
      </div>
    </template>
  </article>
</template>
