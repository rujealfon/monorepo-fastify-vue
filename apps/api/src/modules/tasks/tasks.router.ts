import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure, router } from "../../trpc/trpc.js";
import { TaskNotFoundError } from "./tasks.errors.js";
import { insertTasksSchema, patchTasksSchema } from "./tasks.schema.js";
import * as tasksService from "./tasks.service.js";

const idInput = z.object({ id: z.coerce.number().int().positive() });

export const tasksRouter = router({
  list: publicProcedure.query(() => tasksService.listTasks()),

  getOne: publicProcedure.input(idInput).query(async ({ input }) => {
    try {
      return await tasksService.getTask(input.id);
    }
    catch (error) {
      if (error instanceof TaskNotFoundError) {
        throw new TRPCError({ code: "NOT_FOUND", message: error.message });
      }
      throw error;
    }
  }),

  create: publicProcedure.input(insertTasksSchema).mutation(({ input }) => tasksService.createTask(input)),

  patch: publicProcedure
    .input(z.object({ id: idInput.shape.id, data: patchTasksSchema }))
    .mutation(async ({ input }) => {
      try {
        return await tasksService.updateTask(input.id, input.data);
      }
      catch (error) {
        if (error instanceof TaskNotFoundError) {
          throw new TRPCError({ code: "NOT_FOUND", message: error.message });
        }
        throw error;
      }
    }),

  remove: publicProcedure.input(idInput).mutation(async ({ input }) => {
    try {
      await tasksService.deleteTask(input.id);
    }
    catch (error) {
      if (error instanceof TaskNotFoundError) {
        throw new TRPCError({ code: "NOT_FOUND", message: error.message });
      }
      throw error;
    }
  }),
});
