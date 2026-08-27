import { readdirSync } from 'node:fs'
import createConfig from '@monorepo-fastify-vue/eslint-config/create-config'
import pluginVitest from '@vitest/eslint-plugin'
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility'

const { plugins: _vitestPlugins, ...vitestRecommended } = pluginVitest.configs.recommended

const noParentImports = {
  group: ['../*'],
  message: 'Use the @/ alias instead of parent-relative (../) imports.'
}

const features = readdirSync(new URL('./src/features', import.meta.url), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)

export default createConfig({
  vue: true,
  ignores: ['dist-ssr/**', 'coverage/**']
}, ...pluginVueA11y.configs['flat/recommended'], {
  rules: {
    'node/no-process-env': 'off',
    'unicorn/filename-case': 'off'
  }
}, {
  // Path alias: import from src/ via @/ instead of climbing with ../
  files: ['src/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [noParentImports] }]
  }
}, ...features.map(feature => ({
  // Cross-feature access is allowed only through the feature's index.ts.
  files: [`src/features/${feature}/**`],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/features/*/*', `!@/features/${feature}/**`],
        message: 'Import another feature through its public @/features/<feature> entry point.'
      }, noParentImports]
    }]
  }
})), {
  files: ['src/shared/**'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/features/**'],
        message: 'Shared code cannot depend on features.'
      }, noParentImports]
    }]
  }
}, {
  ...vitestRecommended,
  files: ['src/**/__tests__/*', 'src/**/*.spec.ts']
})
