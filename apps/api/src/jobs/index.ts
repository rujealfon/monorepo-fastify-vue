type JobHandler<T = unknown> = (data: T) => Promise<void>;

const registry = new Map<string, JobHandler>();

// Register a named job handler
export function defineJob<T>(name: string, handler: JobHandler<T>) {
  registry.set(name, handler as JobHandler);
}

// Dispatch a job — in-process for now; swap for BullMQ/pg-boss for background processing
export async function dispatch<T>(name: string, data: T): Promise<void> {
  const handler = registry.get(name);
  if (!handler) {
    throw new Error(`No job registered for "${name}"`);
  }
  await handler(data);
}

// Job names
export const JobNames = {
  SEND_WELCOME_EMAIL: "send-welcome-email",
} as const;
