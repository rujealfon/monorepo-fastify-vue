import { config } from "dotenv";

config({ path: ".env.test", override: true });

const { config: appConfig } = await import("./src/config/index.js");
if (new URL(appConfig.DATABASE_URL).pathname !== "/fastify_vue_test")
  throw new Error("Tests must use the fastify_vue_test database from .env.test");
