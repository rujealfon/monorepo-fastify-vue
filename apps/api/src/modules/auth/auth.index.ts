import createRouter from "@/api/lib/create-router";

import { authMiddleware } from "@/api/middleware/auth";

import * as handlers from "./auth.handlers";
import * as routes from "./auth.routes";

const base = createRouter();

// Apply auth guard before route handlers - mutates in place, type of base preserved
base.use(routes.me.path, authMiddleware);

export default base
  .openapi(routes.register, handlers.register)
  .openapi(routes.login, handlers.login)
  .openapi(routes.me, handlers.me);
