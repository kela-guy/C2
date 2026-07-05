/**
 * ProcessStatusToast — a self-contained starter for the single-row,
 * multi-step "process status toast" pattern.
 *
 * ── What this file is ────────────────────────────────────────────────────────
 * A generic, dependency-free reference implementation of the interaction
 * documented on the handoff page. Copy this ONE file into any React app and it
 * runs as-is: no UI library, no animation library, no CSS framework, no icon
 * package — just React, inline styles, and a few injected keyframes.
 *
 * The demo domain is a deployment pipeline (build → gate on "Deploy" → roll
 * out → live → take offline). Every name, colour, label, and step is a
 * placeholder — replace them with your own domain.
 *
 * ── The architecture, in one sentence ────────────────────────────────────────
 * The toast is PRESENTATIONAL: the backend owns the pace and streams progress;
 * the client renders the latest snapshot and sends commands back. The toast
 * never runs a timer and never advances anything on its own.
 *
 * ── The four parts, and what to do with each ────────────────────────────────
 * 1. SEQUENCE MODEL       — replace. Your phases, steps, and strings.
 * 2. THE CONTRACT         — keep the shape. `ProcessState` is the snapshot your
 *                           backend feed produces; `ProcessCommands` is what
 *                           the toast's actions call. See PRODUCTION WIRING for
 *                           how to connect both to your real backend.
 * 3. ProcessStatusToast   — keep. The presentational row. Every visual derives
 *                           from the state you pass in; it holds no timers and
 *                           no business logic.
 * 4. DEMO DRIVER          — delete. A local timer that fakes a backend so this
 *                           file can run standalone on your desk. It exists so
 *                           `<ProcessStatusToastDemo />` plays; it is NOT part
 *                           of the component and has no production role.
 *
 * ── Behaviour contract (the short version) ──────────────────────────────────
 * - Exactly three slots: icon/loader · current step label · one context action
 *   (plus a quiet n/total counter). Nothing else competes for attention.
 * - The backend streams the rote steps; the irreversible step never fires on
 *   its own — the sequence parks in `awaiting-commit` until the user acts.
 * - The action slot is state-aware (Stop → Commit → Wind down → Retry) and
 *   every command is a no-op in states where it does not apply.
 * - On a fault the whole row recolours and halts until Retry or Stop.
 * - Label swaps are keyed on the text so the entrance replays on every change;
 *   `prefers-reduced-motion` drops all motion to instant swaps.
 * - The layout uses flex + logical properties, so `dir="rtl"` mirrors the row
 *   wholesale while the numeric counter stays LTR.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ════════════════════════════════════════════════════════════════════════════
 * 1 · SEQUENCE MODEL — replace with your own domain
 * ══════════════════════════════════════════════════════════════════════════ */

export type Phase = 'prepare' | 'rollout' | 'teardown';

export type StepStatus = 'pending' | 'active' | 'done' | 'error';

export type RunState =
  | 'running' // backend is working through the current phase
  | 'awaiting-commit' // prepare finished; gated on an explicit user action
  | 'holding' // open-ended active state (live / on station / serving)
  | 'error' // halted on a failed step until Retry or Stop
  | 'aborted' // user cancelled; terminal
  | 'done'; // teardown finished; terminal

export interface ProcessStep {
  id: string;
  phase: Phase;
  label: string;
}

/** Steps the backend runs through, then gates on the user's explicit "Deploy". */
const PREPARE_STEPS: ProcessStep[] = [
  { id: 'install', phase: 'prepare', label: 'Install dependencies' },
  { id: 'typecheck', phase: 'prepare', label: 'Type check' },
  { id: 'lint', phase: 'prepare', label: 'Lint' },
  { id: 'test', phase: 'prepare', label: 'Run tests' },
  { id: 'build', phase: 'prepare', label: 'Build bundle' },
  { id: 'preflight', phase: 'prepare', label: 'Preflight checks' },
];

