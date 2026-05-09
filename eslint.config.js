import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const styleRules = {
  indent: ['error', 2],
  'no-tabs': 'error',
  quotes: ['error', 'single', { avoidEscape: true }],
  semi: ['error', 'never'],
  'no-restricted-syntax': [
    'error',
    {
      selector:
        "VariableDeclaration:has(VariableDeclarator[id.name=/^[A-Z]/][init.type='ArrowFunctionExpression'])",
      message:
        'Use function declarations for React components, for example: function App() { return (...) }',
    },
  ],
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: styleRules,
  },
  {
    files: ['**/*.jsx'],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
  },
])
