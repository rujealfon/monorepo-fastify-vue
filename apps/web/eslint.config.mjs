import createConfig from '@monorepo-fastify-vue/eslint-config/create-config'

export default createConfig({
  vue: true,
  ignores: ['.nuxt/**', '.output/**', 'tsconfig.json']
}, {
  // nuxt.config.ts reads env vars directly to build runtimeConfig defaults;
  // app code should use useRuntimeConfig() instead.
  files: ['nuxt.config.ts'],
  rules: {
    'node/no-process-env': 'off'
  }
})
