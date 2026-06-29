/**
 * The "build this interaction" prompt copied by the handoff page's footer
 * button. It is deliberately domain-agnostic: it teaches the single-row,
 * multi-step process status toast as a reusable pattern, with no references to
 * this app, no concrete colours, timings, copy, or step ids — so any reader can
 * drop it into their own coding agent and adapt it to their own design system.
 *
 * Keep this file free of app-specific values if you edit it.
 */
export const PATHFINDER_IMPLEMENTATION_PROMPT = `You are a senior frontend engineer. Implement a single-row, multi-step "process status toast": one compact, near-monochrome surface that narrates a long-running, multi-phase process inline (prepare -> commit -> active -> teardown) without ever taking the user to another screen. Adapt every name, colour, timing, label, and step to your own design system and domain — the steps below are the pattern, not literal values to copy.

GOAL
A presentational component that, given a single state object and a locale, renders the correct row for the current moment of a multi-step process. It tells the whole story — status, progress, and the single next move — in one calm row.

STEP-BY-STEP

1. Presentational contract
   - Build the component as purely presentational. It takes one state/snapshot object (the current phase, the ordered step list, per-step statuses, the active step, and a run-state enum) plus a locale, and an optional dismiss callback. All visuals derive from state; the component holds no business logic and runs no timers itself.
   - Drive the state from a separate hook/state machine you can also feed with frozen snapshots (for tests, galleries, and the debug tool below).

2. Anatomy — exactly three slots
   - A leading icon that doubles as a loader (idle glyph when paused/awaiting, spinner while running, success/fault glyph in terminal states).
   - The current step label (single line, truncating).
   - Exactly one context action (the one move that matters right now).
   - Between the label and the action, a quiet "n / total" counter — progress without a progress bar. Nothing else competes for attention.

3. State machine & run states
   - Model run states explicitly, e.g.: running, awaiting-commit (a gate), active, error, aborted, done.
   - Auto-advance the rote steps on a steady dwell. But never auto-commit the irreversible step: at the end of the preparatory phase, stop and wait on an explicit user action.

4. State-aware context action
   - The single action slot is state-aware: it is Stop while the sequence auto-runs, becomes Commit/Proceed when gated, and becomes Teardown/Return once active. In terminal states it becomes a dismiss/close affordance.
   - Every command must be a no-op in a state where it does not apply, so the surface tolerates mashing and out-of-order input without breaking.

5. Fault & retry
   - On a failed step, halt on that step and recolour the whole row to your fault colour (icon, label, counter). Surface a Retry action next to Stop. Nothing advances until the user decides. Retrying clears the fault and resumes.

6. Label & counter motion
   - Animate label swaps: key the label element on its text so the framework replays the entrance (a short slide + fade) on every change. Motion should only ever mark a real change — never decorate.
   - The counter climbs continuously across phase boundaries (…16/23 then 17/23) instead of resetting, so it reads as one journey.
   - Under prefers-reduced-motion, drop everything to a plain instant/fade swap.

7. Internationalisation & RTL
   - Build the row on logical properties (inline gaps, text-start, inline-start margins) so a single direction flip mirrors icon, label, and action across the centre axis with no second layout. Keep the numeric counter LTR — numbers never mirror.

8. Real placement
   - Mount it in your toast system pinned top-center. It carries its own surface, so strip/override the default toast container chrome for this one toast to avoid a doubled-toast look.
   - Re-launching should replace in place via a stable toast id. Guard the one edge case where a re-fire lands during the previous toast's exit animation (it would stack behind it): if the time since the last close is less than the exit duration, defer the new fire until that window passes.

9. Ship the debug tool with it
   - Add a debug surface that drives every state from keyboard shortcuts (play/pause, step, restart, commit, teardown, retry, stop), a speed control for the dwell, and a fault injector that forces any chosen step to fail. This is how you sand every edge before shipping.

CONSTRAINTS
   - Near-monochrome by default; reserve colour for the two signals that matter: the Stop action and a fault.
   - No external animation library should be required; the key-replay trick and CSS/your framework's primitives are enough.
   - Keep it presentational: no buttons outside the single context slot, do not wrap it in another card (it brings its own surface), and never animate it on first mount — state transitions are for responding to input, not page load.

ACCEPTANCE CRITERIA
   - The row shows icon + label + counter + one state-correct action at all times.
   - Auto-run advances on its own but gates the irreversible step on explicit user action.
   - A fault recolours the row and offers Retry; recovery is in the same slot the next action always lives in.
   - Spamming any control never produces a broken or stuck state.
   - One direction flip fully mirrors the row; the counter stays LTR.
   - All motion respects prefers-reduced-motion.`;
