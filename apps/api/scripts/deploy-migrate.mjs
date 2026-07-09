import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const { Pool } = pg;

// eslint-disable-next-line node/no-process-env
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to run database migrations.");
  console.error("Set DATABASE_URL in Vercel for this deployment environment, then redeploy.");
  process.exit(1);
}

// eslint-disable-next-line node/no-process-env
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

try {
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../src/db/migrations", import.meta.url)),
  });
  console.warn("Database migrations applied.");
}
catch (error) {
  console.error("Database migration failed.");
  console.error(error);
  process.exitCode = 1;
}
finally {
  await pool.end();
}
