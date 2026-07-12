# Plan 007: Clear the HIGH dependency advisories (react-router, vite pin, cesium chain)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 805086b..HEAD -- package.json pnpm-lock.yaml`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW-MED
- **Depends on**: none (composes with 005 — if 005 already landed, keep its `@types/*` overrides intact)
- **Category**: security
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

`pnpm audit --prod` reports **25 vulnerabilities (6 high, 13 moderate, 6 low)**
at commit `805086b`. Three clusters are actionable with small version moves:

1. **react-router 7.13.2** (via `react-router-dom@^7.13.1`) — multiple HIGH
   advisories incl. GHSA-84g9-w2xq-vcv6, patched in `>=7.15.1`. This library
   runs in every production session (`src/app/App.tsx:2`).
2. **vite 6.3.5** — the `pnpm.overrides` block pins vite to `6.3.5`, *below*
   the `^6.4.1` devDependency and below the patched `6.4.3` (dev-server
   `fs.deny` bypass / path-traversal advisories). The override silently defeats
   the newer devDep. Dev-server only, but that is exactly where this team lives.
3. **cesium transitive chain** — `protobufjs@8.0.3` (HIGH, patched `>=8.4.1`)
   and `dompurify@3.4.1` (patched `>=3.4.8`) via `cesium>@cesium/engine`.
   Cesium is the production map runtime.

## Current state

- `package.json:77` — `"react-router-dom": "^7.13.1"` (lockfile resolves 7.13.2).
- `package.json:105` — `"vite": "^6.4.1"` in devDependencies, but:

```119:123:package.json
  "pnpm": {
    "overrides": {
      "vite": "6.3.5"
    }
  }
```

- There is no comment or ADR explaining the 6.3.5 pin. Git history is the only
  clue — check `git log -S '"vite": "6.3.5"' -- package.json` for the pinning
  commit and read its message before removing it.
- `cesium` is at `^1.140.0` (`package.json:55`).
- Baseline: `pnpm audit --prod` → 25 vulnerabilities, `Severity: 6 low | 13 moderate | 6 high`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install` | exit 0 |
| Audit | `pnpm audit --prod` | 0 HIGH after this plan |
| Build | `pnpm build` | exit 0 |
| Dev smoke | `pnpm dev` (background, then curl `http://localhost:5173/`) | HTML 200 response |

## Scope

**In scope** (the only files you should modify):
- `package.json`
- `pnpm-lock.yaml` (via `pnpm install` only)

**Out of scope** (do NOT touch):
- Any `src/` file. If a bump requires source changes, that's a STOP condition.
- Upgrading `cesium` itself beyond a patch/minor within `^1.140.0` — use
  overrides for its transitive deps instead (a cesium major/minor bump risks
  Ion-token/tileset regressions and needs its own plan).

## Git workflow

- Branch: `advisor/007-dependency-security-bumps`
- Commit style: `chore(deps): patch react-router, vite pin, cesium transitive advisories`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Bump react-router-dom

Change `"react-router-dom": "^7.13.1"` → `"^7.15.1"` in `package.json`, then
`pnpm install`.

**Verify**: `pnpm audit --prod 2>&1 | grep -c "react-router"` → `0`.

### Step 2: Investigate and raise the vite override

Run `git log -S '"vite": "6.3.5"' --oneline -- package.json` and read the
pinning commit's message.

- If the message documents a concrete breakage with vite >6.3.5, STOP and
  report the commit hash and reason.
- Otherwise, delete the `"vite": "6.3.5"` line from `pnpm.overrides` (if the
  overrides object then becomes empty and plan 005 hasn't added its own
  entries, remove the empty `pnpm` block too) and `pnpm install`. The
  devDependency `^6.4.1` will then resolve to ≥6.4.3.

**Verify**: `rg '"vite"' pnpm-lock.yaml | head -3` shows a resolved vite ≥6.4.3,
and `pnpm audit --prod 2>&1 | grep -ci "vite"` → `0`.

### Step 3: Override the cesium transitive advisories

Add to `pnpm.overrides` in `package.json`:

```json
"protobufjs": ">=8.4.1",
"dompurify": ">=3.4.8"
```

Then `pnpm install`.

**Verify**: `pnpm audit --prod` → output ends with `Severity:` line containing
`0 high` (moderates from other chains may remain; record what's left).

### Step 4: Smoke-test build and dev server

**Verify**:
1. `pnpm build` → exit 0.
2. Start `pnpm dev` in the background; `curl -sf http://localhost:5173/ | head -c 200`
   returns HTML. Kill the dev server afterwards.

## Test plan

No unit tests exist yet (plan 008). The audit output plus build/dev smoke are
the gates. Record the full final `pnpm audit --prod` severity line in your
report.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm audit --prod` reports 0 HIGH vulnerabilities
- [ ] Resolved `react-router` in `pnpm-lock.yaml` is ≥7.15.1
- [ ] Resolved `vite` in `pnpm-lock.yaml` is ≥6.4.3 (unless Step 2 hit its STOP)
- [ ] `pnpm build` exits 0
- [ ] Dev server serves `/` (Step 4)
- [ ] Only `package.json` + `pnpm-lock.yaml` modified (`git status`)
- [ ] `plans/README.md` status row updated (unless the reviewer maintains the index)

## STOP conditions

Stop and report back (do not improvise) if:

- The vite-pin commit message documents a real breakage with newer vite —
  report the hash and reason; the pin then needs a targeted fix, not removal.
- `pnpm dev` fails to serve after the vite bump (likely `vite-plugin-cesium`
  or `@react-scan/vite-plugin-react-scan` incompatibility) — report the exact
  error; try exactly one fix attempt (re-pin vite to the highest patched 6.x
  that works) before stopping.
- The protobufjs/dompurify overrides break `pnpm build` or Cesium asset
  copying.
- react-router ≥7.15.1 introduces type or runtime errors in `src/app/App.tsx`
  route definitions.

## Maintenance notes

- The two transitive overrides should be deleted once `cesium` ships a release
  that bundles patched versions — re-check on the next cesium bump.
- Reviewer: confirm the executor actually investigated the vite pin (Step 2)
  rather than blindly deleting it, and that the final audit line is quoted in
  the report.
