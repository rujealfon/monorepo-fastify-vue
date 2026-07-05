/* eslint-disable ts/no-redeclare -- value + same-named inferred type exports are intentional */
import type { z } from "zod";
import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const selectTasksSchema = createSelectSchema(tasks);
export type selectTasksSchema = z.infer<typeof selectTasksSchema>;

export const insertTasksSchema = createInsertSchema(tasks, {
  name: schema => schema.min(1).max(500),
}).omit({ id: true, createdAt: true, updatedAt: true });
export type insertTasksSchema = z.infer<typeof insertTasksSchema>;

export const patchTasksSchema = createUpdateSchema(tasks, {
  name: schema => schema.min(1).max(500),
}).omit({ id: true, createdAt: true, updatedAt: true });
export type patchTasksSchema = z.infer<typeof patchTasksSchema>;
