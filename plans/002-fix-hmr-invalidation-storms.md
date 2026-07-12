# Plan 002: Eliminate HMR full-page reloads and Fast Refresh invalidation storms

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 805086b..HEAD -- src/imports/ListOfSystems.tsx src/imports/useCardSlots.ts src/app/components/NotificationSystem.tsx src/app/components/flow-builder/FlowBuilderPanel.tsx src/app/components/UrgencyReviewPage.tsx src/app/components/TacticalMap.tsx src/primitives/MapIcons.tsx src/app/components/Dashboard.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx / perf
- **Planned at**: commit `805086b`, 2026-07-08

## Why this matters

Every file save in this repo currently costs far more CPU than it should.
The dev-server log shows two distinct problems:

1. **Full page reloads**: `page reload src/imports/ListOfSystems.tsx
   (circular import invalidate)` — a runtime import cycle between
   `ListOfSystems.tsx` and `useCardSlots.ts` means edits that reach that
   module trigger a full browser reload. A reload tears down and re-creates
   the Cesium viewer, re-downloads 3D tiles, and re-runs app bootstrap — a
   multi-second CPU spike per save.
2. **Fast Refresh invalidations**: `hmr invalidate ... Could not Fast
   Refresh ("MOCK_TARGETS" export is incompatible)` (and the same for
   `CAMERA_ASSETS`, `showTacticalNotification`, `defaultFlowDraft`) — these
   component files also export constants/functions, so Vite's React plugin
   can't hot-swap them in place and instead invalidates them up the import
   graph, producing the 25-file HMR cascades visible in the log.

Fixing both makes the common edit loop a cheap, targeted hot update.

## Current state

Rule being enforced: **a `.tsx` module is Fast Refresh-compatible only when
every export is a React component.** Type-only exports are fine (erased at
compile time; `verbatimModuleSyntax` is on in `tsconfig.app.json`). Value
exports (constants, functions, hooks) are not.

**The import cycle (causes the full page reloads):**

```ts
// src/imports/ListOfSystems.tsx:29
import { useCardSlots, type CardCallbacks, type CardContext } from './useCardSlots';
```

```ts
// src/imports/useCardSlots.ts:60
import { getIncidentOutcomes } from './ListOfSystems';
```

`getIncidentOutcomes` is a plain localization helper defined at
`ListOfSystems.tsx:197-209`, alongside three sibling value exports that also
break Fast Refresh for this module:

```ts
// src/imports/ListOfSystems.tsx:180-242 (abridged)
export type IncidentOutcome = 'Handled' | 'Escalated' | /* ... 6 more */;
export function getIncidentOutcomes(t: Strings): { value: IncidentOutcome; label: string }[] { /* ... */ }
export interface Playbook { id: string; name: string; description: string; riskLevel: 'low' | 'medium' | 'high'; }
export function getFlow1Playbooks(t: Strings): Playbook[] { /* ... */ }
export function getDismissReasons(t: Strings): readonly [string, string, string, string] { /* ... */ }
export const MOCK_TARGETS: Detection[] = [];
```

`MOCK_TARGETS` is used inside the same file as a default prop
(`ListOfSystems.tsx:574`: `targets = MOCK_TARGETS,`). The many other
importers of `ListOfSystems` (17 files) are `import type` only — they are
unaffected by moving value exports.

**The other mixed-export offenders (cause the invalidation cascades):**

- `src/app/components/NotificationSystem.tsx` — exports the
  `NotificationSystem` component (line 200) AND the imperative dispatcher
  `showTacticalNotification` (line 173), which closes over module-level
  batching state (`pendingBatch`, `batchTimerId`, `notifyBatchListeners`,
  `ensureToastExists`, `flushBatch`, `STABLE_TOAST_ID`, `BATCH_WINDOW_MS`,
  the `LiveBatchedToast` component, `formatTime`). Only importer of the
  function: `src/app/components/Dashboard.tsx:36`.
- `src/app/components/flow-builder/FlowBuilderPanel.tsx` — exports the
  `FlowBuilderPanel` component (line 158) AND `defaultFlowDraft()` (line
  115), which wraps private helpers `defaultDraft()` (line 119, also used
  internally at lines 206 and 257) and `newDraftId()` (line 110). Only
  external importer: `Dashboard.tsx:41`.
