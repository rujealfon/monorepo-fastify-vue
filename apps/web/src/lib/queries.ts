import type { insertTasksSchema, patchTasksSchema } from "@monorepo-fastify-vue/api/schema";

import { queryOptions } from "@tanstack/vue-query";

import apiClient from "./api-client";
import formatApiError from "./format-api-error";

export const queryKeys = {
  LIST_TASKS: { queryKey: ["list-tasks"] },
  LIST_TASK: (id: string) => ({ queryKey: [`list-task-${id}`] }),
};

export const tasksQueryOptions = queryOptions({
  ...queryKeys.LIST_TASKS,
  queryFn: () => apiClient.tasks.list.query().catch((error) => {
    throw new Error(formatApiError(error));
  }),
});

export const createTaskQueryOptions = (id: string) => queryOptions({
  ...queryKeys.LIST_TASK(id),
  queryFn: () => apiClient.tasks.getOne.query({ id: Number(id) }).catch((error) => {
    throw new Error(formatApiError(error));
  }),
});

export const createTask = (task: insertTasksSchema) =>
  apiClient.tasks.create.mutate(task).catch((error) => {
    throw new Error(formatApiError(error));
  });

export const deleteTask = (id: string) =>
  apiClient.tasks.remove.mutate({ id: Number(id) }).catch((error) => {
    throw new Error(formatApiError(error));
  });

export const updateTask = ({ id, task }: { id: string; task: patchTasksSchema }) =>
  apiClient.tasks.patch.mutate({ id: Number(id), data: task }).catch((error) => {
    throw new Error(formatApiError(error));
  });
