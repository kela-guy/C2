# Plan 016: One source of truth for color — token JSON references palette.css

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 805086b..HEAD -- tokens/ scripts/styleguide-manifest.mjs scripts/accenthex-check.mjs src/styles/palette.css src/primitives/tokens.ts`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1 (design-system track)
- **Effort**: M
- **Risk**: MEDIUM (build-script surgery; zero intended visual change)
- **Depends on**: none
- **Category**: design-system / governance
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

The repo has two hand-maintained copies of the same color decisions:

1. `src/styles/palette.css` — declares itself "single source of truth for
   color". Hand-authored OKLCH; guarded: `scripts/accenthex-check.mjs`
   fails CI when the `src/primitives/accentHex.ts` hex mirror drifts.
2. `tokens/core.json` — the DTCG token library. 13 of its 15 primitives
   are **hand-copied hex/oklch mirrors** of palette values (the
   `$description`s literally say "= --surface-1"), with **no drift
   guard**.

Everything the design system tells humans and agents flows from #2:
`tokens.generated.css`, `tokens.generated.ts` (consumed at runtime by
`CARD_TOKENS` in `src/primitives/tokens.ts`), `public/DESIGN_CONTEXT.md`,
and `public/llms.txt`. If someone retunes a surface step in `palette.css`,
the entire token contract silently lies, and card UI painted from
`CARD_TOKENS` diverges from CSS-painted UI on screen.

The fix follows the existing `accentHex.ts` precedent, inverted:
`palette.css` stays the hand-authored value master; `tokens/core.json`
becomes a pure naming/intent layer that **references** palette variables
(`{palette.surface-1}`); `scripts/styleguide-manifest.mjs` parses
`palette.css` at build time and resolves the references. After this,
`pnpm design:check` (which already runs `styleguide-manifest.mjs --check`)
fails whenever the generated artifacts are stale relative to *either*
input — the drift hole is closed with no new CI step.

Explicitly rejected alternative: making the DTCG JSON the value master and
generating `palette.css` from it. `palette.css` carries `color-mix()`
derivations, a `.light` theme block, `data-substrate` painting hooks, and
APCA contrast documentation that do not map cleanly into DTCG JSON. That
migration remains a candidate phase 2 (when Figma/Tokens Studio sync makes
JSON-as-master worth it) and is out of scope here.

## Current state

### The duplication (tokens/core.json → palette.css)

Every row below is a hand-copied mirror today. Target reference after this
plan in the right column:

| core.json token | Today (`$value`) | palette.css source | New `$value` |
|---|---|---|---|
| `primitive.color.surface.0` | `#0d0e11` | `--surface-1` | `{palette.surface-1}` |
| `primitive.color.surface.1` | `#15171a` | `--surface-2` | `{palette.surface-2}` |
| `primitive.color.surface.2` | `#1e2124` | `--surface-3` | `{palette.surface-3}` |
| `primitive.color.surface.3` | `#282c30` | `--surface-4` | `{palette.surface-4}` |
| `primitive.color.surface.4` | `#353a40` | `--surface-5` | `{palette.surface-5}` |
| `primitive.color.neutral.200` | `#ced5de` | `--slate-11` | `{palette.slate-11}` |
| `primitive.color.neutral.500` | `#8d949f` | `--slate-9` | `{palette.slate-9}` |
| `primitive.color.red.base` | `oklch(0.395 0.110 27)` | `--accent-danger-soft` | `{palette.accent-danger-soft}` |
| `primitive.color.red.hover` | `oklch(0.445 0.110 27)` | `--accent-danger-soft-hover` | `{palette.accent-danger-soft-hover}` |
| `primitive.color.red.active` | `oklch(0.345 0.110 27)` | `--accent-danger-soft-active` | `{palette.accent-danger-soft-active}` |
| `primitive.color.amber.base` | `oklch(0.420 0.090 70)` | `--accent-warning-soft` | `{palette.accent-warning-soft}` |
| `primitive.color.amber.hover` | `oklch(0.470 0.090 70)` | `--accent-warning-soft-hover` | `{palette.accent-warning-soft-hover}` |
| `primitive.color.amber.active` | `oklch(0.370 0.090 70)` | `--accent-warning-soft-active` | `{palette.accent-warning-soft-active}` |

