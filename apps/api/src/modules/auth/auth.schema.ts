import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial().primaryKey(),
  email: text().notNull().unique(),
  password: text().notNull(),
  createdAt: timestamp("createdAt", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = loginSchema;

export const authUserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
});

export const authResponseSchema = z.object({
  token: z.string(),
  user: authUserSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
