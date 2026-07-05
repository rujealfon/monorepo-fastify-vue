import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";

export async function createContext(_opts: CreateFastifyContextOptions) {
  return {};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
