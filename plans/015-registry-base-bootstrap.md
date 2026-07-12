# Plan 015: Ship the @c2/base registry bootstrap (registry-foundation Phase 1)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 805086b..HEAD -- registry.json src/styles/palette.css src/styles/theme.css design-system.md scripts/registry-postbuild.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" description against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED (the shadcn CLI CSS round-trip is an acknowledged unknown — the plan is structured so the spike happens FIRST)
- **Depends on**: none (plan 013 adds a docs warning that this plan later removes)
- **Category**: direction
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

The repo ships a shadcn-compatible registry (`registry.json`, ~70 items,
served from `https://c2-hub-three.vercel.app/r/{name}.json`) and its docs tell
internal consumers to run `npx shadcn@latest add @c2/domain-primitives`. But
no registry item distributes the token/theme CSS the components depend on
(`--surface-*`, `--slate-1..12`, `--accent-*`, `@theme inline`,
`@custom-variant dark/rtl/ltr` — all defined only in `src/styles/palette.css`
and `src/styles/theme.css`). A fresh install therefore renders visually
broken. `docs/registry-foundation-plan.md` §4 calls this "the keystone gap"
and §6 defines Phase 1 — this plan executes exactly that Phase 1, honoring the
decisions already locked in that doc (single `@c2` namespace, internal
audience, no auth).

## Current state

**Read `docs/registry-foundation-plan.md` in full before starting** — it is
the authoritative spec for this work and this plan defers to it on every
design decision. Key facts:

- `registry.json` — the index; items are `registry:ui` / bundles; **no**
  `registry:base` or `registry:theme` item exists (verify:
  `rg -n "registry:base|registry:theme" registry.json` → no matches).
- Build pipeline: `pnpm registry:build` = `shadcn build` (shadcn CLI ^4.1.2 in
  devDependencies) + `scripts/registry-postbuild.mjs` (import-path rewrites),
  emitting `public/r/*.json`.
- Token sources (single source of truth, do not fork them):
  - `src/styles/palette.css` — slate ramp, surface ladder, accents, state
    overlays, `.light` opt-in block.
  - `src/styles/theme.css` — `@theme inline` mapping, `@custom-variant`
    declarations, `@layer base` resets, keyframes.
- The known risk (foundation plan §5): it is **unverified** that the shadcn
  CLI's `css` JSON serialization round-trips Tailwind-v4 at-rules
  (`@theme inline`, `@custom-variant`). The documented fallback: ship those
  at-rules as a `registry:file` CSS partial that consumers `@import`,
  referenced from `base`.
- Open decisions the foundation plan leaves to the maintainer (§8) — resolve
  them as follows for this plan (the maintainer approved this plan knowing
  these defaults): style name `"c2"`; core primitive set as proposed in §8;
  scratch stack Vite + React 18 + Tailwind v4; **dark-only** in base with
  light as a documented opt-in (production is dark-only).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Registry build | `pnpm registry:build` | exit 0; `public/r/base.json` emitted |
| Manifest guard | `pnpm styleguide:check` | exit 0 (not regressed) |
| App build | `pnpm build` | exit 0 |
| Scratch app | `pnpm create vite@latest` (in a temp dir OUTSIDE the repo) | standard scaffold |

## Scope

**In scope**:
- `registry.json` (add `base`, `theme` items; wire `registryDependencies`)
- New registry source files as needed (e.g. a generated or authored
  `src/registry/base.css` partial if the fallback path is taken — follow the
  foundation plan's §9 mitigation: prefer *generating* cssVars from
  `palette.css` via a small script over hand-duplicating; if you add a
  generator, put it in `scripts/` and wire it into `registry:build`)
- `scripts/` (only if the generator is added)
- `design-system.md` (replace plan 013's interim warning with `@c2/base`
  install instructions)
- `public/r/` (build output)
- A scratch app in a temp directory outside the repo (disposable)

**Out of scope** (do NOT touch):
- `src/styles/*.css` — read-only sources.
- Phases 2-5 of the foundation plan (fonts, import-graph fixes, CI guards,
  auth) — explicitly deferred.
- Existing component items' `files`/`registryDependencies` (Phase 3 territory)
  EXCEPT adding `base`-related wiring where the foundation plan requires it.

## Git workflow

- Branch: `advisor/015-registry-base`
- Commit per step; style: `feat(registry): add @c2/base theme bootstrap`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: The de-risking spike FIRST (foundation plan §5 warning)