/** Steps the backend runs after the commit. The last one is open-ended. */
const ROLLOUT_STEPS: ProcessStep[] = [
  { id: 'upload', phase: 'rollout', label: 'Upload artifacts' },
  { id: 'provision', phase: 'rollout', label: 'Provision instances' },
  { id: 'warm', phase: 'rollout', label: 'Warm caches' },
  { id: 'shift', phase: 'rollout', label: 'Shift traffic' },
  { id: 'live', phase: 'rollout', label: 'Live · serving traffic' },
];

/** The wind-down leg, triggered from the open-ended holding state. */
const TEARDOWN_STEPS: ProcessStep[] = [
  { id: 'drain', phase: 'teardown', label: 'Drain traffic' },
  { id: 'deactivate', phase: 'teardown', label: 'Deactivate deployment' },
];

/** All user-facing copy in one place so localisation is a single swap. */
const STRINGS = {
  ready: 'Ready to deploy',
  done: 'Deployment offline',
  aborted: 'Deployment cancelled',
  stop: 'Stop',
  commit: 'Deploy',
  windDown: 'Take offline',
  retry: 'Retry',
  dismiss: 'Dismiss',
};

/* ════════════════════════════════════════════════════════════════════════════
 * 2 · THE CONTRACT — keep the shape
 *
 * `ProcessState` is a plain snapshot: derive it from whatever your backend
 * streams (websocket events, polling, a job-status endpoint) and re-render on
 * every update. `ProcessCommands` is the reverse direction: the toast's
 * actions call these, and your implementations send the command to the
 * backend. The toast itself never decides when to advance — the one thing the
 * client owns is the commit gate, and even that only SENDS the command.
 *
 * ── PRODUCTION WIRING (sketch) ───────────────────────────────────────────────
 *
 *   function useDeploymentToast(deployId: string) {
 *     const [state, setState] = useState<ProcessState>(initialSnapshot);
 *
 *     useEffect(() => {
 *       // Your transport: websocket, SSE, or polling. The backend reports
 *       // each step as it resolves; you just fold events into the snapshot.
 *       return subscribeToDeployment(deployId, (event) => {
 *         setState((prev) => applyEvent(prev, event));
 *       });
 *     }, [deployId]);
 *
 *     const commands: ProcessCommands = {
 *       commit: () => api.confirmDeploy(deployId),   // the human gate
 *       windDown: () => api.takeOffline(deployId),
 *       retry: () => api.retryStep(deployId),
 *       abort: () => api.cancel(deployId),
 *     };
 *
 *     return { state, commands };
 *   }
 *
 *   <ProcessStatusToast state={state} commands={commands} />
 * ══════════════════════════════════════════════════════════════════════════ */

/** The snapshot the toast renders. Data only — no callbacks, no timers. */
export interface ProcessState {
  phase: Phase;
  runState: RunState;
  /** The ordered step list for the current phase. */
  steps: ProcessStep[];
  statuses: Record<string, StepStatus>;
  /** Id of the step currently in progress, or null. */
  activeId: string | null;
}

/**
 * What the toast's actions call. Each sends a command to your backend and
 * MUST be safe to call in states where it does not apply (treat out-of-state
 * commands as no-ops server-side too — the surface tolerates mashing).
 */
export interface ProcessCommands {
  /** The one human gate: confirm the irreversible step. */
  commit: () => void;
  windDown: () => void;
  retry: () => void;
  abort: () => void;
}

/* ════════════════════════════════════════════════════════════════════════════
 * 3 · THE TOAST — presentational. Keep this part.
 * ══════════════════════════════════════════════════════════════════════════ */

/** Palette in one place. Map these onto your design tokens. */
const C = {
  surface: '#1c1c20',
  ink: '#fafafa',
  muted: '#71717a',
  danger: '#f87171',
  primaryBg: '#f4f4f5',
  primaryInk: '#18181b',
};

const TOTAL_TO_LIVE = PREPARE_STEPS.length + ROLLOUT_STEPS.length;

/**
 * Quiet `n/total` for the step in progress, or null when nothing is counting
 * (gate, holding, terminal states). Counts continuously across the prepare →
 * rollout boundary so the number reads as one journey instead of resetting.
 */
