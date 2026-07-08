/**
 * Governance check: `src/primitives/accentHex.ts` must be a faithful mirror
 * of the OKLCH tokens in `src/styles/palette.css` — generated, not
 * hand-mirrored. Fails CI when a checked-in hex drifts more than 1/255 per
 * sRGB channel from the palette's oklch() source of truth.
 *
 * OKLCH math + palette parsing live in scripts/lib/palette.mjs (shared
 * with styleguide-manifest.mjs, which resolves `{palette.*}` token
 * references against the same source).
 *
 * Usage:  node scripts/accenthex-check.mjs
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { oklchToHex, parsePalette } from './lib/palette.mjs';

const ROOT = join(import.meta.dirname, '..');

function hexToRgb(hex) {
  const s = hex.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

/** The accentHex exports that mirror a palette token, keyed by CSS var name. */
const MIRRORS = [
  // SLATE_HEX steps
  ...Array.from({ length: 12 }, (_, i) => ({
    cssVar: `slate-${i + 1}`,
    label: `SLATE_HEX[${i + 1}]`,
    tsPattern: new RegExp(`^\\s*${i + 1}:\\s*'(#[0-9a-f]{6})'`, 'm'),
  })),
  // ACCENT_HEX vivid + soft tiers
  ...[
    ['accent-danger', 'danger'],
    ['accent-warning', 'warning'],
    ['accent-tracking', 'tracking'],
    ['accent-success', 'success'],
    ['accent-info', 'info'],
    ['accent-historical', 'historical'],
    ['accent-cyan', 'cyan'],
    ['accent-magenta', 'magenta'],
    ['accent-danger-soft', 'dangerSoft'],
    ['accent-warning-soft', 'warningSoft'],
    ['accent-success-soft', 'successSoft'],
    ['accent-info-soft', 'infoSoft'],
  ].map(([cssVar, key]) => ({
    cssVar,
    label: `ACCENT_HEX.${key}`,
    tsPattern: new RegExp(`^\\s*${key}:\\s*'(#[0-9a-f]{6})'`, 'm'),
  })),
  // DISPOSITION_HEX
  ...[
    ['disposition-suspect', 'suspect'],
    ['disposition-assumed-friend', 'assumedFriend'],
    ['disposition-neutral', 'neutral'],
  ].map(([cssVar, key]) => ({
    cssVar,
    label: `DISPOSITION_HEX.${key}`,
    tsPattern: new RegExp(`^\\s*${key}:\\s*'(#[0-9a-f]{6})'`, 'm'),
  })),
];

const TOLERANCE = 1; // per sRGB channel, absorbs rounding differences

async function main() {
  const css = await readFile(join(ROOT, 'src/styles/palette.css'), 'utf-8');
  const ts = await readFile(join(ROOT, 'src/primitives/accentHex.ts'), 'utf-8');
  const palette = parsePalette(css);

  const failures = [];
  for (const { cssVar, label, tsPattern } of MIRRORS) {
    const oklch = palette.get(cssVar)?.oklch;
    if (!oklch) {
      failures.push(`${label}: --${cssVar} not found in palette.css`);
      continue;
    }
    const m = ts.match(tsPattern);
    if (!m) {
      failures.push(`${label}: export not found in accentHex.ts`);
      continue;
    }
    const expected = oklchToHex(...oklch);
    const actual = hexToRgb(m[1]);
    const drift = Math.max(
      Math.abs(expected[0] - actual[0]),
      Math.abs(expected[1] - actual[1]),
      Math.abs(expected[2] - actual[2]),
    );
    if (drift > TOLERANCE) {
      const hex = `#${expected.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
      failures.push(
        `${label} = ${m[1]} but --${cssVar} (oklch(${oklch.join(' ')})) converts to ${hex} (channel drift ${drift})`,
      );
    }
  }

  if (failures.length > 0) {
    console.error(
      'accenthex-check: accentHex.ts has drifted from palette.css:\n' +
        failures.map((f) => `  - ${f}`).join('\n') +
        '\n\npalette.css is the source of truth — regenerate the hex mirror instead of hand-editing it.',
    );
    process.exit(1);
  }
  console.log(`accenthex-check ok — ${MIRRORS.length} mirrored tokens match palette.css.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
