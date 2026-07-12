# Plan 005: Align React type packages with the React 18 runtime and add a typecheck script

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 805086b..HEAD -- package.json pnpm-lock.yaml tsconfig.app.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

`npx tsc --noEmit -p tsconfig.app.json` currently fails with **1,309 errors**, so
typechecking cannot be used as a gate for any change, and real type bugs ship
invisibly. The root cause of the bulk of these errors is a types/runtime skew:
the app runs React **18.3.1**, but the only `@types/react` version resolved in
the lockfile is **19.2.14** (pulled transitively by Radix/cmdk packages, which
declare `@types/react: '*'` peers — 723 references in `pnpm-lock.yaml` resolve
to `@types/react@19.2.14`). React 19 types changed `ReactNode` (added `bigint`)
and component typings, which produces the signature error patterns seen in the
output: `Type 'bigint' is not assignable to type 'ReactNode'` (~370 lines) and
`Property 'children' does not exist on type 'IntrinsicAttributes'` (~260 lines).
Pinning React 18 types should eliminate the large majority of the 1,309 errors
and make the remainder (real issues in `TacticalMap.tsx`, `ui/*` wrappers,
Mapbox typings) visible and fixable. Plan 008 (test/CI baseline) builds on this.

## Current state

- `package.json` — no `@types/react` or `@types/react-dom` anywhere; `react` and
  `react-dom` appear **only** in `peerDependencies` (marked optional), not in
  `dependencies`:

```107:118:package.json
  "peerDependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "peerDependenciesMeta": {
    "react": {
      "optional": true
    },
    "react-dom": {
      "optional": true
    }
  }
```

- `package.json` scripts — there is no `typecheck` script:

```7:20:package.json
  "scripts": {
    "build": "vite build",
    "build:analyze": "ANALYZE=1 vite build",
    "dev": "vite",
    ...
    "lint": "eslint .",
```

- `tsconfig.app.json` — strict-mode config, `"types": ["vite/client"]`, no React
  types pin. Do not change this file.
- Baseline numbers (verified at commit `805086b`):
  - `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "error TS"` → `1309`
  - `rg -o "@types/react@[0-9.]+" pnpm-lock.yaml | sort -u` → only `@types/react@19.2.14`
- Package manager: pnpm 10.x. Installing `@central-icons-react/*` packages
  requires `CENTRAL_LICENSE_KEY` exported in the shell (see `.env.example`).
  If your environment has a populated `node_modules` and you only add type
  packages, `pnpm install` should not need to re-fetch the icon packages, but
  the key may still be required for a full install.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install` | exit 0 |
| Typecheck | `npx tsc --noEmit -p tsconfig.app.json` | (currently fails; see steps for targets) |
| Error count | `npx tsc --noEmit -p tsconfig.app.json 2>&1 \| grep -c "error TS"` | number |
| Build | `pnpm build` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `package.json`
- `pnpm-lock.yaml` (via `pnpm install` only — never by hand)

**Out of scope** (do NOT touch, even though they look related):
- Any `.ts`/`.tsx` source file — fixing the residual (post-pin) type errors is
  a separate effort; this plan only fixes the types/runtime skew and adds the
  script.
- `tsconfig.app.json` / `tsconfig.node.json` — no compiler-option changes.
- Upgrading React itself to 19 — explicitly not this plan.

## Git workflow

- Branch: `advisor/005-fix-typescript-baseline`
- Commit style (match `git log`): conventional commits, e.g.
  `chore(deps): pin React 18 type packages and add typecheck script`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Move react/react-dom into dependencies and add React 18 type pins

In `package.json`:
1. Add to `"dependencies"`: `"react": "18.3.1"`, `"react-dom": "18.3.1"`.
2. Remove the `"peerDependencies"` and `"peerDependenciesMeta"` blocks entirely
   (this is a private app, not a library — the optional-peer setup is an
   accident of its Figma-export origin).
3. Add to `"devDependencies"`: `"@types/react": "^18.3.12"`,
   `"@types/react-dom": "^18.3.1"`.
4. Add to the existing `"pnpm"` block (which currently holds the vite
   override — leave that override alone in this plan):

```json
"overrides": {
  "vite": "6.3.5",
  "@types/react": "^18.3.12",
  "@types/react-dom": "^18.3.1"
}
```

The overrides are the load-bearing part: they force every transitive
`@types/react: '*'` peer (Radix, cmdk, etc.) to resolve to 18.x.

**Verify**: `pnpm install` → exit 0, lockfile updated.

### Step 2: Confirm the type skew is gone

**Verify**: `rg -o "@types/react@[0-9.]+" pnpm-lock.yaml | sort -u` → only
`@types/react@18.3.x` entries; no `@types/react@19` remains.

### Step 3: Add the typecheck script

In `package.json` scripts, add:

```json
"typecheck": "tsc --noEmit -p tsconfig.app.json"
```

**Verify**: `pnpm typecheck 2>&1 | grep -c "error TS"` → a number **well below
400** (expected: the ~1,000 React-19-signature errors are gone). Record the
exact number in your report. Additionally:
`pnpm typecheck 2>&1 | grep -c "bigint' is not assignable"` → `0`.

### Step 4: Confirm the app still builds

**Verify**: `pnpm build` → exit 0.

## Test plan

No unit tests for a dependency alignment. The verification gates above (error
count drop, zero `bigint` errors, clean build) are the test.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm install` exits 0
- [ ] `rg -o "@types/react@19[0-9.]*" pnpm-lock.yaml` returns no matches
- [ ] `pnpm typecheck` runs (script exists); error count < 400 and recorded in the report
- [ ] `pnpm typecheck 2>&1 | grep -c "bigint' is not assignable"` → 0
- [ ] `pnpm build` exits 0
- [ ] Only `package.json` and `pnpm-lock.yaml` modified (`git status`)
- [ ] `plans/README.md` status row updated (unless the reviewer maintains the index)

## STOP conditions

Stop and report back (do not improvise) if:

- `pnpm install` fails because of the `CENTRAL_LICENSE_KEY` private-registry
  requirement and you cannot obtain the key from the environment.
- After the override, the tsc error count does **not** drop below 800 — the
  skew hypothesis would then be wrong and the plan needs rewriting.
- `pnpm build` breaks after the dependency moves.
- Any package refuses to resolve with the `@types/react` 18 override
  (peer-dependency hard conflict).

## Maintenance notes

- When the team eventually migrates to React 19, remove the two `@types/*`
  overrides and bump the pins in the same change as the `react`/`react-dom`
  bump — they must move together.
- Reviewer: check that no source files were touched and that the residual
  error count was honestly reported (it becomes the burn-down baseline).
- Follow-up explicitly deferred: burning down the residual errors (clusters in
  `src/app/components/TacticalMap.tsx` (~120), `src/app/components/ui/*`
  Radix wrappers, and `src/app/styleguide/`). Plan 012 deletes
  `TacticalMap.tsx`, which will remove its cluster for free — burn down after
  012 lands, not before.
