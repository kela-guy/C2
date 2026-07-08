/**
 * Shared palette math + parser for the design-token pipeline.
 *
 * `src/styles/palette.css` is the hand-authored value master for color.
 * Two scripts consume it through this module:
 *
 *   - scripts/accenthex-check.mjs   — verifies the accentHex.ts hex mirror
 *   - scripts/styleguide-manifest.mjs — resolves `{palette.*}` references
 *     in tokens/core.json when generating the token artifacts
 *
 * Plain node, no deps.
 */

/** OKLCH → sRGB [r,g,b] 0..255 (CSS Color 4 reference math, channels clamped). */
export function oklchToHex(L, C, Hdeg) {
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

/** [r,g,b] → `#rrggbb`. */
export function rgbToHexString([r, g, b]) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Parse `--name: oklch(L C H)` and `--name: var(--other)` declarations out
 * of palette.css into a Map of `name → { oklch: [L, C, H] }`.
 *
 * Rules:
 *   - First occurrence wins, so the dark `:root` block beats the `.light`
 *     re-declarations.
 *   - `var()` chains are followed until they land on an oklch literal
 *     (`--surface-1: var(--slate-1)` resolves to slate-1's OKLCH).
 *   - Anything else (alpha'd oklch, color-mix, shadows) is skipped — the
 *     token JSON must not reference those.
 */
export function parsePalette(css) {
  const literals = new Map();
  const literalRe = /--([a-z0-9-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g;
  for (const m of css.matchAll(literalRe)) {
    const [, name, L, C, H] = m;
    if (!literals.has(name)) literals.set(name, [Number(L), Number(C), Number(H)]);
  }

  const aliases = new Map();
  const aliasRe = /--([a-z0-9-]+):\s*var\(--([a-z0-9-]+)\)/g;
  for (const m of css.matchAll(aliasRe)) {
    if (!aliases.has(m[1])) aliases.set(m[1], m[2]);
  }

  const out = new Map();
  for (const [name, oklch] of literals) out.set(name, { oklch });
  for (const [name, target] of aliases) {
    if (out.has(name)) continue;
    let cur = target;
    const seen = new Set([name]);
    while (aliases.has(cur) && !literals.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      cur = aliases.get(cur);
    }
    if (literals.has(cur)) out.set(name, { oklch: literals.get(cur) });
  }
  return out;
}
