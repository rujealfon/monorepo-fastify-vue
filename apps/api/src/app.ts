import { serveStatic } from "@hono/node-server/serve-static";
import { apiReference } from "@scalar/hono-api-reference";
import { Hono } from "hono";

import { BASE_PATH } from "@/api/lib/constants";
import createApp from "@/api/lib/create-app";
import { logger } from "@/api/middleware/logger";
import { rateLimiter } from "@/api/middleware/rate-limit";
import { registerRoutes } from "@/api/modules";

import configureOpenAPI from "./lib/configure-open-api";

// API sub-app — all routes live under /api
const apiApp = createApp();
registerRoutes(apiApp);
configureOpenAPI(apiApp);

// Root app — assembles middleware, Scalar, API, and static files
const app = new Hono();

app.use("*", logger);
app.use("*", rateLimiter({ limit: 100, windowMs: 60_000 }));

app.get(
  `${BASE_PATH}/scalar`,
  apiReference({
    theme: "kepler",
    layout: "classic",
    defaultHttpClient: {
      targetKey: "javascript",
      clientKey: "fetch",
    },
    spec: { url: `${BASE_PATH}/doc` },
  }),
);

app.route("/", apiApp);

// Serves the built Vue frontend in production; Vite handles this in dev
app.use("*", serveStatic({ root: "./public" }));

// SPA fallback — any unmatched route returns index.html so Vue Router takes over
app.get("*", serveStatic({ root: "./public", rewriteRequestPath: () => "/index.html" }));

export default app;
