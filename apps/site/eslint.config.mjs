import createConfig from '@monorepo-fastify-vue/eslint-config/create-config'

export default createConfig({
  vue: true,
  ignores: ['.nuxt/**', '.output/**', 'tsconfig.json']
})
