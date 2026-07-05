import type { paths } from "./schema.js";

import createClient from "openapi-fetch";

export default function apiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl });
}

export type ApiClient = ReturnType<typeof apiClient>;

export type ApiErrorSchema = {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
};
