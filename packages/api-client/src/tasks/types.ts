import type { paths } from "../schema.js";

type TasksPath = paths["/api/v1/tasks/"];
type TaskPath = paths["/api/v1/tasks/{id}"];

export type Task = TaskPath["get"]["responses"][200]["content"]["application/json"];
export type TaskList = TasksPath["get"]["responses"][200]["content"]["application/json"];
export type CreateTask = TasksPath["post"]["requestBody"]["content"]["application/json"];
export type UpdateTask = TaskPath["patch"]["requestBody"]["content"]["application/json"];
export type TaskId = TaskPath["get"]["parameters"]["path"]["id"];
