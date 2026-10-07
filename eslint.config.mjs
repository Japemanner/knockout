import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedGlobalConfigs: {
    js: js.configs.recommended,
  },
})

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'dist/**',
      'coverage/**',
      'src/types/database.types.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Bewust ongebruikte parameters (noop-implementaties, destructuring-rests,
      // event-handlers zonder body) krijgen een _-prefix.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
]

export default eslintConfig