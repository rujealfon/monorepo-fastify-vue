import type { AppOpenAPI } from "./types";

import { notFound, onError } from "stoker/middlewares";

import { BASE_PATH } from "./constants";
import createRouter from "./create-router";

export default function createApp() {
  const app = createRouter().basePath(BASE_PATH) as AppOpenAPI;
  app.notFound(notFound).onError(onError);
  return app;
}

export function createTestApp<R extends AppOpenAPI>(router: R) {
  return createApp().route("/", router);
}
