import createRouter from "@/api/lib/create-router";

import { authMiddleware } from "@/api/middleware/auth";

import * as handlers from "./profile.handlers";
import * as routes from "./profile.routes";

const base = createRouter();

base.use("/profile", authMiddleware);

export default base
  .openapi(routes.getProfile, handlers.getProfile)
  .openapi(routes.upsertProfile, handlers.upsertProfile);
