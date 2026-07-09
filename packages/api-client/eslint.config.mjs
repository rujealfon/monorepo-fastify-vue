import createConfig from "@monorepo-fastify-vue/eslint-config/create-config";

export default createConfig({
  ignores: ["src/schema.d.ts"],
});
