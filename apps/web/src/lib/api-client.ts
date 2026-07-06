import apiClient from "@monorepo-fastify-vue/api-client";

export default apiClient(import.meta.env.VITE_API_BASE_URL ?? "/");
