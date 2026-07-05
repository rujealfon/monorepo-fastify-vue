/* eslint-disable ts/no-redeclare */
import type { z } from "zod";

import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { users } from "../auth/auth.schema";

export const profiles = pgTable("profiles", {
  id: serial().primaryKey(),
  userId: integer("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("displayName"),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  phoneNumber: text("phoneNumber"),
  createdAt: timestamp("createdAt", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const selectProfileSchema = createSelectSchema(profiles);
export type selectProfileSchema = z.infer<typeof selectProfileSchema>;

export const upsertProfileSchema = createInsertSchema(profiles, {
  displayName: schema => schema.max(100),
  bio: schema => schema.max(500),
  avatarUrl: schema => schema.url(),
  phoneNumber: schema => schema.max(20),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();
export type upsertProfileSchema = z.infer<typeof upsertProfileSchema>;