Before authoring the real item: create a minimal `registry:base` item
containing a token subset (a few cssVars + one `@custom-variant` + a tiny
`@theme inline` block), `pnpm registry:build`, scaffold a scratch Vite +
React 18 + Tailwind v4 app in a temp dir, and `shadcn add` the emitted JSON
into it (use the local file URL or a `file:` path — the CLI accepts URLs;
serving `public/r/` with `npx serve` works too).

**Decision gate**: inspect the CSS the CLI writes into the scratch app.
- If `@theme inline` and `@custom-variant` survive → proceed with the full
  `css` field approach (Step 2a).
- If they are mangled/dropped → take the documented fallback (Step 2b):
  at-rules ship as a `registry:file` CSS partial.

Record which branch you took and paste the evidence (the emitted CSS snippet)
in your report.

### Step 2: Author the full @c2/base (and thin @c2/theme)

Per the foundation plan §5 "What `@c2/base` will carry": `config` (style
`"c2"`, `rtl: true`, aliases, the `@c2` registry URL), full dark-token
`cssVars` translated from `palette.css` + `theme.css`, the `css` block (or
`registry:file` partial per Step 1's gate), dependencies
(`class-variance-authority`, `tailwind-merge`, `clsx`, `tw-animate-css`,
`lucide-react`), and `registryDependencies` (`utils` + the §8 core primitive
set). Add the thin `@c2/theme` (cssVars only). Prefer generating the cssVars
from the CSS sources with a script wired into `registry:build` (§9
mitigation) — hand-duplication is acceptable only if generation proves
disproportionate; justify in NOTES.

**Verify**: `pnpm registry:build` → exit 0; `public/r/base.json` and
`public/r/theme.json` exist and JSON-parse.

### Step 3: Acceptance test in the scratch app (foundation plan §6 Phase 1)

In a fresh scratch app: install `@c2/base` (from the locally served
`public/r/`), then `@c2/button`. Render the button.

**Verify** (this is the plan's acceptance criterion): the button renders with
correct C2 styling — dark surface, C2 accent, correct radius — i.e. the CSS
variables it references are all defined. Check computed styles or visually;
state exactly how you verified.

### Step 4: Update consumer docs

In `design-system.md`: replace the interim "tokens not distributed" warning
(added by plan 013 — if 013 hasn't landed, just add the new content) with the
real bootstrap instructions: `npx shadcn@latest add @c2/base` before any
component install, plus the dark-only note and light-mode opt-in pointer.

**Verify**: `pnpm styleguide:check` → exit 0 (not regressed);
`pnpm build` → exit 0.

## Test plan

The scratch-app acceptance (Step 3) is the test. Additionally: re-run
`pnpm registry:build` twice and confirm idempotent output (no diff between
runs) so CI can later build it reproducibly.

## Done criteria

ALL must hold:

- [ ] `rg -n '"registry:base"' registry.json` → 1 match; `public/r/base.json` builds
- [ ] Scratch-app acceptance passed (button styled correctly after `base` + `button` install) with evidence in the report
- [ ] `pnpm registry:build` exits 0 and is idempotent
- [ ] `pnpm styleguide:check` and `pnpm build` exit 0
- [ ] `design-system.md` documents the `@c2/base` bootstrap
- [ ] No `src/styles/*.css` file modified (`git status`)
- [ ] `plans/README.md` status row updated (unless the reviewer maintains the index)

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's spike shows the CLI mangles the CSS AND the `registry:file`
  fallback also fails to deliver working styles in the scratch app — the
  foundation plan's premise needs revisiting.
- The shadcn CLI version in the repo (`shadcn@^4.1.2`) does not support
  `registry:base` (check `npx shadcn build --help` / docs) — report the
  version gap; do not upgrade the CLI without flagging it.
- `pnpm styleguide:check` fails after registry.json changes in a way not
  fixable by adding the new items to the manifest exclusions/entries — the
  drift-guard wiring may need a decision.
- The token surface translation (palette.css → cssVars) hits ambiguity the
  foundation plan doesn't resolve (e.g. vars consumed by components but
  defined only in `tokens.generated.css`) — list them, don't guess.

## Maintenance notes

- Token changes in `palette.css`/`theme.css` must flow into `base` — if you
  shipped the generator, it's automatic at `registry:build`; if hand-authored,
  add a comment in both files pointing at the duplication (and flag the
  generator as follow-up).
- Phases 2 (fonts) and 3 (import-graph fixes, e.g. the dangling `urgency`
  import in `target-card`) are the natural next plans once this lands.
- Reviewer: the acceptance evidence (Step 3) is the thing to scrutinize —
  "build passed" without the scratch-app check does not satisfy this plan.
