# Plan 006: Remove the committed Mapbox token fallback

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 805086b..HEAD -- src/app/lib/mapUtils.ts`
> If the file changed since this plan was written, compare the "Current
> state" excerpt against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

A live Mapbox public access token (credential type: Mapbox `pk.*` access token)
is committed as a string fallback in `src/app/lib/mapUtils.ts` (lines 48–50).
It is in git history and ships verbatim inside every production bundle. Anyone
can extract it and consume the account's Mapbox quota or use it outside
whatever URL restrictions exist. Removing the fallback makes the env var the
only source; the burned token must also be rotated by the account owner
(rotation is a human action outside this plan — flag it in your report).

Do NOT copy the token value into any file, commit message, or report. Refer to
it only as "the committed Mapbox token".

## Current state

- `src/app/lib/mapUtils.ts` — Mapbox helpers (`getMapInstance`, `tryMapOp`,
  `logMapError`) plus the token export at the bottom of the file:

```43:50:src/app/lib/mapUtils.ts
/**
 * Mapbox access token. Set VITE_MAPBOX_TOKEN in .env.local.
 * Falls back to a public token for local development so nothing breaks immediately,
 * but production builds should always have the env var set.
 */
export const MAPBOX_TOKEN: string =
  (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) ??
  'pk.eyJ1...'   // ← full literal token in the real file; do not reproduce it
```

- Consumers of `MAPBOX_TOKEN` (do not modify them):
  - `src/app/components/TacticalMap.tsx:43` (legacy Mapbox map, still routed at `/` only via `?map=` legacy path docs; slated for deletion in plan 012)
  - `src/app/components/FovTestPage.tsx:6` (dev/test route `/fov-test`)
- `.env.example:1-2` already documents `VITE_MAPBOX_TOKEN`.
- Note: `src/app/components/TacticalMap.spec.ts` mentions a hardcoded token in
  its design-metadata text — that file is documentation, leave it alone.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck (scoped) | `npx tsc --noEmit -p tsconfig.app.json 2>&1 \| grep mapUtils` | no new errors in mapUtils.ts |
| Build | `pnpm build` | exit 0 |
| Token gone | `rg -n "pk\.eyJ" src/` | no matches |

## Scope

**In scope** (the only file you should modify):
- `src/app/lib/mapUtils.ts`

**Out of scope** (do NOT touch, even though they look related):
- `src/app/components/TacticalMap.tsx`, `src/app/components/FovTestPage.tsx` —
  consumers keep importing `MAPBOX_TOKEN` unchanged.
- `.env.example` — already documents the variable (touched by plan 013).
- Rotating the token on mapbox.com — human action; note it in your report.

## Git workflow

- Branch: `advisor/006-remove-mapbox-token-fallback`
- Commit style: conventional commits, e.g.
  `fix(security): drop committed Mapbox token fallback`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Replace the fallback with env-only + loud failure

Replace the `MAPBOX_TOKEN` export (and its doc comment) with:

```ts
/**
 * Mapbox access token. Set VITE_MAPBOX_TOKEN in .env.local (see .env.example).
 * There is intentionally no fallback: a missing token must fail loudly
 * instead of silently billing a shared account.
 */
export const MAPBOX_TOKEN: string =
  (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) ?? '';

if (!MAPBOX_TOKEN && import.meta.env.DEV) {
  console.error(
    '[mapUtils] VITE_MAPBOX_TOKEN is not set — Mapbox surfaces (/fov-test, legacy map) will not render. See .env.example.',
  );
}
```

Keep the rest of the file byte-identical.

**Verify**: `rg -n "pk\.eyJ" src/` → no matches.

### Step 2: Confirm the app still typechecks and builds

**Verify**: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "mapUtils"` →
`0` (the repo has a known-broken global tsc baseline; the gate here is only
that *this file* introduces no errors). Then `pnpm build` → exit 0.

## Test plan

No unit tests exist in the repo yet (plan 008 introduces the harness). The
machine gates above are the test for this one-line change.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `rg -n "pk\.eyJ" src/` returns no matches
- [ ] `pnpm build` exits 0
- [ ] Only `src/app/lib/mapUtils.ts` modified (`git status`)
- [ ] Report includes the sentence: "The removed Mapbox token must be rotated on mapbox.com by the account owner — deletion alone does not un-burn it."
- [ ] `plans/README.md` status row updated (unless the reviewer maintains the index)

## STOP conditions

Stop and report back (do not improvise) if:

- The token fallback at `mapUtils.ts:48-50` no longer matches the excerpt
  (someone already changed it).
- Removing the fallback surfaces additional hardcoded `pk.*` tokens elsewhere
  in `src/` (the `rg` gate finds more matches than the one you removed) —
  report the locations, do not fix them ad hoc.

## Maintenance notes

- Plan 012 (Mapbox stack deletion) removes this file's Mapbox helpers
  entirely; this fix is still worth landing first because 012 is L-effort and
  gated on other plans.
- Reviewer: confirm the diff contains no token-like string and that the report
  includes the rotation flag.
