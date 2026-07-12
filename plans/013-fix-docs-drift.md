# Plan 013: Fix documentation drift (env, README, AGENTS.md, registry metadata)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 805086b..HEAD -- .env.example README.md design-system.md registry.json docs/design-system-discovery.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. **Known at planning time**:
> `.env.example` has uncommitted edits in the user's working tree; in a
> worktree at `805086b` the excerpts below will match.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

Five documentation surfaces are actively wrong or missing, each with a
concrete cost: `.env.example` calls the Cesium map "experimental" when it has
been the production default since the Phase 8 cutover (new devs treat the Ion
token as optional and get a broken map); the README's setup is `pnpm i && pnpm dev`
with no mention that install fails without `CENTRAL_LICENSE_KEY`; there is no
root `AGENTS.md` even though agents execute work here (this plans/ system);
the registry consumer docs advertise `npx shadcn add @c2/domain-primitives`
without warning that installed components reference undefined CSS variables
until the theme bootstrap ships (see `docs/registry-foundation-plan.md` §4.1);
and `registry.json` describes `target-card` with an "accent spine" that was
removed from the component. An older discovery doc also contradicts the newer
registry plan on scope.

## Current state

- `.env.example:4-6` (at `805086b`):

```4:6:.env.example
# Cesium Ion access token — restrict by domain on cesium.com/ion settings.
# Used by the Cesium-based map (sandboxed in styleguide; experimental).
# REQUIRED for the /onboarding concept-video scene: it streams Google
```

  Reality: `src/lib/mapBackend.ts:4-7` — "Default backend is Cesium … following
  the Phase 8 cutover"; the production `/` map is Cesium.
- `README.md:6-11` — setup section is only:

```6:11:README.md
## Running the code

```bash
pnpm i
pnpm dev
```
```

  Missing: copy `.env.example` → `.env.local`, the two `VITE_*` tokens, and
  `CENTRAL_LICENSE_KEY` (which must be exported BEFORE `pnpm install` —
  `.env.example:13-18` documents this but README never points there).
- No `AGENTS.md` / `CLAUDE.md` at repo root (verified).
- `design-system.md:17-30` — quick start jumps straight to
  `npx shadcn@latest add @c2/domain-primitives`. Per
  `docs/registry-foundation-plan.md:33` ("the keystone gap"), installed
  components reference CSS vars (`--surface-*`, `--slate-*`, …) that no
  registry item distributes — first install renders visually broken.
- `registry.json:639-646`:

```json
      "name": "target-card",
      ...
      "description": "Core detection card shell with accent spine, collapsible body, and slot composition.",
```

  Reality: `src/primitives/TargetCard.tsx:18-28` — the accent spine was
  removed; the `accent` prop is `@deprecated`.
- `docs/design-system-discovery.md:27` — "Out of scope: external/CLI registry
  consumers", superseded by `docs/registry-foundation-plan.md:11` ("This
  *supersedes* the 'external/CLI consumers out of scope' line…") — but the old
  doc carries no pointer, so readers can't know.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| JSON validity | `node -e "JSON.parse(require('fs').readFileSync('registry.json','utf8'))"` | exit 0 |
| Manifest guard | `pnpm styleguide:check` | exit 0 (run before AND after — must not regress) |

## Scope

**In scope** (the only files you should modify/create):
- `.env.example`
- `README.md`
- `AGENTS.md` (create)
- `design-system.md`
- `registry.json` (description strings only)
- `docs/design-system-discovery.md` (one supersession note)

