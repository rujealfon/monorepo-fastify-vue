import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    // eslint-disable-next-line node/no-process-env
    url: process.env.DATABASE_URL!,
  },
});
