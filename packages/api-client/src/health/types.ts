import type { paths } from "../schema.js";

export type HealthResponse = paths["/api/v1/health/live"]["get"]["responses"][200]["content"]["application/json"];
