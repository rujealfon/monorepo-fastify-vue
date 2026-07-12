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
  <div class="mx-auto flex max-w-2xl flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Tasks
      </h1>
      <p class="text-muted">
        Track and manage your tasks in one place.
      </p>
    </div>

    <form class="flex items-center gap-2" @submit.prevent="create">
      <UInput
        id="task-name"
        v-model="name"
        aria-label="New task"
        placeholder="What needs to be done?"
        maxlength="500"
        required
        icon="i-lucide-plus"
        class="flex-1"
        size="lg"
      />
      <UButton type="submit" label="Add" size="lg" :disabled="pending || !name.trim()" />
    </form>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error.message"
    />

    <div v-if="tasks.status.value === 'pending'" class="flex flex-col gap-2">
      <USkeleton v-for="i in 4" :key="i" class="h-14 w-full" />
    </div>

    <UEmpty
      v-else-if="!tasks.data.value?.data.length"
      icon="i-lucide-list-checks"
      title="No tasks yet"
      description="Add your first task above to get started."
    />

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="task in tasks.data.value?.data"
        :key="task.id"
        class="flex items-center gap-3 rounded-lg border border-default bg-elevated/50 px-4 py-3"
      >
        <UCheckbox
          :aria-label="`${task.done ? 'Reopen' : 'Complete'} ${task.name}`"
          :model-value="task.done"
          :disabled="pending"
          @update:model-value="updateMutation.mutate({ id: task.id, done: !task.done })"
        />
        <span
          class="flex-1 truncate"
          :class="task.done ? 'text-dimmed line-through' : 'text-default'"
        >{{ task.name }}</span>
        <UButton
          :aria-label="`Delete ${task.name}`"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="sm"
          :disabled="pending"
          @click="deleteMutation.mutate(task.id)"
        />
      </li>
    </ul>

    <div v-if="tasks.data.value?.pagination.totalPages" class="flex justify-center">
      <UPagination
        v-model:page="page"
        :total="tasks.data.value.pagination.total"
        :items-per-page="20"
      />
    </div>
  </div>
</template>
