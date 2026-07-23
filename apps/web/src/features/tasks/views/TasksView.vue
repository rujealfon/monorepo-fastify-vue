<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { computed, reactive, ref, useTemplateRef } from 'vue'

import { useAuthorization } from '@/features/permissions'
import { useTaskMutations } from '@/features/tasks/mutations'
import { tasksQuery } from '@/features/tasks/queries'
import { apiFormErrors } from '@/shared/api/form-errors'

const state = reactive({ name: '' })
const form = useTemplateRef('form')
const page = ref(1)
const tasks = useQuery(() => tasksQuery(page.value))
const { can } = useAuthorization()
const { create: createMutation, update: updateMutation, remove: deleteMutation } = useTaskMutations(() => state.name = '')

const pending = computed(() => [createMutation, updateMutation, deleteMutation]
  .some(mutation => mutation.asyncStatus.value === 'loading'))
const error = computed(() => tasks.error.value
  ?? (createMutation.error.value?.status === 422 ? null : createMutation.error.value)
  ?? updateMutation.error.value
  ?? deleteMutation.error.value)

async function create() {
  try {
    await createMutation.mutateAsync({ name: state.name.trim() })
  }
  catch (error) {
    form.value?.setErrors(apiFormErrors(error))
  }
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

    <UForm v-if="can('create', 'tasks')" ref="form" :state="state" class="flex items-start gap-2" novalidate @submit.prevent="create">
      <UFormField name="name" class="flex-1">
        <UInput
          id="task-name"
          v-model="state.name"
          aria-label="New task"
          placeholder="What needs to be done?"
          maxlength="500"
          required
          icon="i-lucide-plus"
          class="w-full"
          size="lg"
        />
      </UFormField>
      <UButton type="submit" label="Add" size="lg" :disabled="pending" />
    </UForm>

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
          :disabled="pending || !can('update', 'tasks', task)"
          @update:model-value="updateMutation.mutate({ id: task.id, done: !task.done })"
        />
        <span
          class="flex-1 truncate"
          :class="task.done ? 'text-dimmed line-through' : 'text-default'"
        >{{ task.name }}</span>
        <UButton
          v-if="can('delete', 'tasks', task)"
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
