import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
export default [{
  files: ['src/account/**/*.{js,jsx}', 'tests/native-{account,room,privacy}.test.mjs'],
  ...js.configs.recommended,
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } },
    globals: { ...globals.browser, ...globals.node, wx: 'readonly' } },
  plugins: { 'react-hooks': reactHooks },
  rules: { ...js.configs.recommended.rules, 'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn', 'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }] }
}]
