import createConfig from '@monorepo-fastify-vue/eslint-config/create-config'
import drizzle from 'eslint-plugin-drizzle'

export default createConfig({
  plugins: { drizzle },
  rules: {
    ...drizzle.configs.recommended.rules,
    'node/no-process-env': 'off'
  }
}, {
  // Node-native alias: import from src/ via #api/ instead of climbing with ../
  files: ['src/**'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['../*'],
        message: 'Use the #api/ alias instead of parent-relative (../) imports.'
      }]
    }]
  }
}, {
  files: ['src/**/__tests__/**', 'src/db/migrations/meta/*.json'],
  rules: {
    'unicorn/filename-case': 'off'
  }
})
