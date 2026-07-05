import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./vitest.setup.ts"],
    // Integration tests share one physical test database (truncate in
    // beforeAll/afterAll) — run files sequentially so they don't race.
    fileParallelism: false,
  },
});
