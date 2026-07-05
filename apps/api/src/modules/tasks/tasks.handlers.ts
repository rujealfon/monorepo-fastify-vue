import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from "./tasks.routes";
import type { AppRouteHandler } from "@/api/lib/types";

import * as HttpStatusCodes from "stoker/http-status-codes";

import * as HttpStatusPhrases from "stoker/http-status-phrases";

import { ZOD_ERROR_CODES, ZOD_ERROR_MESSAGES } from "@/api/lib/constants";

import { TaskNotFoundError } from "./tasks.errors";
import * as service from "./tasks.service";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  return c.json(await service.listTasks());
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const task = c.req.valid("json");
  return c.json(await service.createTask(task), HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  try {
    return c.json(await service.getTask(id), HttpStatusCodes.OK);
  }
  catch (e) {
    if (e instanceof TaskNotFoundError) {
      return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
    }
    throw e;
  }
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  if (Object.keys(updates).length === 0) {
    return c.json(
      {
        success: false,
        error: {
          issues: [
            {
              code: ZOD_ERROR_CODES.INVALID_UPDATES,
              path: [],
              message: ZOD_ERROR_MESSAGES.NO_UPDATES,
            },
          ],
          name: "ZodError",
        },
      },
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  try {
    return c.json(await service.updateTask(id, updates), HttpStatusCodes.OK);
  }
  catch (e) {
    if (e instanceof TaskNotFoundError) {
      return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
    }
    throw e;
  }
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  try {
    await service.deleteTask(id);
    return c.body(null, HttpStatusCodes.NO_CONTENT);
  }
  catch (e) {
    if (e instanceof TaskNotFoundError) {
      return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
    }
    throw e;
  }
};