function stepCounter(state: ProcessState): string | null {
  if (state.runState === 'holding') return null;
  const idx = state.steps.findIndex((s) => s.id === state.activeId);
  if (idx < 0) return null;
  if (state.phase === 'teardown') return `${idx + 1}/${state.steps.length}`;
  const base = state.phase === 'rollout' ? PREPARE_STEPS.length : 0;
  return `${base + idx + 1}/${TOTAL_TO_LIVE}`;
}

/** The single line of text shown for the current state. */
function currentLabel(state: ProcessState): string {
  switch (state.runState) {
    case 'awaiting-commit':
      return STRINGS.ready;
    case 'done':
      return STRINGS.done;
    case 'aborted':
      return STRINGS.aborted;
    default: {
      const active = state.steps.find((s) => s.id === state.activeId);
      return active ? active.label : PREPARE_STEPS[0].label;
    }
  }
}

/**
 * Keyframes + the few styles inline `style` can't express (hover, reduced
 * motion). Injected once; everything is namespaced `pst-` to avoid collisions.
 */
const STYLES = `
@keyframes pst-slide-in { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pst-spin { to { transform: rotate(360deg); } }
.pst-label-swap { animation: pst-slide-in 260ms cubic-bezier(0.3, 0.9, 0.4, 1); }
.pst-spinner { animation: pst-spin 800ms linear infinite; }
.pst-btn { border: 0; font: inherit; cursor: pointer; transition: background-color 150ms, color 150ms, transform 150ms; }
.pst-btn:active { transform: scale(0.95); }
.pst-btn-primary:hover { background-color: #ffffff !important; }
.pst-btn-stop:hover { background-color: rgba(248, 113, 113, 0.1); color: ${C.danger} !important; }
.pst-btn-dismiss { opacity: 0; }
.pst-root:hover .pst-btn-dismiss, .pst-btn-dismiss:focus-visible { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .pst-label-swap { animation: none; }
}
`;

/* Inline SVG stand-ins for your icon set. */

