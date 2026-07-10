import type { paths } from "./schema.js";

import createClient from "openapi-fetch";

export type { HealthResponse } from "./health/types.js";
export type { CreateTask, Task, TaskId, TaskList, UpdateTask } from "./tasks/types.js";

export function createApiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl });
}

export default createApiClient;

export type ApiClient = ReturnType<typeof createApiClient>;

export class RpcError extends Error {
  constructor(public status: number) {
    super(`API request failed with HTTP ${status}`);
  }
}

export type ApiErrorSchema = {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
};
