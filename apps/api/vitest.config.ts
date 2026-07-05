import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Must run before any module imports so config/index.ts sees the test DB URL
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@/api": path.resolve(__dirname, "./src"),
    },
  },
});
