import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

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
  rules: {
    // Central Icons (iconists) is the project's single icon source. App code
    // must import glyphs from `@/lib/icons/central`, never from `lucide-react`
    // directly. The wrapper is the only module allowed to know lucide exists.
    'no-restricted-imports': ['error', {
      paths: [{
        name: 'lucide-react',
        message:
          "Import icons from '@/lib/icons/central' instead of 'lucide-react'. " +
          'If the icon is missing, add it to that wrapper (prefer a Central glyph).',
      }],
    }],
  },
}, {
  // Sanctioned exceptions that may touch `lucide-react` directly:
  //  - the Central wrapper itself (re-exports / documented pass-throughs)
  //  - the styleguide icon registry + Icon Library tooling
  //  - shadcn/ui primitives (forking each to swap a chevron is high-risk,
  //    near-invisible payoff — documented in src/lib/icons/central.ts)
  files: [
    'src/lib/icons/central.ts',
    'src/lib/iconRegistry.ts',
    'src/app/components/ui/**',
    'src/app/components/styleguide/**',
  ],
  rules: {
    'no-restricted-imports': 'off',
  },
}])
