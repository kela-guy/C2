/**
 * Governance-scoped ESLint config — the single source of the design-system
 * lint rules (icons + raw hex). Kept separate from the full `eslint.config.js`
 * so `pnpm design:check` can enforce design-system governance repo-wide without
 * being blocked by the legacy lint backlog the full config surfaces.
 *
 * The full config (`eslint.config.js`) imports {@link governanceConfigs} so the
 * rules live in exactly one place.
 *
 * Run standalone: `eslint -c eslint.governance.config.js .`
 */
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/** Whole-string hex literal — `#abc`, `#abcd`, `#aabbcc`, `#aabbccdd`. */
const HEX_LITERAL_SELECTOR =
  "Literal[value=/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]";

/**
 * Reusable design-system governance rule blocks. Imported by the full config
 * and used directly by the standalone config below.
 */
export const governanceConfigs = [
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Governance rule `icons-central-only`: glyphs come from the central
      // wrapper, never lucide-react directly.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'lucide-react',
              message:
                "Import icons from '@/lib/icons/central' instead of 'lucide-react'. " +
                'If the icon is missing, add it to that wrapper (prefer a Central glyph).',
            },
          ],
        },
      ],
      // Governance rule `no-raw-hex`: a warning here (the hard gate is the
      // ratchet in scripts/design-lint.mjs). Colors live only in tokens/*.json.
      'no-restricted-syntax': [
        'warn',
        {
          selector: HEX_LITERAL_SELECTOR,
          message:
            'Raw hex color — use a design token: var(--c2-color-*) / var(--c2-threat-*) or a @/primitives export (SURFACE, CARD_TOKENS). See governance/rules.json#no-raw-hex.',
        },
      ],
    },
  },
  {
    // Token sources own the raw values; vendored UI + styleguide tooling render
    // their own doc/control surfaces and predate the central wrapper.
    files: [
      'src/lib/icons/central.ts',
      'src/lib/iconRegistry.ts',
      'src/app/components/ui/**',
      'src/app/components/styleguide/**',
      'src/app/styleguide/**',
      'src/primitives/tokens.ts',
      'src/primitives/tokens.generated.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-syntax': 'off',
    },
  },
];

export default [
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    // Register react-hooks so inline `eslint-disable react-hooks/*` directives
    // scattered through the source resolve (the rules stay off here — this
    // config only enforces design-system governance).
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
  },
  ...governanceConfigs,
];
