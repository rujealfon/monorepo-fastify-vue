import { readdirSync } from 'node:fs'

import createConfig from '@monorepo-fastify-vue/eslint-config/create-config'
import drizzle from 'eslint-plugin-drizzle'

const modules = readdirSync(new URL('./src/modules', import.meta.url), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)

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
}, ...modules.map(module => ({
  files: [`src/modules/${module}/**`],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['#api/modules/*/*', `!#api/modules/${module}/**`],
        message: 'Import another module through its public #api/modules/<domain> entry point.'
      }, {
        group: ['../*'],
        message: 'Use the #api/ alias instead of parent-relative (../) imports.'
      }]
    }]
  }
})), {
  files: ['src/app.ts', 'src/plugins/**', 'src/lib/**', 'src/events/**', 'src/jobs/**'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['#api/modules/*/*'],
        message: 'Import modules through their public #api/modules/<domain> entry point.'
      }, {
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
