import createConfig from '@monorepo-fastify-vue/eslint-config/create-config'

export default createConfig({
  vue: true
}, {
  rules: {
    'unicorn/filename-case': 'off'
  }
})
