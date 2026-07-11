<script setup lang="ts">
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { computed, ref } from 'vue'

import { createTask, deleteTask, TASK_KEYS, tasksQuery, updateTask } from '@/features/tasks/queries'

const name = ref('')
const queryCache = useQueryCache()
const tasks = useQuery(tasksQuery)
const refresh = () => queryCache.invalidateQueries({ key: TASK_KEYS.root })

const createMutation = useMutation({
  mutation: createTask,
  onSuccess: () => {
    name.value = ''
    return refresh()
  }
})
const updateMutation = useMutation({ mutation: updateTask, onSuccess: refresh })
const deleteMutation = useMutation({ mutation: deleteTask, onSuccess: refresh })

const pending = computed(() => [createMutation, updateMutation, deleteMutation]
  .some(mutation => mutation.asyncStatus.value === 'loading'))
const error = computed(() => tasks.error.value
  ?? createMutation.error.value
  ?? updateMutation.error.value
  ?? deleteMutation.error.value)

function create() {
  const value = name.value.trim()
  if (value)
    createMutation.mutate({ name: value })
}
</script>

<template>
  <main class="tasks">
    <h1>Tasks</h1>

    <form class="create" @submit.prevent="create">
      <input id="task-name" v-model="name" aria-label="New task" maxlength="500" required>
      <button type="submit" :disabled="pending || !name.trim()">
        Add
      </button>
    </form>

    <p v-if="error" class="error">
      {{ error.message }}
    </p>
    <p v-if="tasks.status.value === 'pending'">
      Loading…
    </p>
    <p v-else-if="!tasks.data.value?.length">
      No tasks yet.
    </p>
    <ul v-else>
      <li v-for="task in tasks.data.value" :key="task.id">
        <div class="task-name">
          <input
            type="checkbox"
            :aria-label="`${task.done ? 'Reopen' : 'Complete'} ${task.name}`"
            :checked="task.done"
            :disabled="pending"
            @change="updateMutation.mutate({ id: task.id, done: !task.done })"
          >
          <span :class="{ done: task.done }">{{ task.name }}</span>
        </div>
        <button type="button" :disabled="pending" @click="deleteMutation.mutate(task.id)">
          Delete
        </button>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.tasks {
  display: grid;
  gap: 1rem;
}

.create,
li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.create input {
  min-width: 0;
  flex: 1;
}

ul {
  display: grid;
  gap: 0.75rem;
  padding: 0;
  list-style: none;
}

li {
  justify-content: space-between;
}

.task-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.done {
  text-decoration: line-through;
}

.error {
  color: #c2410c;
}

button,
input {
  padding: 0.5rem 0.75rem;
}
</style>
