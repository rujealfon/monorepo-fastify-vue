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
  queryFn: async () => {
    const { data, error } = await apiClient.GET("/api/v1/tasks/");
    if (error)
      throw new Error(formatApiError(error));
    return data;
  },
});

export const createTaskQueryOptions = (id: string) => queryOptions({
  ...queryKeys.LIST_TASK(id),
  queryFn: async () => {
    const { data, error } = await apiClient.GET("/api/v1/tasks/{id}", {
      params: { path: { id: Number(id) } },
    });
    if (error)
      throw new Error(formatApiError(error));
    return data;
  },
});

export const createTask = async (task: insertTasksSchema) => {
  const { data, error } = await apiClient.POST("/api/v1/tasks/", { body: task });
  if (error)
    throw new Error(formatApiError(error));
  return data;
};

export const deleteTask = async (id: string) => {
  const { error } = await apiClient.DELETE("/api/v1/tasks/{id}", {
    params: { path: { id: Number(id) } },
  });
  if (error)
    throw new Error(formatApiError(error));
};

export const updateTask = async ({ id, task }: { id: string; task: patchTasksSchema }) => {
  const { error } = await apiClient.PATCH("/api/v1/tasks/{id}", {
    params: { path: { id: Number(id) } },
    body: task,
  });
  if (error)
    throw new Error(formatApiError(error));
};