**Out of scope** (do NOT touch):
- Any source file; any other `docs/*` file.
- Adding registry items or `registryDependencies` (that's plan 015 territory).
- `docs/cesium-parity.md` (plan 012 owns its Phase 9 rows).

## Git workflow

- Branch: `advisor/013-fix-docs-drift`
- Commit style: `docs: fix env/README/registry drift, add AGENTS.md`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Correct `.env.example`

Rewrite the Cesium token comment (lines 4-6) to state: Cesium is the
**production default map** (Phase 8 cutover — see `src/lib/mapBackend.ts`);
the token is effectively required for normal development, and additionally
required for the `/onboarding` Google Photorealistic 3D Tiles scene. Keep the
existing fallback-behavior sentence and the Mapbox + Central sections as-is.

### Step 2: Expand the README setup section

Replace the "Running the code" section with steps that include:
1. `export CENTRAL_LICENSE_KEY=...` **before** `pnpm i` (link to
   `.env.example` for details), 2. `cp .env.example .env.local` and fill the
   two `VITE_*` tokens, 3. `pnpm dev`. Add one sentence pointing agents/new
   contributors to `AGENTS.md`.

### Step 3: Create `AGENTS.md`

Root-level, concise (≤60 lines), covering exactly:
- Commands: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm design:check`,
  `pnpm registry:build`, plus `pnpm typecheck` / `pnpm test` if plans 005/008
  have landed (check `package.json` scripts at execution time and list only
  what exists).
- Known-broken baselines: repo-wide `pnpm lint` fails with ~382 pre-existing
  errors; `tsc` baseline per `plans/README.md` — gate on scoped
  `npx eslint <files>` for touched files instead.
- Install gotcha: `CENTRAL_LICENSE_KEY` required for `@central-icons-react/*`.
- Env: `VITE_CESIUM_ION_TOKEN` needed for the production map.
- Conventions: icons route through `@/lib/icons/central` (never import
  `lucide-react` directly — see `.cursor/rules/prefer-filled-icons.mdc`);
  conventional-commit style messages (`feat(scope): …`); design tokens/lint
  via `pnpm design:check`.
- Pointer to `plans/README.md` for the advisor plan queue.

### Step 4: Registry + design-system corrections

1. `registry.json`: change the `target-card` description to match reality,
   e.g. "Core detection card shell with collapsible body and slot
   composition." Scan the other `description` fields you can verify cheaply;
   fix only provable drift (don't reword for style).
2. `design-system.md`: insert a short "Heads-up" admonition before the quick
   start: installed components depend on the C2 token CSS which is **not yet
   distributed** via the registry; consumers must copy
   `src/styles/palette.css` + `src/styles/theme.css` manually until `@c2/base`
   ships (reference `docs/registry-foundation-plan.md` Phase 1).
3. `docs/design-system-discovery.md:27`: append to that line:
   "*(Superseded — see `registry-foundation-plan.md` §1: the distribution
   layer is now in scope for internal consumers.)*"

**Verify**: JSON-parse check on `registry.json` → exit 0; `pnpm styleguide:check`
→ same result as your pre-change run (the guard ties manifest↔registry — a
description change must not break it).

## Test plan

Docs-only change; the gates are the JSON parse, the styleguide manifest guard,
and a self-review pass: every claim you write must be verifiable in the repo
(no aspirational statements).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `rg -n "experimental" .env.example` → no matches
- [ ] `rg -n "CENTRAL_LICENSE_KEY" README.md` → ≥1 match
- [ ] `AGENTS.md` exists at repo root
- [ ] `rg -n "accent spine" registry.json` → no matches
- [ ] `rg -n "Superseded" docs/design-system-discovery.md` → 1 match
- [ ] `node -e "JSON.parse(...)"` on registry.json exits 0; `pnpm styleguide:check` not regressed
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated (unless the reviewer maintains the index)

## STOP conditions

Stop and report back (do not improvise) if:

- `pnpm styleguide:check` fails after the registry.json description edit —
  the manifest guard may pin descriptions; report the failure output.
- `.env.example` at your checkout differs structurally from the excerpt
  (the user's uncommitted edits may have landed).
- You find additional factual drift beyond the listed items that would take
  more than a one-line fix — list it in NOTES instead of expanding scope.

## Maintenance notes

- `AGENTS.md` should be updated when plans 005/008 land (new scripts) and when
  the lint/tsc baselines are fixed (remove the "known-broken" caveats).
- The design-system.md warning is temporary — plan 015 (`@c2/base`) removes it.
- Reviewer: fact-check AGENTS.md line by line; wrong agent docs are worse than
  none.
