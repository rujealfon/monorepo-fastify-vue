import type { ErrorSchema } from "@tech-full-stack/api-client";

export default function formatApiError(apiError: ErrorSchema) {
  return apiError
    .error
    .issues
    .reduce((all, issue) => `${all + issue.path.join(".")}: ${issue.message}\n`, "");
}
