# Plan 011: Gate lab/review routes behind an explicit env flag

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 805086b..HEAD -- src/app/App.tsx .env.example`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition. (`.env.example` has known uncommitted edits
> in the user's tree; only its committed state matters in a worktree.)

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (touches the same `App.tsx` import block as plan 009 — if both run, land 009 first and rebase)
- **Category**: debt
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

Six internal design/review surfaces are reachable in production builds:
`/styleguide-legacy` (a 7,118-line monolith), `/devices-lab`, `/onboarding`,
`/video-hud-sandbox`, `/pathfinder-sandbox`, and `/handoff`. Their route
comments say reviewers open them directly on deployed builds — so plain
`import.meta.env.DEV` gating (the pattern used for the geo-entities sandboxes)
would break a real workflow. The right shape is an explicit env flag that
preview deployments turn on and production leaves off: the lab surface stays
one env var away for reviewers, while operator-facing production stops
shipping route entries for internal tooling. (The lazy imports already keep
the code out of the entry chunk; this is about route exposure and route-table
hygiene, not bundle size.)

Deliberately NOT gated: `/styleguide` + `/design-system` (canonical public
docs), `/urgency-review` and `/fov-test` (small, referenced from docs),
`/demo`, and the `HandoffInspector` overlay (`App.tsx:117-121` documents it as
"shipped in production by request").

## Current state

- `src/app/App.tsx` — the DEV-gated pattern to imitate:

```61:63:src/app/App.tsx
const GeoEntitiesSandbox = import.meta.env.DEV
  ? lazy(() => import("./components/geo-entities-sandbox/GeoEntitiesSandbox"))
  : null;
```

  and its conditional route:

```277:286:src/app/App.tsx
              {GeoEntitiesSandbox && (
                <Route
                  path="/geo-entities-sandbox"
                  element={
                    <Suspense fallback={<PlaygroundFallback />}>
                      <GeoEntitiesSandbox />
                    </Suspense>
                  }
                />
              )}
```

- The six ungated lazy consts and their routes:
  - `DevicesLabPage` (`App.tsx:20`, route at `:214-221`)
  - `OnboardingLabPage` (`App.tsx:26`, route at `:226-233`)
  - `StyleguideLegacyPage` (`App.tsx:37`, route at `:186-193`)
  - `VideoHudSandbox` (`App.tsx:43`, route at `:239-246`)
  - `PathfinderSandbox` (`App.tsx:48`, route at `:251-258`)
  - `PathfinderStory` (`App.tsx:55`, route at `:264-271`)
- `.env.example` — no lab flag documented yet.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build (flag off) | `pnpm build` | exit 0 |
| Build (flag on) | `VITE_SHOW_LABS=1 pnpm build` | exit 0 |
| Scoped lint | `npx eslint src/app/App.tsx` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `src/app/App.tsx`
- `.env.example`

**Out of scope** (do NOT touch):
- The geo-entities/theme/floating-panel sandboxes — already DEV-gated, leave
  their pattern alone.
- `HandoffInspector` / `ScopedHandoffInspector` — deliberate production ship.
- Deleting `/styleguide-legacy` or any lab code — separate concern.
- `vercel.json` or deployment config — setting the env var on Vercel preview
  environments is a human follow-up; note it in your report.

## Git workflow

- Branch: `advisor/011-gate-lab-routes`
- Commit style: `feat(app): gate lab routes behind VITE_SHOW_LABS`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Introduce the flag

Near the top of `App.tsx` (after the imports), add:

```tsx
// Lab/review surfaces ship only when explicitly enabled: always in local
// dev, and on deployments that set VITE_SHOW_LABS=1 (preview envs).
// Production operator builds leave the flag unset and drop these routes.
const SHOW_LABS = import.meta.env.DEV || import.meta.env.VITE_SHOW_LABS === "1";
```

### Step 2: Gate the six lazy consts and routes

Convert each of the six lazy consts to the established ternary pattern, e.g.:

```tsx
const DevicesLabPage = SHOW_LABS
  ? lazy(() => import("./components/DevicesLabPage"))
  : null;
```

and wrap each corresponding `<Route>` in `{DevicesLabPage && (...)}` exactly
like the geo-entities routes. Keep every existing comment block with its
route. Apply to: `DevicesLabPage`, `OnboardingLabPage`, `StyleguideLegacyPage`,
`VideoHudSandbox`, `PathfinderSandbox`, `PathfinderStory`.

**Verify**: `npx eslint src/app/App.tsx` → exit 0.

### Step 3: Document the flag

Append to `.env.example`:

```
# Set to "1" to expose the internal lab/review routes (/styleguide-legacy,
# /devices-lab, /onboarding, /video-hud-sandbox, /pathfinder-sandbox,
# /handoff) on a deployed build. Local dev always shows them. Leave unset
# for operator-facing production.
VITE_SHOW_LABS=""
```

### Step 4: Verify both build shapes

**Verify**:
1. `pnpm build` → exit 0.
2. `VITE_SHOW_LABS=1 pnpm build` → exit 0.
3. `rg -c "styleguide-legacy" dist/assets/main-*.js` after the flag-off build →
   0 matches (route string absent from the entry chunk).

## Test plan

No unit tests for route gating (plan 008's harness has no router tests yet).
The dual-build verification plus a dev-server smoke (labs reachable in dev)
is the gate. If you can run the dev server: `pnpm dev`, then
`curl -sf http://localhost:5173/devices-lab | head -c 100` returns HTML.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] Both builds (flag off / on) exit 0
- [ ] Flag-off `dist/assets/main-*.js` contains no `styleguide-legacy` string
- [ ] `.env.example` documents `VITE_SHOW_LABS`
- [ ] `npx eslint src/app/App.tsx` exits 0
- [ ] Only `src/app/App.tsx` and `.env.example` modified (`git status`)
- [ ] `plans/README.md` status row updated (unless the reviewer maintains the index)

## STOP conditions

Stop and report back (do not improvise) if:

- `App.tsx` has drifted such that the six consts/routes aren't where the plan
  says (e.g. plan 009 landed first and moved the import block) — reconcile
  line numbers only if the structures are otherwise identical; stop on any
  structural difference.
- Some other module imports one of the six lazy consts' targets directly
  (`rg -n "DevicesLabPage|OnboardingLabPage|VideoHudSandbox|PathfinderSandbox|PathfinderStory" src/ --glob '!App.tsx'` finds live imports) — gating would
  then break that consumer.

## Maintenance notes

- A human must set `VITE_SHOW_LABS=1` on the Vercel preview environment (and
  confirm production leaves it unset) — say this in your report.
- New lab surfaces should follow this flag, not fresh `import.meta.env.DEV`
  checks, unless they must never appear on deployed builds.
- When `/styleguide-legacy` finishes porting into the manifest styleguide and
  is deleted, remove its entry here too.
