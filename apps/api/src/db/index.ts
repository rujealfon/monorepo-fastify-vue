import { drizzle } from "drizzle-orm/node-postgres";

import { config } from "@/api/config";

import * as schema from "./schema";

export const db = drizzle(config.DATABASE_URL, { schema });
