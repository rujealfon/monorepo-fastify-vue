import path from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: "../api/public",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@/web": path.resolve(__dirname, "./src"),
      "@monorepo-fastify-vue/api-client": path.resolve(
        __dirname,
        "../../packages/api-client/src/index.ts",
      ),
    },
  },
  plugins: [
    tsconfigPaths(),
    vue(),
  ],
  server: {
    proxy: {
      // eslint-disable-next-line node/no-process-env
      "/api": process.env.API_PROXY_URL ?? "http://localhost:3000",
    },
  },
});
