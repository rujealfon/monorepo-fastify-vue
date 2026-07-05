import type { AppRouter } from "@monorepo-fastify-vue/api/router";

import { createTRPCClient, httpBatchLink } from "@trpc/client";

export default function apiClient(url: string) {
  return createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url })],
  });
}

export type ApiClient = ReturnType<typeof apiClient>;
