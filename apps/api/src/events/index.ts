import { EventEmitter } from "node:events";

export const eventBus = new EventEmitter();

export const TaskEvents = {
  CREATED: "task.created",
  UPDATED: "task.updated",
  DELETED: "task.deleted",
} as const;

export const AuthEvents = {
  USER_REGISTERED: "auth.user_registered",
  USER_LOGGED_IN: "auth.user_logged_in",
} as const;
