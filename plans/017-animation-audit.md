# 017 — Animation & Motion Audit

- **Commit at audit time:** `5b9ffe4` (plus uncommitted working tree)
- **Skills applied:** `.agents/skills/improve-animations/AUDIT.md` (8 categories), `ui-craft` animation/review references
- **Scope:** all of `src/` (CSS transitions/animations, Tailwind `transition-*`/`animate-*`, framer-motion, rAF/WAAPI, Cesium camera motion)
- **Status:** HIGH + MEDIUM findings implemented in the working tree (this session). LOW items and missed opportunities remain as backlog below.

## Recon summary

The repo has a strong motion token system already: `src/lib/springs.ts` (three tiers — fast 0.08s / moderate 0.16s / slow 0.24s, one-tier-faster exits), mirrored CSS vars `--motion-*` + `--ease-bounce`/`--ease-exit` in `src/styles/theme.css`, `.overlay-motion-*` helpers for Radix overlays, and app-wide `<MotionConfig reducedMotion="user">` in `App.tsx`. The dominant problems are **call sites that bypass the tokens** (hand-typed `duration-150 ease-out` in 40+ files), **CSS/WAAPI animation paths that escape framer-motion's reduced-motion handling**, and **Cesium camera motion with no reduced-motion guard** (the worst vestibular offender — full-viewport movement).

Personality: crisp tactical C2 dashboard. High-frequency surfaces: Dashboard, Cesium map + markers, devices panel, target-queue primitives, shadcn overlays. Low: onboarding (WIP), styleguide, sandboxes/labs.

## Findings

Severity: HIGH = feel-breaking / a11y-breaking on high-traffic surfaces. MEDIUM = noticeably off. LOW = polish/deferred.

