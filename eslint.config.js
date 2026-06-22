import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { governanceConfigs } from './eslint.governance.config.js'

// Design-system governance rules (icons + raw hex) live in
// eslint.governance.config.js so `pnpm design:check` and the full lint share a
// single source. The blocks are spread in last so their file-scoped overrides
// win over the recommended sets above.
export default defineConfig([globalIgnores(['dist']), {
  files: ['**/*.{ts,tsx}'],
  extends: [
    js.configs.recommended,
    tseslint.configs.recommended,
    reactHooks.configs.flat.recommended,
    reactRefresh.configs.vite,
  ],
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser,
  },
}, ...governanceConfigs])
