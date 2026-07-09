import createConfig from "@monorepo-fastify-vue/eslint-config/create-config";

export default createConfig({
  vue: true,
}, {
  rules: {
    "antfu/top-level-function": "off",
    "unicorn/filename-case": ["error", {
      cases: {
        kebabCase: true,
        pascalCase: true,
      },
    }],
  },
});