| # | Sev | Category | Location | Finding | Fix |
|---|-----|----------|----------|---------|-----|
| 1 | HIGH | Accessibility | `src/styles/theme.css` (overlay helpers); all `src/app/components/ui/*` overlays | tw-animate `zoom-in-95`/`slide-in-*` keyframes on every Radix overlay (tooltip, popover, dropdown, select, menubar, context-menu, dialog, alert-dialog, drawer, hover-card) run zoom+translate with no `prefers-reduced-motion` handling — CSS animations are outside `MotionConfig`'s reach | One rule in `theme.css`: under `prefers-reduced-motion: reduce`, reset `--tw-enter/exit-scale/translate-x/translate-y` on `.overlay-motion-*[data-state]` — keeps the opacity fade (comprehension), drops movement. **DONE** |
| 2 | HIGH | Accessibility + tokens | `src/primitives/MapMarker.tsx:71-88,106-107,127,144,164,174,199,223,248` | WAAPI infinite scale(1→3) hover pulse and `animate-pulse` ring with no reduced-motion branch; 8 hand-typed inline transitions (`200ms/300ms` bare `ease`) off the token ladder, on the always-visible map | Gate WAAPI pulse + `animate-pulse` behind reduced-motion; tokenize inline durations to `var(--motion-moderate)`/`var(--motion-slow)`. **DONE** |
| 3 | HIGH | Accessibility | `src/styles/theme.css:261-277` (`missile-pulse`, `jam-confirm-blink`), `src/app/components/devices-panel/controls/JamSplitButton.tsx:120`; generated `src/registry/c2-theme.css` | Infinite transform pulse + blink keyframes with no reduced-motion guard at token level | `@media (prefers-reduced-motion: reduce)` guard in `theme.css`; regenerate registry CSS via `node scripts/registry-theme.mjs`. **DONE** |
| 4 | HIGH | Accessibility | `src/app/components/CesiumTacticalMap.tsx:531-546,1801-1806`; `src/primitives/CesiumMap.tsx:1317-1325,2018-2062` | Camera bearing slew (800ms rAF), scene-mode flyTo (0.8s) and imperative flyTo (1.2s default) animate the whole viewport with no `prefers-reduced-motion` snap (the `orbit` effect at `CesiumMap.tsx:2068` already checks it — inconsistent); control-indicator `animate-pulse` unguarded | Snap camera (duration 0 / direct set) under reduced motion in all three paths; `motion-reduce:animate-none` on the indicator. **DONE** |
| 5 | HIGH | Cohesion & tokens | 40+ files; high-traffic subset: `src/app/components/ui/button.tsx:8`, `src/app/components/Dashboard.tsx:252-259,2593,2613`, `devices-panel/*` (9 files), `src/primitives/` (FilterBar, CardActions, CardIdentity, CardFooterDock, CardTimeline, CardHeader, AccordionSection, SplitActionButton, MapIcons, CardMedia, NewUpdatesPill), `NotificationSystem.tsx`, `NotificationCenter.tsx`, `CameraViewerPanel.tsx`, camera-v2 (5 files), `DockedPanel.tsx`, `DevicesPanelImpl.tsx`, `map-draw` (2 files), `PathfinderLaunchToast.tsx` | Hand-typed `duration-100/150/200/300 ease-out` everywhere while the canonical ladder is `--motion-fast` 80 / `--motion-moderate` 160 / `--motion-slow` 240 (`@/primitives/Button` already uses `duration-[var(--motion-fast)]`) — near-duplicate cluster, slightly sluggish hovers | Map 100/150→`var(--motion-fast)`, 200→`var(--motion-moderate)`, 300→`var(--motion-slow)` on the high-traffic subset. **DONE** (styleguide/sandbox/lab occurrences deferred, see LOW) |
| 6 | HIGH | Interruptibility + a11y | `src/app/components/devices-panel/DeviceRow.tsx:195` | `animate-in fade-in-0 duration-200` on CollapsibleContent — off-token, no `motion-reduce` guard, and the keyframe entrance replays on every Virtuoso row remount | Tokenize to `--motion-moderate` + `--ease-bounce`, add `motion-reduce:animate-none`. **DONE** |
| 7 | HIGH | Cohesion & tokens | `src/primitives/FilterBar.tsx:253` | Popover overrides `data-[state=open]:duration-150 data-[state=closed]:duration-100`, defeating the `overlay-motion-fast` tokens the base PopoverContent already carries (80ms in / 60ms out, proper curves) | Delete the two override classes. **DONE** |
| 8 | MED | Easing & tokens | `src/app/components/ui/sheet.tsx:61` | Hand-assembled `transition ease-in-out` + per-state durations instead of the `.overlay-motion-slow` helper; `ease-in-out` on an enter/exit slide; slides not covered by any reduced-motion handling | Replace with `overlay-motion-slow` (same durations, `--ease-bounce`/`--ease-exit` curves, inherits finding-1 reduced-motion reset). **DONE** |
| 9 | MED | Physicality & origin | `src/app/components/devices-panel/controls/DeviceOverflowMenu.tsx:40` | Menu anchored `bottom-full end-0` zooms from center instead of the corner adjacent to its trigger | `origin-bottom-right rtl:origin-bottom-left` + tokenized duration. **DONE** |
| 10 | MED | AnimatePresence | `src/imports/ListOfSystems.tsx:1010-1028` + `src/primitives/NewUpdatesPill.tsx:28` | AnimatePresence's direct child is a plain `<div>`, so the pill's `exit` never runs (it pops out instantly); pill's transition is a hand-rolled 0.2s cubic-bezier tween off the spring tokens | Make the positioning wrapper a `motion.div`; pill transition → `spring.moderate`. **DONE** |
| 11 | MED | Accessibility | `src/app/components/devices-panel/useFocusedDevice.ts:52` | `scrollIntoView({ behavior: 'smooth' })` not gated by reduced motion (ListOfSystems gates the same pattern) | Gate to `auto` under reduced motion. **DONE** |
| 12 | MED | Accessibility | `src/app/components/ui/skeleton.tsx:7`, `src/primitives/CardFooterDock.tsx:54`, `src/primitives/markerTailwind.ts:120` | Infinite `animate-pulse`/`animate-spin` on shared primitives with no `motion-reduce:animate-none` | Add the guard class. **DONE** |
| 13 | MED | Easing & tokens | `src/app/components/CameraViewerPanel.tsx:344` | Custom `{ type:'spring', duration:0.35, bounce:0.1 }` (>300ms, off-token) on split-screen reveal | Use `spring.slow` from `@/lib/springs`. **DONE** |
| 14 | MED | Cohesion | `src/primitives/TargetCard.tsx:117`, `src/primitives/AccordionSection.tsx:51` | Collapsible height keyframes run at tw-animate default 0.2s/`ease` instead of the tokenized durations `ui/accordion.tsx` already applies | Add `[animation-duration:var(--motion-moderate)]` / exit variant, matching `ui/accordion.tsx`. **DONE** (interruptibility refactor deferred — see LOW-23) |
| 15 | MED | Tokens | `src/styles/theme.css:330` (sonner toast buttons) | Hand-typed `150ms ease` ×3 | `var(--motion-fast) ease`; registry CSS regenerated. **DONE** |
| 16 | MED | Cohesion | `src/app/components/Dashboard.tsx:2613`, `src/app/components/DockedPanel.tsx:100`, `src/app/components/devices-panel/DevicesPanelImpl.tsx:211` | Panel slides disagree (`300 ease-in-out` vs `300 ease-out`) and bypass the ladder | All → `duration-[var(--motion-slow)] ease-out`. **DONE** |

