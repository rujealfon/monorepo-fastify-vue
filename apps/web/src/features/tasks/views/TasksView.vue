<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { computed, ref } from 'vue'

import { useTaskMutations } from '@/features/tasks/mutations'
import { tasksQuery } from '@/features/tasks/queries'

const name = ref('')
const page = ref(1)
const tasks = useQuery(() => tasksQuery(page.value))
const { create: createMutation, update: updateMutation, remove: deleteMutation } = useTaskMutations(() => name.value = '')

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
    <p v-else-if="!tasks.data.value?.data.length">
      No tasks yet.
    </p>
    <ul v-else>
      <li v-for="task in tasks.data.value?.data" :key="task.id">
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
    <nav v-if="tasks.data.value?.pagination.totalPages" aria-label="Task pages">
      <button type="button" :disabled="page === 1" @click="page--">
        Previous
      </button>
      <span>Page {{ page }} of {{ tasks.data.value.pagination.totalPages }}</span>
      <button type="button" :disabled="page >= tasks.data.value.pagination.totalPages" @click="page++">
        Next
      </button>
    </nav>
  </main>
</template>

<style scoped>
.tasks {
  display: grid;
  gap: 1rem;
}

.create,
li,
nav {
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
