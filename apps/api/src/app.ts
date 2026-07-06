import type { FastifyError, FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

import { config } from "./config/index.js";
import { tasksRoutes } from "./modules/tasks/tasks.routes.js";
import dbPlugin from "./plugins/db.js";
import sensiblePlugin from "./plugins/sensible.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(sensiblePlugin);
  app.register(dbPlugin);

  app.addHook("onRequest", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", config.CORS_ORIGIN);
    reply.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type,Authorization");

    if (request.method === "OPTIONS") {
      return reply.code(204).send();
    }
  });

  app.register(swagger, {
    openapi: {
      info: { title: "Monorepo Fastify Vue API", version: "1.0.0" },
    },
    transform: jsonSchemaTransform,
  });
  app.register(swaggerUi, { routePrefix: "/documentation" });
  app.get("/openapi.json", async () => app.swagger());

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      reply.code(422).send({
        statusCode: 422,
        error: "Unprocessable Entity",
        message: "Validation failed",
        details: error.validation,
      });
      return;
    }

    const taskNotFound = error.name === "TaskNotFoundError";
    if (taskNotFound) {
      reply.code(404).send({
        statusCode: 404,
        error: "Not Found",
        message: error.message,
      });
      return;
    }

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

  app.register(tasksRoutes, { prefix: "/api/v1/tasks" });

  return app;
}
