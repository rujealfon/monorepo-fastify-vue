import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";

import { authResponseSchema, authUserSchema, loginSchema, registerSchema } from "./auth.schema";

const tags = ["Auth"];

export const register = createRoute({
  path: "/auth/register",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(registerSchema, "Registration credentials"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(authResponseSchema, "JWT token and user info"),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createMessageObjectSchema("User already exists"),
      "Email already registered",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(registerSchema),
      "Validation error",
    ),
  },
});

export const login = createRoute({
  path: "/auth/login",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(loginSchema, "Login credentials"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(authResponseSchema, "JWT token and user info"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      createMessageObjectSchema("Invalid credentials"),
      "Invalid email or password",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(loginSchema),
      "Validation error",
    ),
  },
});

export const me = createRoute({
  path: "/auth/me",
  method: "get",
  tags,
  security: [{ "Bearer Token": [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(authUserSchema, "Current authenticated user"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      createMessageObjectSchema("Unauthorized"),
      "Missing or invalid token",
    ),
  },
});

export type RegisterRoute = typeof register;
export type LoginRoute = typeof login;
export type MeRoute = typeof me;
