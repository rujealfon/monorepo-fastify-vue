/* eslint-disable ts/no-redeclare -- value + same-named inferred type exports are intentional */
import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const selectTasksSchema = createSelectSchema(tasks);
export type selectTasksSchema = z.infer<typeof selectTasksSchema>;

export const insertTasksSchema = z.object({
  name: z.string().min(1).max(500),
  done: z.boolean().optional(),
});
export type insertTasksSchema = z.infer<typeof insertTasksSchema>;

export const patchTasksSchema = insertTasksSchema.partial();
export type patchTasksSchema = z.infer<typeof patchTasksSchema>;
