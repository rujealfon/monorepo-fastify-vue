import { tasksRouter } from "../modules/tasks/tasks.router.js";
import { router } from "./trpc.js";

export const appRouter = router({
  tasks: tasksRouter,
});

export type AppRouter = typeof appRouter;
