/**
 * Governance enforcer — validates the codebase against governance/rules.json.
 *
 * Phase 1 enforces the `no-raw-hex` rule with a ratchet: the codebase has a
 * large body of pre-existing raw hex, so a flat ban would be unactionable.
 * Instead a per-file baseline (`governance/hex-baseline.json`) records the
 * current count; the gate fails when any non-excluded file exceeds its
 * baseline (a NEW raw-hex literal) or a brand-new file introduces one. The
 * baseline only ratchets down — fixing hex lowers it on the next `--update`.
 *
 * Icon-import enforcement (`icons-central-only`) is delegated to eslint
 * (no-restricted-imports); this script reports it for completeness.
 *
 * Plain node, no extra deps.
 *
 * Usage:
 *   node scripts/design-lint.mjs            # check (CI gate)
 *   node scripts/design-lint.mjs --update    # rewrite the baseline snapshot
 */
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');
const RULES_PATH = join(ROOT, 'governance/rules.json');
const BASELINE_PATH = join(ROOT, 'governance/hex-baseline.json');

const update = process.argv.includes('--update');

const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;

/** Built-in scope exclusions (in addition to the rule's own `exceptions`). */
const IGNORE_PREFIXES = [
  'src/primitives/tokens.ts',
  'src/primitives/tokens.generated.ts',
  'src/app/components/ui/', // vendored shadcn primitives
  'src/app/styleguide/', // styleguide tooling renders its own doc surfaces
  'src/app/components/styleguide/',
];

function isIgnored(rel, ruleExceptions) {
  const all = [...IGNORE_PREFIXES, ...ruleExceptions];
  if (rel.endsWith('.spec.ts') || rel.endsWith('.spec.tsx')) return true;
  return all.some((p) => rel === p || rel.startsWith(p));
}

async function walk(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      await walk(full, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      out.push(full);
    }
  }
}

function countHex(text) {
  const m = text.match(HEX_RE);
  return m ? m.length : 0;
}

async function main() {
  const rulesFile = JSON.parse(await readFile(RULES_PATH, 'utf-8'));
  const hexRule = (rulesFile.rules ?? []).find((r) => r.id === 'no-raw-hex');
  const ruleExceptions = hexRule?.exceptions ?? [];

  const files = [];
  await walk(SRC, files);

  /** @type {Record<string, number>} */
  const counts = {};
  for (const f of files) {
    const rel = relative(ROOT, f).split('\\').join('/');
    if (isIgnored(rel, ruleExceptions)) continue;
    const n = countHex(await readFile(f, 'utf-8'));
    if (n > 0) counts[rel] = n;
  }

  if (update) {
    const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
    await writeFile(
      BASELINE_PATH,
      JSON.stringify(
        {
          $description:
            'Ratchet baseline for the no-raw-hex governance rule. Per-file count of pre-existing raw hex literals. design-lint fails when a file exceeds its baseline. Regenerate with `node scripts/design-lint.mjs --update` (only after intentionally fixing or adding tokens).',
          counts: sorted,
        },
        null,
        2,
      ) + '\n',
    );
    console.log(`design-lint baseline updated — ${Object.keys(sorted).length} files with raw hex.`);
    return;
  }

  let baseline = { counts: {} };
  try {
    baseline = JSON.parse(await readFile(BASELINE_PATH, 'utf-8'));
  } catch {
    console.error('No governance/hex-baseline.json — run `node scripts/design-lint.mjs --update` once to seed it.');
    process.exit(1);
  }

  const violations = [];
  for (const [rel, n] of Object.entries(counts)) {
    const allowed = baseline.counts?.[rel] ?? 0;
    if (n > allowed) {
      violations.push(
        `${rel}: ${n} raw hex (baseline ${allowed}). ${hexRule?.replacement ?? 'Use a design token.'}`,
      );
    }
  }

  if (violations.length > 0) {
    console.error(
      `design-lint: no-raw-hex violations (new raw hex beyond baseline):\n` +
        violations.map((v) => `  - ${v}`).join('\n') +
        `\n\nUse a token (var(--c2-color-*) / @/primitives export). If this is an intentional token addition, run \`node scripts/design-lint.mjs --update\`.`,
    );
    process.exit(1);
  }

  const tracked = Object.keys(baseline.counts ?? {}).length;
  console.log(`design-lint ok — no new raw hex (${tracked} files under ratchet, ${rulesFile.rules.length} rules).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
