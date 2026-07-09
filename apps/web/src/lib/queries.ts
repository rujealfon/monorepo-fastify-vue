import type { insertTasksSchema, patchTasksSchema } from "@monorepo-fastify-vue/api/schema";

import { defineQueryOptions } from "@pinia/colada";

import apiClient from "./api-client";
import formatApiError from "./format-api-error";

export const TASK_KEYS = {
  root: ["tasks"] as const,
  byId: (id: string) => [...TASK_KEYS.root, id] as const,
};

export const tasksQueryOptions = defineQueryOptions({
  key: TASK_KEYS.root,
  query: async () => {
    const { data, error } = await apiClient.GET("/api/v1/tasks/");
    if (error)
      throw new Error(formatApiError(error));
    return data;
  },
});

export const taskByIdQueryOptions = defineQueryOptions((id: string) => ({
  key: TASK_KEYS.byId(id),
  query: async () => {
    const { data, error } = await apiClient.GET("/api/v1/tasks/{id}", {
      params: { path: { id: Number(id) } },
    });
    if (error)
      throw new Error(formatApiError(error));
    return data;
  },
}));

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