- `src/app/components/TacticalMap.tsx` (2,451 lines, legacy Mapbox map) —
  exports many non-component values (`CAMERA_ASSETS` at line 169,
  `RADAR_ASSETS`, `findDetectingSensors`, ...). Its ONLY live importer is
  `src/app/components/UrgencyReviewPage.tsx:56`, which imports just the
  `DroneIcon` component (defined at `TacticalMap.tsx:117-134`, depends on
  the module-level `DRONE_PATH` string constant defined earlier in the same
  file). Everything else in `TacticalMap.tsx` is self-contained: the asset
  constants were already duplicated into
  `src/app/components/tacticalAssets.ts` (see its header comment), which is
  what `Dashboard.tsx:5` actually uses.
- `src/app/components/useDevicesFromAssets.tsx` — a hook module. Hooks can
  never be Fast Refresh boundaries; its invalidation propagates one level to
  its two component importers (`Dashboard.tsx`, `VideoHudPanel.tsx`) and
  stops. **This is expected behavior — no change required.** Do not try to
  "fix" this file.

Repo conventions:

- Path aliases: `@/*` → `src/*`, `@/shared/*` → `src/app/*` (tsconfig +
  vite config).
- Extracted-data modules get a header doc comment explaining provenance —
  see `src/app/components/tacticalAssets.ts:1-8` for the exemplar.
- Icon components live in `src/primitives/MapIcons.tsx` (exports
  `DroneCardIcon`, `JamWaveIcon`, etc. — components only).

## Commands you will need

| Purpose   | Command                                  | Expected on success |
|-----------|------------------------------------------|---------------------|
| Install   | `pnpm install`                           | exit 0              |
| Typecheck | `npx tsc -p tsconfig.app.json --noEmit`  | exit 0, no output   |
| Lint      | `pnpm lint`                              | exit 0              |
| Build     | `pnpm build`                             | exit 0              |
| Dev server| `pnpm dev`                               | serves on http://localhost:5173 |

There is no unit-test runner in this repo (`*.spec.ts` files are
design-governance metadata, not runnable tests). The decisive verification is
watching the dev-server output during Step 6.

## Scope

**In scope** (the only files you should modify or create):

- `src/imports/systemsCatalog.ts` (create)
- `src/imports/ListOfSystems.tsx`
- `src/imports/useCardSlots.ts`
- `src/app/components/notificationBus.tsx` (create)
- `src/app/components/NotificationSystem.tsx`
- `src/app/components/flow-builder/flowDraft.ts` (create)
- `src/app/components/flow-builder/FlowBuilderPanel.tsx`
- `src/primitives/MapIcons.tsx`
- `src/app/components/UrgencyReviewPage.tsx`
- `src/app/components/TacticalMap.tsx`
- `src/app/components/Dashboard.tsx` (import-line updates only)

**Out of scope** (do NOT touch):

- `src/app/components/useDevicesFromAssets.tsx` — hook invalidation is
  bounded and expected (see Current state).
- Deleting `TacticalMap.tsx` — after Step 5 it has no live importers, but
  deletion is a product decision; leave the file in place.
- `src/app/components/tacticalAssets.ts` — already correct.
- Any behavioral change: this plan is pure code motion; no logic edits.
- `*.spec.ts` files — governance metadata; do not update them to chase
  renames.

## Git workflow