Unchanged (true literals, not mirrors): `primitive.color.white`,
`primitive.color.black`, the `semantic.*` tier (already `{primitive...}`
references), `dimension`/radius, and all of `tokens/c2-domain.json` (threat
colors are independent values, not palette mirrors — see Maintenance
notes).

### The resolver that will do the work

`scripts/styleguide-manifest.mjs` already resolves DTCG references against
a flat raw index:

```123:133:scripts/styleguide-manifest.mjs
/** Resolve `{a.b.c}` DTCG references against the raw-value index. */
function resolveValue(rawValue, rawIndex, seen = new Set()) {
  if (typeof rawValue !== 'string') return rawValue;
  const ref = rawValue.match(/^\{([^}]+)\}$/);
  if (!ref) return rawValue;
  const target = ref[1];
  if (seen.has(target)) throw new Error(`circular token reference: ${target}`);
  seen.add(target);
  if (!(target in rawIndex)) throw new Error(`unresolved token reference: {${target}}`);
  return resolveValue(rawIndex[target], rawIndex, seen);
}
```

The raw index is built in two places (once in `buildTokenModel`, once in
`main` for `resolvedTree`) — both need the palette entries injected.

### The OKLCH math + palette parser that already exist

`scripts/accenthex-check.mjs` contains `oklchToHex(L, C, Hdeg)` (CSS
Color 4 matrices, lines 18–40) and `parsePaletteOklch(css)` (lines 52–62).
The parser today only matches `oklch(L C H)` literals and takes the first
occurrence (so `.light` re-declarations lose). It does NOT follow `var()`
chains — but `--surface-1..5` are declared as `var(--slate-N)`, so the
shared parser this plan extracts must resolve one level of `var()`
indirection.

### Runtime consumer that requires literal hex

`src/primitives/tokens.ts` feeds resolved token values into inline styles
and `hexToRgba()` (line 117: parses `#rrggbb` only). Therefore the TS
artifact (`tokens.generated.ts`) must keep emitting **hex literals**, not
`oklch()` strings or `var()` references. The CSS artifact
(`tokens.generated.css`) should instead emit `var(--surface-1)` for
palette-referencing tokens so the cascade (including the styleguide's
`.light` preview) stays live.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Regenerate artifacts | `node scripts/styleguide-manifest.mjs` | exit 0, summary line |
| Drift guard | `node scripts/styleguide-manifest.mjs --check` | exit 0, "manifest check ok" |
| Hex-mirror guard | `node scripts/accenthex-check.mjs` | exit 0, "accenthex-check ok" |
| Full design gate | `pnpm design:check` | exit 0 |
| Build | `pnpm build` | exit 0 |

Note (from `plans/README.md`): repo-wide `pnpm lint` and `tsc --noEmit`
fail with pre-existing errors at the base commit. Gates for this plan are
`pnpm design:check`, `pnpm build`, and no *new* lint errors in touched
files.

## Scope

**In scope** (the only files you should modify/create):

- `scripts/lib/palette.mjs` (new — shared OKLCH math + palette parser)
- `scripts/styleguide-manifest.mjs`
- `scripts/accenthex-check.mjs` (import from the shared lib; behavior identical)
- `tokens/core.json`
- `src/styles/palette.css` (header comment only)
- Generated outputs (via the script, never by hand):
  `src/styles/tokens.generated.css`, `src/primitives/tokens.generated.ts`,
  `public/DESIGN_CONTEXT.md`, `public/llms.txt`

**Out of scope** (do NOT touch):

- `tokens/c2-domain.json` — threat colors are not palette mirrors.
- `src/styles/theme.css` — the shadcn semantic layer already references
  palette vars correctly; no duplication there.
- `src/primitives/tokens.ts`, `accentHex.ts` — consumers, unchanged.
- Any Figma/Tokens Studio sync — phase 2, separate plan.
- The uncommitted working-tree changes (onboarding components, plans/,
  `.env.example`, etc.) — leave them alone.