## LOW / deferred (backlog — not implemented)

- **17. Framer-motion `x`/`y`/`scale` shorthand props** (Button/SplitActionButton/CameraToggleButton label crossfade, CardActions, NewUpdatesPill, PathfinderLaunchToast, Dashboard drop zone, onboarding): not hardware-accelerated per AUDIT §5. Converting to `animate={{ transform }}` breaks per-axis springs and risks feel regressions app-wide; no observed frame drops. Revisit only with profiling evidence (relates to plan 004).
- **18. `src/app/components/ui/sidebar.tsx`**: `transition-all`, `ease-linear`, layout-property transitions (`width/left/right/margin/padding`) — **file is unimported/dead**; fix or delete when it's actually adopted.
- **19. Status sandboxes** (`status-sandbox/StatusSandbox.tsx:378`, `status-v2/StatusV2Sandbox.tsx:475`): `transition-all` on a toggle knob that animates `inset-inline-start` (layout). Fix = transform-based translate. Sandbox-only.
- **20. Onboarding (WIP surface)** (`OnboardingFlow.tsx:269-316`, `OnboardingMap.tsx:143-183`, `AssetDock.tsx:80`): >300ms entrances, `scale: 0.6`/`0.4`/`scaleY: 0` starts, springs off-token, missing `initial={false}` on the intro AnimatePresence. First-run delight budget makes this tolerable; re-audit when the flow stabilizes.
- **21. Styleguide / labs / handoff / video-hud sandboxes**: off-token durations throughout, framer `height` animation (`StyleguidePage.tsx:1617,1690`), flow7 rAF tween (`StyleguidePage.tsx:1860`), rAF loops that CSS could drive (`SandboxCompassControl`, `useAnimatedValue`, `useCrosshairBloom`). Low-traffic; sweep opportunistically.
- **22. Dotmatrix rAF phase hooks** (`ui/dotmatrix-hooks.ts:49-84` `useCyclePhase` → per-frame `setState` re-rendering `DotmSquare18` in the devices panel): performance refactor, belongs with the plan-004 render-budget work. `dotmatrix-loader.css` `will-change: opacity` on many dots is a layer-memory cost to measure there too.
- **23. Collapsible height keyframes → interruptible transitions** (TargetCard, AccordionSection, ui/accordion): tw-animate height keyframes restart from zero when rapidly toggled; a `grid-template-rows 0fr↔1fr` transition (already the pattern in `DeviceChildGroup.tsx:129`) retargets smoothly. Feel-check required; medium effort.
- **24. `will-change-transform` on button primitives** (Button.tsx:101, SplitActionButton, CameraToggleButton): borderline-legitimate (they animate transform on press + label swap); revisit only if layer memory shows up in profiling.

## Missed opportunities (additive, not implemented)

1. **Docked panels teleport in** — `Dashboard.tsx:2709-2794` conditionally mounts Devices/Flow-Builder/Sim panels, so `DockedPanel`'s slide never plays on open. Keep mounted (or mount-then-open on the next frame) to get the spatial entry from the rail.
2. **Active ↔ Completed tab swap** (`ListOfSystems.tsx:1037-1046`) hard-swaps list content; a ~120ms opacity handoff would stop the teleport.
3. **Notification batch expand** (`NotificationSystem.tsx:110-117`) collapsed-summary ↔ item-list is an instant DOM swap during a high-attention moment; a `grid-template-rows` reveal would aid comprehension.
4. **Camera split panel** (`Dashboard.tsx:2591-2603`) appears via bare layout reflow with no motion linking it to the rail toggle that opened it.

## Vetted-and-rejected (do not re-report)

- `dotmatrix-loader.css:176` `ease-in` on `.dmx-collapse` — it's an exit/decay; accelerating exits are the repo convention (`--ease-exit`), and reduced-motion is already handled at `:1102`.
- `grid-template-rows/columns 0fr↔1fr` transitions (`DeviceChildGroup`, `DeviceRowHeader`, `DesignSystem`) — deliberate interruptible expand pattern; better than the keyframe alternative despite touching layout.
- `CopyButton` `scale: 0.85` overshoot entrance — documented deliberate design (styleguide changelog), reduced-motion handled.
- `notif-vignette` pulse — reduced-motion guard present and correctly keeps the opacity state cue.
- `input-otp` caret blink — mimics the native text caret; blink is expected caret semantics.
- Centered `transform-origin` on dialogs/alert-dialogs — modals are exempt (AUDIT §3).
- `ui/tooltip.tsx` — `data-[state=instant-open]:animate-none` already implements "subsequent tooltips skip animation"; correct.
- Label crossfade on Button family — documented convention (`springs.ts` cites it as the house style); frequency concern noted but settled.