- Branch: `advisor/002-fix-hmr-invalidation-storms`
- Commit per step; conventional-commit style, e.g.
  `refactor(imports): break ListOfSystems/useCardSlots import cycle`
  (compare `git log --oneline`: `fix(map-draw): center upload button in panel footer`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extract the systems catalog and break the import cycle

Create `src/imports/systemsCatalog.ts` with a provenance header comment
(match `tacticalAssets.ts` style). Move these from `ListOfSystems.tsx`,
verbatim, including their doc comments:

- `IncidentOutcome` type (lines 180–188)
- `getIncidentOutcomes` (lines 190–209)
- `Playbook` interface (lines 211–216)
- `getFlow1Playbooks` (lines 218–230)
- `getDismissReasons` (lines 232–240)
- `MOCK_TARGETS` (line 242)

The new module needs:

```ts
import type { Strings } from '@/lib/intl';
import type { Detection } from './ListOfSystems';
```

(A type-only import back into `ListOfSystems` is safe — it is erased at
compile time and creates no runtime cycle.)

In `ListOfSystems.tsx`:

- Delete the moved code.
- Add `import { MOCK_TARGETS } from './systemsCatalog';` (needed by the
  default prop at line 574).
- Add type-only re-exports so the 17 `import type`-consumers keep working
  without edits: `export type { IncidentOutcome, Playbook } from './systemsCatalog';`
  Do NOT re-export any values — a value re-export would reintroduce the
  Fast Refresh incompatibility.

In `useCardSlots.ts`, change line 60:

```ts
import { getIncidentOutcomes } from './systemsCatalog';
```

If `useCardSlots.ts` lines 54–59 import the `IncidentOutcome` / `Playbook`
types from `./ListOfSystems`, point those at `./systemsCatalog` too
(optional but cleaner; the re-export keeps either path working).

**Verify**: `npx tsc -p tsconfig.app.json --noEmit` → exit 0, and
`rg -n "from './ListOfSystems'" src/imports/useCardSlots.ts` → only
`import type` lines remain (no value imports).

### Step 2: Extract the notification bus

Create `src/app/components/notificationBus.tsx`. Move from
`NotificationSystem.tsx`: `showTacticalNotification` (line 173–196) plus
everything it references that the `NotificationSystem` component itself does
not render: the module-level batching state and helpers (`pendingBatch`,
`batchTimerId`, `notifyBatchListeners` and its listener registry,
`flushBatch`, `ensureToastExists`, `STABLE_TOAST_ID`, `BATCH_WINDOW_MS`,
`formatTime`), the `LiveBatchedToast` component, and the `NotificationData`
type.

`NotificationSystem.tsx` keeps only the `NotificationSystem` component
(line 200 onward — the vignette overlay driven by the
`trigger-critical-alert` / `trigger-suspect-alert` window events), importing
anything it still needs from `./notificationBus`.

Update `Dashboard.tsx:36`:

```ts
import { NotificationSystem } from './NotificationSystem';
import { showTacticalNotification } from './notificationBus';
```

Note: `notificationBus.tsx` itself will not be Fast Refresh-compatible
(mixed exports) — that is acceptable; it is a rarely-edited leaf. The point
is that `NotificationSystem.tsx`, which IS edited during UI work, becomes
component-only.

**Verify**: `npx tsc -p tsconfig.app.json --noEmit` → exit 0. In `pnpm dev`,
trigger any notification flow on the Dashboard and confirm toasts still
appear batched and the critical-alert vignette still fires.

### Step 3: Extract the flow draft factory

Create `src/app/components/flow-builder/flowDraft.ts`. Move from
`FlowBuilderPanel.tsx`: `newDraftId()` (line 110–112), `defaultDraft()`
(lines 119–133), and the public `defaultFlowDraft()` wrapper (lines
114–117). The moved code needs the `FlowDef` type, `deriveActForEntity`, and
`DEFAULT_FLOW_TIMING` imports from `@/lib/flowBuilder` (copy the relevant
specifiers from `FlowBuilderPanel.tsx` lines 43–53).

In `FlowBuilderPanel.tsx`: delete the moved code, add
`import { defaultFlowDraft, defaultDraft } from './flowDraft';` — or export
only `defaultFlowDraft` and use it at the internal call sites (lines 206,
257), since `defaultFlowDraft()` and `defaultDraft()` are identical. Prefer
the single-export version and update the two internal call sites to
`defaultFlowDraft()`.

Update `Dashboard.tsx:41`:

```ts
import { FlowBuilderPanel } from './flow-builder/FlowBuilderPanel';
import { defaultFlowDraft } from './flow-builder/flowDraft';
```

**Verify**: `npx tsc -p tsconfig.app.json --noEmit` → exit 0.

### Step 4: Move DroneIcon to MapIcons and decouple UrgencyReviewPage from TacticalMap

In `src/primitives/MapIcons.tsx`, add the `DroneIcon` component copied from
`TacticalMap.tsx:117-134` together with the `DRONE_PATH` constant it renders
(find it near the top of `TacticalMap.tsx`; it is a module-level SVG path
string). Keep the export name `DroneIcon`. If `MapIcons.tsx` already has a
different drone glyph (`DroneCardIcon`), leave that one untouched — they are
different visuals.

In `TacticalMap.tsx`: replace the local definition by re-importing is NOT
wanted (that would keep the file in the graph). Instead leave
`TacticalMap.tsx` completely unmodified EXCEPT deleting nothing — simply
stop importing from it: update `UrgencyReviewPage.tsx:56`:

```ts
import { DroneIcon } from '@/primitives/MapIcons';
```

(Leaving the duplicate `DroneIcon` inside `TacticalMap.tsx` is intentional:
the file becomes dead in the module graph after this step, and deletion is
explicitly out of scope.)

**Verify**:
- `npx tsc -p tsconfig.app.json --noEmit` → exit 0
- `rg -n "from './TacticalMap'|from '@/app/components/TacticalMap'|components/TacticalMap'" src --glob '!**/*.spec.ts'` → no matches
- In `pnpm dev`, open the Urgency Review page and confirm the drone marker
  glyph still renders.

### Step 5: Full static gates

**Verify**:
- `pnpm lint` → exit 0
- `npx tsc -p tsconfig.app.json --noEmit` → exit 0
- `pnpm build` → exit 0

### Step 6: Prove the HMR behavior is fixed

Run `pnpm dev` and, with the app open in a browser, make a trivial
whitespace-only edit (add then remove a blank line, saving each time) to
each of these files while watching the dev-server output:

1. `src/imports/ListOfSystems.tsx`
2. `src/imports/useCardSlots.ts`
3. `src/app/components/NotificationSystem.tsx`
4. `src/app/components/flow-builder/FlowBuilderPanel.tsx`
5. `src/app/components/UrgencyReviewPage.tsx`

Expected for every file: a `hmr update` line only. There must be NO
`hmr invalidate ... Could not Fast Refresh` mentioning these files and NO
`page reload ... (circular import invalidate)` lines. (An `hmr update` that
also lists `src/styles/index.css` is normal — Tailwind v4 rescans classes on
every change.)

**Verify**: dev-server output matches the expectation above for all five
files.

## Test plan

No unit-test runner exists. Verification is:

- The static gates in Step 5.
- The live HMR proof in Step 6 (this is the acceptance test for the whole
  plan).
- Manual smoke: Dashboard notifications (Step 2), flow-builder "new draft"
  reset (Step 3 — open Flow Builder, discard/reset a draft), Urgency Review
  drone glyph (Step 4), target cards render with close-reason picker options
  (Step 1 — `getIncidentOutcomes` feeds the closure outcomes list).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npx tsc -p tsconfig.app.json --noEmit` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] `rg -n "import \{ getIncidentOutcomes \} from './ListOfSystems'" src` → no matches
- [ ] `rg -n "export (const|function) (getIncidentOutcomes|getFlow1Playbooks|getDismissReasons)" src/imports/ListOfSystems.tsx` → no matches
- [ ] `rg -n "export const MOCK_TARGETS" src/imports/ListOfSystems.tsx` → no matches
- [ ] `rg -n "showTacticalNotification" src/app/components/NotificationSystem.tsx` → no `export` definition match (imports/uses OK)
- [ ] `rg -n "export function defaultFlowDraft" src/app/components/flow-builder/FlowBuilderPanel.tsx` → no matches
- [ ] `rg -n "from './TacticalMap'" src/app/components/UrgencyReviewPage.tsx` → no matches
- [ ] Step 6 dev-server output recorded in the completion report
- [ ] `git status --short` shows no modified files outside the Scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any excerpt in "Current state" doesn't match the live code (drift since
  `805086b`).
- `NotificationSystem` (the component) turns out to share more module state
  with `showTacticalNotification` than listed (e.g. it reads `pendingBatch`
  directly) and the split requires changing behavior rather than moving
  code. Report the entanglement instead of redesigning the notification
  system.
- Moving `MOCK_TARGETS` / the catalog functions surfaces importers beyond
  `useCardSlots.ts` that import them **as values** from `./ListOfSystems`
  (search first: `rg -n "from '@/imports/ListOfSystems'|from './ListOfSystems'" src` and
  check each for non-`type` imports).
- After Step 6, `ListOfSystems.tsx` still triggers
  `(circular import invalidate)` — there is a second cycle this plan didn't
  identify. Report the cycle chain from the dev-server log.
- Any step appears to require editing a file on the out-of-scope list.

## Maintenance notes

- The invariant to protect in review: **component files export only
  components**. New constants/helpers born inside a `.tsx` component module
  should start life in a sibling `.ts` module instead.
- `eslint-plugin-react-refresh` is already a dev dependency — a follow-up
  (deferred, not in this plan) could enable its `only-export-components`
  rule to enforce the invariant mechanically.
- `TacticalMap.tsx` is dead in the module graph after this plan. A future
  cleanup can delete it (and possibly drop `mapbox-gl` / `react-map-gl`
  from dependencies) — flagged for the maintainer, deliberately not done
  here.
- If someone re-adds a value import from `ListOfSystems` into any module
  that `ListOfSystems` itself imports (directly or transitively), the full
  page reloads return. The dev-server log line
  `(circular import invalidate)` is the tell.
