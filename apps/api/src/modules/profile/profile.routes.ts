import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, createMessageObjectSchema } from "stoker/openapi/schemas";

import { selectProfileSchema, upsertProfileSchema } from "./profile.schema";

const tags = ["Profile"];

export const getProfile = createRoute({
  path: "/profile",
  method: "get",
  tags,
  security: [{ "Bearer Token": [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectProfileSchema, "User profile"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createMessageObjectSchema("Profile not found"),
      "Profile does not exist yet",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      createMessageObjectSchema("Unauthorized"),
      "Missing or invalid token",
    ),
  },
});

export const upsertProfile = createRoute({
  path: "/profile",
  method: "put",
  tags,
  security: [{ "Bearer Token": [] }],
  request: {
    body: jsonContentRequired(upsertProfileSchema, "Profile data"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectProfileSchema, "Updated profile"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(upsertProfileSchema),
      "Validation error",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      createMessageObjectSchema("Unauthorized"),
      "Missing or invalid token",
    ),
  },
});

export type GetProfileRoute = typeof getProfile;
export type UpsertProfileRoute = typeof upsertProfile;