function SpinnerIcon() {
  return (
    <svg className="pst-spinner" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-label="Working">
      <circle cx="8" cy="8" r="6.5" stroke={C.muted} strokeOpacity="0.35" strokeWidth="2" />
      <path d="M8 1.5 A 6.5 6.5 0 0 1 14.5 8" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GlyphIcon({ color }: { color: string }) {
  // Placeholder identity glyph — swap for your product/brand icon.
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill={color} aria-hidden>
      <rect x="2" y="2" width="12" height="12" rx="3" />
    </svg>
  );
}

function StateIcon({ state }: { state: ProcessState }) {
  switch (state.runState) {
    case 'running':
      return <SpinnerIcon />;
    case 'error':
      return <GlyphIcon color={C.danger} />;
    case 'aborted':
      return <GlyphIcon color={C.muted} />;
    default:
      return <GlyphIcon color="#d4d4d8" />;
  }
}

export interface ProcessStatusToastProps {
  state: ProcessState;
  commands: ProcessCommands;
  /** Flip to 'rtl' and the row mirrors wholesale (the counter stays LTR). */
  dir?: 'ltr' | 'rtl';
  /** Shown in the terminal states (done / aborted) as a close affordance. */
  onDismiss?: () => void;
}

export function ProcessStatusToast({ state, commands, dir = 'ltr', onDismiss }: ProcessStatusToastProps) {
  const label = currentLabel(state);
  const counter = stepCounter(state);
  const isError = state.runState === 'error';

  return (
    <div
      dir={dir}
      className="pst-root"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: 340,
        padding: '12px 14px',
        borderRadius: 2,
        backgroundColor: C.surface,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 12px 40px -8px rgba(0,0,0,0.7)',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'start',
      }}
    >
      <style>{STYLES}</style>

      {/* 1 · Icon / loader */}
      <span style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, flexShrink: 0 }}>
        <StateIcon state={state} />
      </span>

      {/* 2 · Task label — keyed on its text so the entrance replays per change.
          The clipped row keeps the swap from ever shifting layout. */}
      <div style={{ position: 'relative', height: 20, minWidth: 0, flex: 1, overflow: 'hidden' }}>
        <span
          key={label}
          className="pst-label-swap"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 13,
            fontWeight: 500,
            color: isError ? C.danger : C.ink,
          }}
        >
          {label}
        </span>
      </div>

      {/* Quiet n/total counter. dir="ltr" because numbers never mirror. */}
      {counter && (
        <span
          key={counter}
          dir="ltr"
          className="pst-label-swap"
          style={{
            flexShrink: 0,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
            fontVariantNumeric: 'tabular-nums',
            color: isError ? C.danger : C.muted,
          }}
        >
          {counter}
        </span>
      )}

      {/* 3 · Context action — the one move that matters right now. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {state.runState === 'running' && <StopButton onClick={commands.abort} />}
        {state.runState === 'awaiting-commit' && (
          <>
            <StopButton onClick={commands.abort} />
            <PrimaryButton onClick={commands.commit}>{STRINGS.commit}</PrimaryButton>
          </>
        )}
        {state.runState === 'holding' && (
          <PrimaryButton onClick={commands.windDown}>{STRINGS.windDown}</PrimaryButton>
        )}
        {state.runState === 'error' && (
          <>
            <StopButton onClick={commands.abort} />
            <PrimaryButton onClick={commands.retry}>{STRINGS.retry}</PrimaryButton>
          </>
        )}
        {(state.runState === 'done' || state.runState === 'aborted') && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={STRINGS.dismiss}
            className="pst-btn pst-btn-dismiss"
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 24,
              height: 24,
              borderRadius: 1,
              backgroundColor: 'transparent',
              color: C.muted,
              fontSize: 15,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pst-btn pst-btn-primary"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 28,
        padding: '0 12px',
        borderRadius: 1,
        backgroundColor: C.primaryBg,
        color: C.primaryInk,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

/** The lone splash of colour besides the fault state — kept ghost-weight. */
function StopButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pst-btn pst-btn-stop"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 28,
        padding: '0 10px',
        borderRadius: 1,
        backgroundColor: 'transparent',
        color: 'rgba(248, 113, 113, 0.8)',
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
        <rect width="10" height="10" rx="2" />
      </svg>
      {STRINGS.stop}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * 4 · DEMO DRIVER — delete in production
 *
 * In production the backend owns this rhythm (see PRODUCTION WIRING above).
 * The timer below exists ONLY so this file runs standalone: it fakes a backend
 * that resolves one step every `speedMs`, honours the commit gate, and lets
 * you inject a fault to see the error → retry flow. None of it ships.
 * ══════════════════════════════════════════════════════════════════════════ */

interface DemoConfig {
  /** Milliseconds the fake backend dwells on each step. */
  speedMs?: number;
  /** Step id that fails once (cleared by Retry). null = no fault. */
  failStepId?: string | null;
}

function stepsForPhase(phase: Phase): ProcessStep[] {
  if (phase === 'prepare') return PREPARE_STEPS;
  if (phase === 'rollout') return ROLLOUT_STEPS;
  return TEARDOWN_STEPS;
}

function pendingStatuses(steps: ProcessStep[]): Record<string, StepStatus> {
  return Object.fromEntries(steps.map((s) => [s.id, 'pending' as StepStatus]));
}

interface DemoSimState {
  phase: Phase;
  activeIndex: number; // -1 = nothing active yet in this phase
  statuses: Record<string, StepStatus>;
  runState: RunState;
}

function initialDemoState(): DemoSimState {
  return {
    phase: 'prepare',
    activeIndex: -1,
    statuses: pendingStatuses(PREPARE_STEPS),
    runState: 'running',
  };
}

/** The open-ended step: once it becomes active, hold until the user acts. */
const HOLDING_STEP_ID = 'live';

export function useDemoSim({ speedMs = 900, failStepId = null }: DemoConfig = {}): {
  state: ProcessState;
  commands: ProcessCommands;
  restart: () => void;
} {
  const [sim, setSim] = useState<DemoSimState>(initialDemoState);
  // Steps that already consumed their injected fault — they pass on retry.
  const retriedRef = useRef<Set<string>>(new Set());
  const failRef = useRef(failStepId);
  useEffect(() => {
    failRef.current = failStepId;
  }, [failStepId]);

  /** One fake backend beat: resolve the active step, surface the next. */
  const advance = useCallback((prev: DemoSimState): DemoSimState => {
    if (prev.runState !== 'running') return prev;
    const list = stepsForPhase(prev.phase);

    if (prev.activeIndex < 0) {
      return { ...prev, activeIndex: 0, statuses: { ...prev.statuses, [list[0].id]: 'active' } };
    }

    const active = list[prev.activeIndex];

    if (failRef.current === active.id && !retriedRef.current.has(active.id)) {
      return { ...prev, statuses: { ...prev.statuses, [active.id]: 'error' }, runState: 'error' };
    }

    const statuses = { ...prev.statuses, [active.id]: 'done' as StepStatus };
    const nextIndex = prev.activeIndex + 1;

    // End of this phase's list — the fake backend also never auto-commits.
    if (nextIndex >= list.length) {
      if (prev.phase === 'prepare') {
        return { ...prev, statuses, activeIndex: -1, runState: 'awaiting-commit' };
      }
      return { ...prev, statuses, activeIndex: -1, runState: 'done' };
    }

    const next = list[nextIndex];
    statuses[next.id] = 'active';
    const runState: RunState = next.id === HOLDING_STEP_ID ? 'holding' : 'running';
    return { ...prev, statuses, activeIndex: nextIndex, runState };
  }, []);

  useEffect(() => {
    if (sim.runState !== 'running') return;
    const id = setInterval(() => setSim(advance), speedMs);
    return () => clearInterval(id);
  }, [sim.runState, sim.phase, speedMs, advance]);

  const restart = useCallback(() => {
    retriedRef.current = new Set();
    setSim(initialDemoState());
  }, []);

  // The demo's command handlers mirror what your backend would do on receipt.
  const commands = useMemo<ProcessCommands>(
    () => ({
      commit: () =>
        setSim((s) =>
          s.runState !== 'awaiting-commit'
            ? s // no-op outside the gate
            : { phase: 'rollout', activeIndex: -1, statuses: pendingStatuses(ROLLOUT_STEPS), runState: 'running' },
        ),
      windDown: () =>
        setSim((s) =>
          s.runState !== 'holding'
            ? s // no-op unless holding
            : { phase: 'teardown', activeIndex: -1, statuses: pendingStatuses(TEARDOWN_STEPS), runState: 'running' },
        ),
      retry: () =>
        setSim((s) => {
          if (s.runState !== 'error') return s;
          const active = stepsForPhase(s.phase)[s.activeIndex];
          if (!active) return s;
          retriedRef.current.add(active.id);
          return { ...s, statuses: { ...s.statuses, [active.id]: 'active' }, runState: 'running' };
        }),
      abort: () =>
        setSim((s) => {
          if (s.runState === 'done' || s.runState === 'aborted') return s; // terminal — no-op
          return { ...s, activeIndex: -1, runState: 'aborted' };
        }),
    }),
    [],
  );

  const steps = useMemo(() => stepsForPhase(sim.phase), [sim.phase]);
  const activeId = sim.activeIndex >= 0 ? steps[sim.activeIndex]?.id ?? null : null;

  const state: ProcessState = {
    phase: sim.phase,
    runState: sim.runState,
    steps,
    statuses: sim.statuses,
    activeId,
  };

  return { state, commands, restart };
}

/** Mounts the toast against the demo driver. Delete along with the driver. */
export function ProcessStatusToastDemo() {
  // Try failStepId: 'test' to see the fault → retry flow.
  const { state, commands, restart } = useDemoSim({ speedMs: 900, failStepId: null });
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 200, backgroundColor: '#101013' }}>
      <ProcessStatusToast state={state} commands={commands} onDismiss={restart} />
    </div>
  );
}
