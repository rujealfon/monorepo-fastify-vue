import type { ApiErrorSchema } from "@monorepo-fastify-vue/api-client";

type ValidationDetail = {
  instancePath?: string;
  message?: string;
};

export default function formatApiError(apiError: ApiErrorSchema) {
  if (Array.isArray(apiError.details)) {
    return (apiError.details as ValidationDetail[]).reduce(
      (all, issue) => `${all}${issue.instancePath?.replace(/^\//, "") ?? apiError.error}: ${issue.message}\n`,
      "",
    );
  }
  return apiError.message;
}
