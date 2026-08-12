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
}, ...modules.flatMap((module) => {
  // Flat config doesn't merge rule options across matching configs — for a given
  // file, the last matching config wins the whole 'no-restricted-imports' option,
  // it doesn't concatenate 'patterns'. So every block below (base + each layer)
  // repeats boundaryPattern and parentRelativePattern to keep them enforced.
  const boundaryPattern = {
    group: ['#api/modules/*/*', `!#api/modules/${module}/**`],
    message: 'Import another module through its public #api/modules/<domain> entry point.'
  }
  const parentRelativePattern = {
    group: ['../*'],
    message: 'Use the #api/ alias instead of parent-relative (../) imports.'
  }

  return [{
    files: [`src/modules/${module}/**`],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [boundaryPattern, parentRelativePattern]
      }]
    }
  }, {
    // *.schema.ts files may deep-import another module's *.schema.js to reference
    // its Drizzle tables for foreign keys (mirrors db/schema/index.ts, which does
    // the same to compose module-owned tables). Schema files must stay free of
    // route/handler/service/config side effects for this to be safe: drizzle-kit
    // loads this file directly to generate migrations, outside the app's normal
    // runtime, and a module's public entry point can pull in config parsing or
    // other eager work (e.g. the knowledge module's corpus load) that isn't safe
    // in that context.
    files: [`src/modules/${module}/*.schema.ts`],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['#api/modules/*/*', `!#api/modules/${module}/**`, '!#api/modules/*/*.schema.js'],
          message: 'Import another module through its public #api/modules/<domain> entry point, except *.schema.js for composing Drizzle table references.'
        }, parentRelativePattern]
      }]
    }
  }, {
    // Preserve route -> handler -> service -> repository dependency direction within a module
    files: [`src/modules/${module}/*.routes.ts`],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [boundaryPattern, parentRelativePattern, {
          group: ['./*.service.js', './*.repository.js', '#api/modules/*/*.service.js', '#api/modules/*/*.repository.js'],
          message: 'Routes must not import service or repository directly; call through handlers.'
        }]
      }]
    }
  }, {
    files: [`src/modules/${module}/*.handlers.ts`],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [boundaryPattern, parentRelativePattern, {
          group: ['./*.routes.js', './*.repository.js', '#api/modules/*/*.routes.js', '#api/modules/*/*.repository.js'],
          message: 'Handlers must not import routes or repository directly; call through the module service.'
        }]
      }]
    }
  }, {
    files: [`src/modules/${module}/*.service.ts`],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [boundaryPattern, parentRelativePattern, {
          group: ['./*.routes.js', './*.handlers.js', '#api/modules/*/*.routes.js', '#api/modules/*/*.handlers.js'],
          message: 'Service must not import routes or handlers; keep dependency direction route -> handler -> service -> repository.'
        }]
      }]
    }
  }, {
    files: [`src/modules/${module}/*.repository.ts`],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [boundaryPattern, parentRelativePattern, {
          group: ['./*.routes.js', './*.handlers.js', './*.service.js', '#api/modules/*/*.routes.js', '#api/modules/*/*.handlers.js', '#api/modules/*/*.service.js'],
          message: 'Repository must not import routes, handlers, or service; keep dependency direction route -> handler -> service -> repository.'
        }]
      }]
    }
  }]
}), {
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
