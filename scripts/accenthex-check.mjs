/**
 * Governance check: `src/primitives/accentHex.ts` must be a faithful mirror
 * of the OKLCH tokens in `src/styles/palette.css` — generated, not
 * hand-mirrored. Fails CI when a checked-in hex drifts more than 1/255 per
 * sRGB channel from the palette's oklch() source of truth.
 *
 * Plain node, no deps: implements the standard OKLCH → linear sRGB → sRGB
 * pipeline (CSS Color 4 matrices).
 *
 * Usage:  node scripts/accenthex-check.mjs
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

/** OKLCH → sRGB hex (CSS Color 4 reference math, channels clamped). */
function oklchToHex(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toSrgb = (c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.min(255, Math.max(0, Math.round(v * 255)));
  };
  return [toSrgb(rLin), toSrgb(gLin), toSrgb(bLin)];
}

function hexToRgb(hex) {
  const s = hex.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

/** Pull `--name: oklch(L C H);` declarations out of the palette's dark :root. */
function parsePaletteOklch(css) {
  const out = new Map();
  // Only the dark-mode (default) declarations — stop each search at the
  // first occurrence so the `.light` re-declarations don't win.
  const re = /--([a-z0-9-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g;
  for (const m of css.matchAll(re)) {
    const [, name, L, C, H] = m;
    if (!out.has(name)) out.set(name, [Number(L), Number(C), Number(H)]);
  }
  return out;
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
  const palette = parsePaletteOklch(css);

  const failures = [];
  for (const { cssVar, label, tsPattern } of MIRRORS) {
    const oklch = palette.get(cssVar);
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
