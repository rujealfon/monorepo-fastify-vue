import antfu from '@antfu/eslint-config'

const defaultIgnores = [
  'dist/**',
  'dist-ssr/**',
  'coverage/**',
  'migrations/**',
  'node_modules/**',
  '**/.vite/**',
  '**/cypress/screenshots/**',
  '**/cypress/videos/**',
  '**/cypress/downloads/**',
  '**/*.md',
  '**/*.tsbuildinfo'
]

export default function createConfig(options = {}, ...userConfigs) {
  const { ignores = [], ...antfuOptions } = options

  return antfu({
    type: 'app',
    typescript: true,
    formatters: {
      css: true,
      html: true,
      markdown: 'prettier'
    },
    stylistic: true,
    ...antfuOptions,
    ignores: [...defaultIgnores, ...ignores]
  }, {
    rules: {
      'antfu/no-top-level-await': 'off',
      'no-console': ['warn'],
      'node/no-process-env': ['error'],
      'node/prefer-global/process': 'off',
      'perfectionist/sort-imports': ['error'],
      'style/comma-dangle': ['error', 'never'],
      'ts/consistent-type-definitions': ['error', 'type'],
      'unicorn/filename-case': ['error', {
        case: 'kebabCase',
        ignore: [/\.md$/]
      }]
    }
  }, {
    files: ['**/*.d.ts'],
    rules: {
      'ts/consistent-type-definitions': ['error', 'interface']
    }
  }, {
    files: ['**/modules/tasks/tasks.schema.ts'],
    rules: {
      'ts/no-redeclare': 'off'
    }
  }, ...userConfigs)
}
