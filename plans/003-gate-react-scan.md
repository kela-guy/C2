# Plan 003: Gate react-scan behind an opt-in env var

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 805086b..HEAD -- vite.config.ts package.json`
> If either file changed since this plan was written, compare the
> "Current state" excerpt against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx / perf
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

react-scan instruments every React commit to attribute render causes. It is
injected into EVERY dev session via the Vite plugin, even though its overlay
is only shown when the developer opts in with `?perf=1`. The instrumentation
itself (hooking React internals, tracking fibers per commit) runs regardless
of whether the overlay is visible. On this app — where the Dashboard
simulation re-renders a very large component tree at 4 Hz (see
`plans/004-move-sim-off-react-state.md`) — that is a permanent tax on every
`pnpm dev` session. Making it opt-in gives the default dev loop the
uninstrumented performance while keeping the tool one env var away.

Confidence on the magnitude was MED in the audit, so this plan includes a
before/after measurement step — report the numbers even if the delta turns
out to be small.

## Current state

One file needs changing: `vite.config.ts`.

```ts
// vite.config.ts:22-28
// react-scan annotates every commit with a render-cause overlay in
// dev. We import its Vite plugin (which only takes effect during
// `vite dev`) and hide the overlay behind `?perf=1` (the package
// honors that automatically).
if (isDev) {
  plugins.push(reactScan({ enable: true, autoDisplayNames: true }));
}
```

Related facts:

- `reactScan` is imported at `vite.config.ts:8` from
  `@react-scan/vite-plugin-react-scan` (devDependency, along with
  `react-scan` itself — both stay installed; this plan changes activation,
  not dependencies).
- `isDev` is derived from the Vite `mode` at `vite.config.ts:16`.
- The dev script is `"dev": "vite"` (`package.json`). pnpm passes process
  env through, so `REACT_SCAN=1 pnpm dev` reaches `process.env` inside
  `vite.config.ts` (same pattern as the existing `ANALYZE` flag at
  `vite.config.ts:13`: `const ANALYZE = process.env.ANALYZE === '1';`).

Repo convention: config flags are module-level constants read from
`process.env` with a `=== '1'` check and an explanatory comment — match the
`ANALYZE` flag pattern exactly.

## Commands you will need

| Purpose   | Command                                  | Expected on success |
|-----------|------------------------------------------|---------------------|
| Typecheck (config) | `npx tsc -p tsconfig.node.json --noEmit` | exit 0     |
| Lint      | `pnpm lint`                              | exit 0              |
| Dev server (default) | `pnpm dev`                    | serves on http://localhost:5173 |
| Dev server (scan on) | `REACT_SCAN=1 pnpm dev`       | serves on http://localhost:5173 |
| Build     | `pnpm build`                             | exit 0              |

## Scope

**In scope** (the only file you should modify):

- `vite.config.ts`

**Out of scope** (do NOT touch):

- `package.json` — do not remove the `react-scan` /
  `@react-scan/vite-plugin-react-scan` devDependencies and do not add a new
  script; the env-var invocation is enough.
- `.env.example` — it is currently modified in the user's working tree
  (uncommitted work); leave it alone.
- Any source file under `src/`.

## Git workflow

- Branch: `advisor/003-gate-react-scan`
- Single commit, conventional style, e.g.
  `perf(dev): make react-scan opt-in via REACT_SCAN=1`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Take the baseline measurement

Run `pnpm dev` (current behavior, react-scan on), open
http://localhost:5173 in a browser, let the Dashboard settle for ~30
seconds, then sample:

```bash
ps -Ao pid,pcpu,comm -r | head -8
```

Record the renderer process `%CPU` (the browser tab's renderer, not the GPU
helper). Stop the dev server.

**Verify**: baseline number recorded.

### Step 2: Gate the plugin

In `vite.config.ts`, next to the `ANALYZE` constant (line 13), add:

```ts
// react-scan is opt-in: it instruments every React commit even when its
// overlay is hidden, which taxes the default dev loop. Run
// `REACT_SCAN=1 pnpm dev` to enable it (overlay shows with `?perf=1`).
const REACT_SCAN = process.env.REACT_SCAN === '1';
```

Change the plugin push (lines 26–28) to:

```ts
if (isDev && REACT_SCAN) {
  plugins.push(reactScan({ enable: true, autoDisplayNames: true }));
}
```

Update the surrounding comment block (lines 22–25) to reflect the new
invocation instead of claiming it's always on.

**Verify**: `npx tsc -p tsconfig.node.json --noEmit` → exit 0 and
`pnpm lint` → exit 0.

### Step 3: Confirm both modes work

1. `pnpm dev` → open the app → confirm it loads and there is no react-scan
   toolbar/overlay even with `?perf=1` appended to the URL.
2. Stop, run `REACT_SCAN=1 pnpm dev` → open the app with `?perf=1` →
   confirm the react-scan overlay/toolbar appears as before.

**Verify**: both behaviors observed.

### Step 4: Take the after measurement

Repeat Step 1's measurement with the default `pnpm dev` (react-scan now
off). Record the renderer `%CPU` under the same conditions (Dashboard
visible, ~30 s settle). Report baseline vs. after in the completion report.
If the delta is under ~3 percentage points, say so plainly — the change is
still worth keeping for the reduced instrumentation, but the finding's
impact should be recorded honestly in `plans/README.md`.

**Verify**: both numbers in the completion report.

### Step 5: Final gates

**Verify**:
- `pnpm build` → exit 0 (react-scan never applied to builds, so no change
  expected — this is a regression guard)
- `git status --short` → only `vite.config.ts` modified (plus
  `plans/README.md` for the status row)

## Test plan

No unit tests apply to Vite config. The acceptance tests are Step 3 (both
modes function) and Step 4 (measured delta reported).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `rg -n "REACT_SCAN" vite.config.ts` → returns the constant and the
      gate condition
- [ ] `rg -n "isDev && REACT_SCAN" vite.config.ts` → 1 match
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] Baseline and after CPU numbers recorded in the completion report
- [ ] `git status --short` shows no modified files outside the Scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `vite.config.ts` lines 22–28 don't match the excerpt (drift since
  `805086b`).
- With the gate in place, `pnpm dev` fails to start or the app fails to
  load — do not debug the react-scan plugin internals; report.
- You are tempted to also remove the dependencies or change `package.json`
  scripts — that is out of scope.

## Maintenance notes

- Developers who relied on react-scan being always-available need the new
  invocation: `REACT_SCAN=1 pnpm dev` (then `?perf=1` in the URL). Mention
  this in the PR description.
- If the team later wants it discoverable, a `dev:scan` script in
  `package.json` is the natural follow-up (deferred here to keep the
  diff to one file).
