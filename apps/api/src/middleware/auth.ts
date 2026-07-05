import { jwt } from "hono/jwt";

import { config } from "@/api/config";

export const authMiddleware = jwt({ secret: config.JWT_SECRET, alg: "HS256" });