## Git workflow

- Branch: `advisor/016-single-source-color-tokens`
- Suggested commits (conventional style):
  1. `refactor(scripts): extract shared palette parser + oklch math`
  2. `feat(tokens): resolve core.json primitives from palette.css references`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extract the shared palette library

Create `scripts/lib/palette.mjs` exporting:

- `oklchToHex(L, C, Hdeg)` — moved verbatim from
  `accenthex-check.mjs:18-40` (return the `[r,g,b]` array as today; add a
  `rgbToHexString` helper).
- `parsePalette(css)` — based on `parsePaletteOklch` but extended to also
  capture `--name: var(--other);` declarations and resolve that
  indirection against the parsed map (needed for `--surface-1..8` →
  `--slate-N`). Return a Map of `name → { oklch: [L,C,H] }`. Keep the
  first-occurrence rule so `.light` re-declarations are ignored. Ignore
  declarations whose value is neither a plain `oklch(L C H)` nor a
  resolvable `var()` chain (shadows, `color-mix()`, values with alpha —
  none are referenced by core.json).

Update `scripts/accenthex-check.mjs` to import both from the lib and
delete its local copies. No behavior change.

**Verify**: `node scripts/accenthex-check.mjs` → exit 0, same
"accenthex-check ok — 27 mirrored tokens" summary as before the change.

### Step 2: Teach the manifest script to resolve `{palette.*}`

In `scripts/styleguide-manifest.mjs`:

1. Read `src/styles/palette.css` (new constant `PALETTE_PATH`) and parse
   it with `parsePalette`.
2. When building the raw index (both call sites — `buildTokenModel` and
   `main`), add an entry per palette var:
   `rawIndex['palette.' + name] = hex string` (via `oklchToHex`). Factor
   the duplicated index-building into one helper while you're there.
3. Validation: after flattening, for every leaf whose `rawValue` matches
   `{palette.*}`, fail with a clear error if the palette var wasn't
   parsed. (The existing `unresolved token reference` throw already covers
   this — confirm the message includes the token id, improve it if not.)
4. Track which leaves resolved through the palette (e.g. a `paletteVar`
   field on the token model) and change the artifact renderers:
   - `renderTokensCss`: for palette-backed tokens emit
     `var(--surface-1)` instead of the literal, with the resolved hex in
     the trailing comment. All other tokens unchanged.
   - `renderTokensTs`: keep emitting **hex literals** (the resolved
     value) — `CARD_TOKENS`/`hexToRgba` depend on it.
   - `renderDesignContext` / `renderLlmsBlock`: show the resolved hex and
     append the source var, e.g. `#15171a (= --surface-2)`, so agents keep
     getting concrete values.

**Verify**: `node scripts/styleguide-manifest.mjs` → exit 0 (no JSON
changes yet, so outputs must be byte-identical: `git status --short` shows
no generated files modified).

### Step 3: Replace the hand-copied mirrors in tokens/core.json

Apply the 13-row mapping table from "Current state" — each listed
`$value` becomes its `{palette.*}` reference. Keep `$type`, keep the
`$description` prose but delete the now-redundant "(= --surface-N)"
annotations (the reference itself is the link). Update the file-level
`$description` to say primitives may reference `palette.*` (resolved from
`src/styles/palette.css` at build time) and that palette.css is the value
master.

Then regenerate: `node scripts/styleguide-manifest.mjs`.

**Verify** (all three):

