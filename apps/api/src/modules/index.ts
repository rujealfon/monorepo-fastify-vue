/* eslint-disable ts/no-redeclare */
import type { AppOpenAPI } from "../lib/types";

import createRouter from "@/api/lib/create-router";

import { BASE_PATH } from "../lib/constants";
import auth from "./auth/auth.index";
import profile from "./profile/profile.index";
import tasks from "./tasks/tasks.index";

export function registerRoutes(app: AppOpenAPI) {
  return app
    .route("/", auth)
    .route("/", profile)
    .route("/", tasks);
}

// Stand-alone router type used by the api-client package
export const router = registerRoutes(
  createRouter().basePath(BASE_PATH),
);
export type router = typeof router;
