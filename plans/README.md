# Implementation Plans

Plans 001–004 were generated on 2026-07-08 from a performance-focused audit
prompted by "high CPU every time I run the dev server". Root cause summary:
the Vite server process itself is idle — the CPU burn is (a) the browser
continuously rendering the Cesium scene because animation loops defeat
`requestRenderMode`, and (b) per-save CPU spikes from HMR full-page reloads
and Fast Refresh invalidation cascades, amplified by always-on react-scan
instrumentation.

Plans 005–015 were generated later the same day from a full standard-effort
audit (correctness, security, performance, tests, debt, deps, DX, docs,
direction). Headline findings: a types/runtime skew (`@types/react@19` vs
React 18) causing ~1,000 of the 1,309 tsc errors; a committed Mapbox token
fallback; 6 HIGH `pnpm audit` advisories; no test framework or CI at all; two
map stacks shipped while the rollback toggle is dead code; and a dead-but-
declared Dashboard timeout registry.

All plans stamped against commit `805086b`. Execute in the order below
unless dependencies say otherwise. Each executor: read the plan fully before
starting, honor its STOP conditions, and update your row when done.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001  | Cap Cesium animation-driven render loops at 30 fps | P1 | M | — | BLOCKED (target code exists only in uncommitted working-tree changes; commit them, then re-dispatch) |
| 002  | Eliminate HMR full-page reloads and Fast Refresh invalidation storms | P2 | M | — | STALE (branch `advisor/002-fix-hmr-invalidation-storms`, 4 commits ending `41ad009`, NOT merged; worktree removed. Needs reconciliation before merging: its DroneIcon/TacticalMap decoupling predates plan 009's approach and plan 012's TacticalMap deletion — expect conflicts) |
| 003  | Gate react-scan behind an opt-in env var | P3 | S | — | DONE (branch `advisor/003-gate-react-scan` NOT merged, but its exact vite.config.ts diff is present in the user's uncommitted working tree — lands with the WIP commit; the branch is redundant and can be deleted) |
| 004  | Re-measure Dashboard sim tick; move hostile-target motion off React if warranted | P3 | M | 001 | TODO |
| 005  | Align React type packages with React 18 runtime; add typecheck script | P1 | S | — | DONE (reviewed & approved; branch `advisor/005-fix-typescript-baseline`, commit `11b3d7f`, worktree `fix-typescript-baseline-7f3a9c2d` — MERGED via `advisor/integration` (`c0e8c9d`); residual tsc errors: 100, burn-down deferred) |
| 006  | Remove the committed Mapbox token fallback | P1 | S | — | DONE (reviewed & approved; branch `advisor/006-remove-mapbox-token-fallback`, commit `30a13a7`, worktree `mapbox-token-a3f7c2e1` — MERGED via `advisor/integration` (`c0e8c9d`); **token must still be rotated on mapbox.com**) |
| 007  | Clear HIGH dependency advisories (react-router, vite pin, cesium chain) | P1 | S | — | DONE (reviewed & approved; branch `advisor/007-dependency-security-bumps`, commit `0081b5d`, worktree `dependency-security-bumps-a3f9c2b1` — MERGED via `advisor/integration` (`c0e8c9d`); audit now 0 high / 2 moderate) |
| 008  | Establish a Vitest + CI verification baseline | P1 | M | 005 | DONE (reviewed & approved; branch `advisor/008-test-baseline`, commit `5613d48`, worktree `008-test-baseline-a3f9c2d1` — MERGED via `advisor/integration` (`c0e8c9d`); 15 tests, CI needs `CENTRAL_LICENSE_KEY` repo secret; stale doc comment at `mapGeo.ts:47` flagged) |
| 009  | Code-split heavy routes/panels; remove dead dependencies | P2 | M | — | DONE (reviewed & approved; branch `advisor/009-code-split-prune-deps`, 4 commits ending `a40c510`, worktree `009-code-split-prune-deps-7f3a9c1d` — MERGED via `advisor/integration` (`c0e8c9d`); entry chunk 672.5 → 657.8 kB, mapbox now lazy-only via FovTestPage, 7 dead deps + `ui/chart.tsx` removed) |
| 010  | Fix Dashboard timer leak + three latent correctness bugs | P2 | M | 008 (soft) | DONE (reviewed & approved; branch `advisor/010-dashboard-correctness`, commit `9835142`, worktree `dashboard-correctness-a3f9c1e7` — MERGED via `advisor/integration` (`c0e8c9d`); 21 timeouts registered, patrol wrap + stale closure + pan-loop guard fixed; follow-up: add the skipped patrol-wrap test once 008 merges; note: 009 also edits Dashboard.tsx on its branch — expect a small merge overlap) |
| 011  | Gate lab/review routes behind VITE_SHOW_LABS | P3 | S | 009 (soft — same App.tsx region) | DONE (reviewed & approved; branch `advisor/011-gate-lab-routes`, commit `65d56ab`, worktree `gate-lab-routes-a2454df2` — MERGED via `advisor/integration` (`c0e8c9d`); both build shapes verified; human follow-up: set VITE_SHOW_LABS=1 on Vercel preview env; expect small App.tsx + .env.example merge overlaps with 009/013 and your uncommitted tree) |
| 012  | Delete the legacy Mapbox stack (cesium-parity Phase 9) | P2 | L | 008, 009 | DONE (reviewed & approved; branch `advisor/012-delete-mapbox-stack` — includes merged 008+009 — commit `43492ca`, worktree `012-delete-mapbox-stack-a3f9c2d1` — MERGED via `advisor/integration` (`c0e8c9d`); tsc errors 1,303 → 1,173, −48 packages, rollback = pre-deletion commit `65a4939`; one adjudicated scope addition: dead nav entry removed from `styleguide/navConfig.ts`) |
| 013  | Fix documentation drift (env, README, AGENTS.md, registry metadata) | P3 | S | — | DONE (reviewed & approved; branch `advisor/013-fix-docs-drift`, commit `d94761b`, worktree `docs-drift-a7f3c2e1` — MERGED via `advisor/integration` (`c0e8c9d`); note: user's tree has uncommitted `.env.example` edits, expect a small merge conflict) |
| 014  | Spike: anchor map-draw shapes to world space (Cesium) | P3 | M | — | DONE (reviewed & approved; branch `advisor/014-geo-anchoring-spike`, commits `158eea6`+`8d11e75`, worktree `geo-anchor-spike-5f339894` — MERGED via `advisor/integration` (`c0e8c9d`); findings in `docs/geo-anchoring-spike.md`: hybrid recommended — native clamped entities for bodies, screen-space chrome for handles; pure SVG reprojection disqualified by observation; 8 open questions in §5 need maintainer decisions before the L build is planned) |
| 015  | Ship @c2/base registry bootstrap (registry-foundation Phase 1) | P3 | M | — | DONE (reviewed & approved; branch `advisor/015-registry-base`, commit `7d45396`, worktree `registry-base-9f3a7c2b` — MERGED via `advisor/integration` (`c0e8c9d`); CLI css-field round-trip failed as feared → registry:file fallback taken, cssVars generated from palette/theme.css via `scripts/registry-theme.mjs`; scratch-app acceptance passed with computed-style evidence; NOTE: registry.json was re-serialized (formatting-only, semantically verified identical) — merge it before any hand edits) |
| 016  | One source of truth for color — token JSON references palette.css (design-system track, from the tokens-first + shadcn consultation) | P1 | M | — | DONE (branch `advisor/016-single-source-color-tokens`, 2 commits ending `fe20062` — MERGED via `advisor/integration` (`c0e8c9d`); negative drift test verified: a palette.css edit fails `design:check` until artifacts are regenerated; full `design:check` currently red only on the user's uncommitted CesiumMap/OnboardingMap raw-hex additions, pre-existing and unrelated) |

Note on the lint gate: `pnpm lint` fails with 382 pre-existing errors at
base commit `805086b` itself (verified independently of any plan change), so
the "lint exits 0" done criterion is unmeetable repo-wide. Reviewer
substitute: the files touched by a plan must lint clean individually
(`npx eslint <files>`). Similarly, `npx tsc --noEmit -p tsconfig.app.json`
fails with 1,309 errors at `805086b` — plan 005 collapses the bulk of these;
until the residue is burned down, typecheck gates are count-based, not
zero-based.

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) |
REJECTED (with one-line rationale — finding fixed independently or approach
abandoned).

## Dependency notes

- 004 requires 001 because 004 opens with a CPU profile whose decision rule
  ("is the 4 Hz Dashboard reconciliation still a meaningful cost?") only
  makes sense after 001 has removed the dominant Cesium render-loop cost.
  004 may legitimately end at its Step 2 as REJECTED.
- 001, 002, and 003 are independent of each other.
- 008 depends on 005 for the CI typecheck step (advisory `|| true` until the
  burn-down); the Vitest work itself is independent.
- 012 hard-depends on 009 (the `DroneIcon` extraction breaks
  `UrgencyReviewPage → TacticalMap`) and on 008 (regression net before
  deleting 2,400+ lines).
- 010 soft-depends on 008 only for its optional regression test step; the
  fixes can land without it.
- 011 soft-conflicts with 009 (both edit `App.tsx`'s import/route block) —
  land 009 first, or expect a trivial rebase.
- 013 and 015 both touch `design-system.md`'s registry warning — 013 adds an
  interim warning, 015 replaces it with real instructions; either order works
  (015 handles both cases).
- Suggested batch order: 005 → 006/007 (parallel) → 008 → 009 → 010/011/013
  (parallel) → 012 → 014/015 (parallel, independent direction work).

## Findings considered and rejected

From the 001–004 audit:

- `useDevicesFromAssets.tsx` Fast Refresh invalidation: expected behavior
  for a hook module; the invalidation stops at its two component importers.
  Not worth restructuring (documented inside plan 002's Current state so
  nobody chases it again).
- Pausing/deleting the always-on coverage walls in the onboarding scene:
  they are a deliberate product decision ("the walls are the point" —
  `OnboardingMap.tsx` header comment); the cost is addressed by capping the
  render rate (001) instead of removing the effect.
- Changing `motionTracker.ts` freeze thresholds to let the scene idle:
  interacts with stale-marker UX (halo/dim); deferred, noted in plans 001
  and 004 maintenance notes.

From the 005–015 audit:

- Global `CustomEvent` listeners (`toast-clicked` in `Dashboard.tsx:678`,
  `gotcha-critical-alert` in `CriticalAlertOverlay.tsx:127`) reported as a
  security issue: same-origin script access is the wrong threat model for
  this prototype SPA; at most an architecture smell. Not planned.
- `ui/chart.tsx` CSS-selector injection via unquoted `data-chart` id: the
  file is dead code with zero importers; plan 009 deletes it, resolving the
  finding without a security fix.
- "`shiki` is an unused dependency": false positive — it powers
  `src/app/styleguide/registry/useShiki.ts` and the legacy styleguide
  highlighter. Do not remove.
- Blanket `import.meta.env.DEV` gating of lab routes: rejected in favor of an
  explicit `VITE_SHOW_LABS` flag (plan 011) because route comments document
  that reviewers open these surfaces on deployed builds.
- Cesium per-frame marker height resampling (`CesiumMap.tsx` preRender
  listener): plausible cost but MED confidence and the file is under heavy
  uncommitted development (see plan 001's BLOCKED state); re-evaluate after
  001 lands rather than planning against a moving target.
- Per-card effector re-sorting in `src/imports/engagementFlows.ts` /
  `useCardSlots.ts`: real O(cards × flows × assets log assets) work but
  mitigated by existing per-target context caching; not worth a plan until
  profiling (after 001/004) shows it on the critical path.
- `devices-panel-next` promotion into Dashboard: MED-confidence direction
  finding; readiness requires a design-side side-by-side review that an
  executor can't do. Left to the maintainer; revisit on request.
- Onboarding production scan/score engine: `docs/discovery/README.md`
  explicitly gates it behind assumption validation (A1–A3) that hasn't run;
  building it now would violate the repo's own discovery protocol.
- Dashboard camera-control countdown, patrol wrap, pan-loop guard: NOT
  rejected — folded into plan 010 rather than separate plans.
- Energy-wall rise timers never cancelled (`CesiumMap.tsx:589`): currently
  harmless (guards prevent crashes); noted in plan 010's maintenance notes,
  no standalone plan.
