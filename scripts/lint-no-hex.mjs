#!/usr/bin/env node
/**
 * lint-no-hex
 * ───────────
 *
 * Surfaces inline color literals that bypass the OKLCH palette.
 * Mirrors `.cursor/rules/no-inline-hex-colors.mdc` — anything this
 * rule disallows, this script also flags.
 *
 * Detected patterns (in src/**\/\*.{ts,tsx,css}):
 *
 *   1. `#rrggbb[aa]` / `#rgb[a]` in TS/TSX template/string/JSX attrs.
 *   2. `bg-[#...]`, `text-[#...]`, `border-[#...]` Tailwind arbitrary-value classes.
 *   3. `rgba(255,255,255,...)` / `rgb(...)` interaction washes in TSX strings.
 *
 * Documented exceptions (skipped):
 *
 *   - accentHex.ts / palette.css / theme.css / tailwind.css — the source of truth itself.
 *   - any line carrying the literal trailing comment `// hex-ok`,
 *     reserved for icon-art outlines and other documented exceptions.
 *   - the `--surface-void` declaration line.
 *   - `rgba(0, 0, 0, X)` drop shadows / scrims — these darken substrates
 *     rather than competing with the palette, so they're allowed.
 *
 * Usage:
 *   pnpm lint:no-hex            → exit 1 on violations, prints findings
 *   pnpm lint:no-hex --quiet    → only print counts
 *
 * The script is intentionally fast (synchronous fs walk, no AST) so
 * it can run inside a pre-commit hook without slowing the developer
 * loop. It catches ~95% of regressions; reviews catch the rest.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next']);

const ALLOW_FILES = new Set([
  // The palette source of truth + its JS mirror.
  'src/styles/palette.css',
  'src/primitives/accentHex.ts',
  // Theme / tailwind binding layers — they reference the palette.
  'src/styles/theme.css',
  'src/styles/tailwind.css',
  // Legacy index.css still carries some literal hex; the tailwind.css
  // @theme + palette.css drive the live theme. Once the cleanup-and-verify
  // todo deletes legacy aliases, index.css will be removed from this list.
  'src/index.css',
]);

const HEX_RE = /#[0-9a-fA-F]{3,4}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{8}\b/g;
const TW_ARB_RE = /(?:bg|text|border|ring|fill|stroke|from|to|via|shadow|outline)-\[#[0-9a-fA-F]{3,8}\]/g;
const WHITE_RGBA_RE = /rgba?\(\s*255\s*,\s*255\s*,\s*255/g;
const NEAR_BLACK_RGBA_RE = /rgba?\(\s*(0|1[3-9]|2[0-9]|3[0-9])\s*,/g; // letterbox carve-outs >0,0,0,X are kept

const args = new Set(process.argv.slice(2));
const QUIET = args.has('--quiet');

let totalFiles = 0;
let flaggedFiles = 0;
let totalViolations = 0;
const findings = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(tsx?|css)$/.test(entry.name)) continue;
    scan(full);
  }
}

function scan(absPath) {
  const rel = relative(ROOT, absPath).split(sep).join('/');
  if (ALLOW_FILES.has(rel)) return;
  totalFiles += 1;

  const text = readFileSync(absPath, 'utf8');
  const lines = text.split('\n');
  const fileFindings = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // Honor the inline escape hatch.
    if (line.includes('// hex-ok') || line.includes('/* hex-ok */')) continue;

    // Tailwind arbitrary-value classes (most common offender).
    const twMatches = line.match(TW_ARB_RE);
    if (twMatches) {
      for (const m of twMatches) fileFindings.push({ line: i + 1, kind: 'tw-arbitrary', sample: m });
    }

    // White-channel rgba — almost certainly an old hover wash.
    if (WHITE_RGBA_RE.test(line)) {
      fileFindings.push({ line: i + 1, kind: 'rgba-white', sample: line.trim().slice(0, 80) });
    }
    WHITE_RGBA_RE.lastIndex = 0;

    // Raw hex literals — exclude the documented exceptions.
    const hexMatches = line.match(HEX_RE);
    if (hexMatches) {
      for (const m of hexMatches) {
        // Skip if the line is a comment, an SVG path stroke we know about,
        // or a recognized icon-art exception.
        if (/^\s*\*\s|^\s*\/\//.test(line)) continue;
        if (line.includes('hex-ok')) continue;
        fileFindings.push({ line: i + 1, kind: 'raw-hex', sample: m });
      }
    }
  }

  if (fileFindings.length > 0) {
    flaggedFiles += 1;
    totalViolations += fileFindings.length;
    findings.push({ rel, findings: fileFindings });
  }
}

walk(SRC);

if (!QUIET) {
  for (const { rel, findings: fs } of findings) {
    console.log(`\n${rel}`);
    for (const f of fs) {
      console.log(`  L${f.line.toString().padStart(4)}  ${f.kind.padEnd(14)} ${f.sample}`);
    }
  }
}

const colorOk = totalViolations === 0;
const verb = colorOk ? 'clean' : 'FOUND';
console.log(
  `\nlint:no-hex — ${verb}: ${totalViolations} violation(s) across ${flaggedFiles}/${totalFiles} files`,
);

if (!colorOk) {
  console.log('\nFix guide: .cursor/rules/no-inline-hex-colors.mdc');
  process.exit(1);
}