1. `git diff src/primitives/tokens.generated.ts` — every changed value is
   a hex string, and each new hex equals the old value within ±1 per sRGB
   channel (the old `#0d0e11`-style values were derived from the same
   OKLCH, so most should be exactly equal; the `oklch(...)` literals for
   red/amber become hex now — spot-check two with
   `node -e` + the lib's `oklchToHex` that they match the palette).
2. `git diff src/styles/tokens.generated.css` — palette-backed tokens now
   read `var(--...)`; no other rows changed.
3. `node scripts/styleguide-manifest.mjs --check` → exit 0.

### Step 4: Prove the drift guard actually fires

Temporarily change `--slate-11`'s L from `0.870` to `0.860` in
`palette.css`, run `node scripts/styleguide-manifest.mjs --check`, and
confirm it now **fails** listing stale generated files. Revert the edit
and confirm `--check` passes again.

**Verify**: both outcomes observed; `git diff src/styles/palette.css`
clean afterward.

### Step 5: Update the palette.css contract comment

In the `palette.css` header (lines 1–89), extend the "Single source of
truth for color" section with 3–4 lines: the DTCG token library
(`tokens/core.json`) references these variables as `{palette.*}`;
`scripts/styleguide-manifest.mjs` resolves them at build time; after
editing values here, run `node scripts/styleguide-manifest.mjs` (or
`pnpm tokens:build`) to refresh the generated artifacts, and CI's
`design:check` fails if you forget.

**Verify**: comment-only diff on `palette.css`.

### Step 6: Final gates

**Verify**:

- `pnpm design:check` → exit 0
- `pnpm build` → exit 0
- `pnpm dev` → open the dashboard, confirm target cards render visually
  unchanged (card surfaces, danger/warning buttons, threat spines).
- `git status --short` → only files in the Scope list modified.

## Test plan

No unit-test infra exists for scripts. Acceptance is: Step 2's
byte-identical regeneration (resolver added, no inputs changed), Step 3's
value-equivalence diff review, Step 4's negative test (guard fires on
palette drift), and Step 6's visual smoke.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `rg -n '\{palette\.' tokens/core.json` → 13 matches
- [ ] `rg -n '#[0-9a-f]{6}|oklch\(' tokens/core.json` → only the `white`,
      `black`, focus/selection-ring rows remain (no surface/neutral/
      red/amber literals)
- [ ] `rg -n 'var\(--' src/styles/tokens.generated.css` → matches for
      every palette-backed token
- [ ] `rg -n "oklch|var\(" src/primitives/tokens.generated.ts` → 0 value
      matches (TS artifact stays hex-literal; comment/description text
      may mention vars)
- [ ] `node scripts/accenthex-check.mjs` → exit 0
- [ ] `pnpm design:check` → exit 0
- [ ] `pnpm build` → exit 0
- [ ] Step 4's negative test documented in the completion report
- [ ] `git status --short` shows no modified files outside Scope
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any "Current state" excerpt no longer matches the live code (drift
  since `805086b`).
- After Step 2 with unchanged JSON, the regenerated artifacts are NOT
  byte-identical — the refactor changed behavior; find out why before
  touching core.json.
- In Step 3, any resolved hex differs from the previously committed value
  by more than 1 per sRGB channel — the mirror was already stale or the
  mapping table is wrong. Report the token; do not "fix" palette.css.
- You find app code consuming a `--c2-*` custom property whose value
  shape changes from hex to `var()` in a way that breaks it (search:
  `rg -n -- '--c2-' src/` — at plan time the only consumers are the
  generated files themselves plus `src/app/styleguide/docs/tokens.doc.tsx`,
  which reads the TS metadata, not computed CSS).
- You are tempted to migrate `tokens/c2-domain.json`, `theme.css`, or the
  shadcn variables — out of scope; note it and move on.

## Maintenance notes

- **Phase 2 (separate plan)**: designer-facing sync. Once the design team
  wants to edit tokens from Figma (Tokens Studio / Figma variables), the
  value master can move from `palette.css` into the DTCG JSON and
  `palette.css`'s variable blocks become a generated artifact. This plan
  deliberately keeps that door open: the JSON's *names and structure* are
  already the contract; only value ownership would flip.
- **Domain-token follow-up**: `tokens/c2-domain.json` threat colors are
  legacy flat hexes (`#ef4444`, `#74c0fc`…) that predate the OKLCH
  accent system. A future design pass could re-anchor them as
  `{palette.accent-*}` references — product/design decision, not a
  mechanical one.
- New-token rule going forward: a core.json primitive that shadows a
  palette value MUST be a `{palette.*}` reference, never a copied
  literal. Worth adding to `governance/rules.json` when the governance
  ruleset next gets attention.
