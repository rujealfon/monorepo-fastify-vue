export class TaskNotFoundError extends Error {
  readonly id: number;
  constructor(id: number) {
    super(`Task with id ${id} not found`);
    this.name = "TaskNotFoundError";
    this.id = id;
  }
}
