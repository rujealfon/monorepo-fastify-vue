import type { FastifyError, FastifyInstance } from "fastify";
import type { AppRouter } from "./trpc/router.js";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";

import Fastify from "fastify";
import { config } from "./config/index.js";
import dbPlugin from "./plugins/db.js";
import sensiblePlugin from "./plugins/sensible.js";
import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
  });

  app.register(sensiblePlugin);
  app.register(dbPlugin);

  app.register(fastifyTRPCPlugin<AppRouter>, {
    prefix: "/trpc",
    trpcOptions: { router: appRouter, createContext },
  });

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    const message = statusCode >= 500 && config.NODE_ENV !== "development"
      ? "Internal Server Error"
      : error.message;

    request.log.error({ err: error }, "request error");
    reply.code(statusCode).send({
      statusCode,
      error: error.name,
      message,
    });
  });

  return app;
}
