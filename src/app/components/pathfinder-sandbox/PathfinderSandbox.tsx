/**
 * Pathfinder takeoff toast sandbox.
 *
 * A standalone surface (route `/pathfinder-sandbox`) for agreeing on the look,
 * feel, and interaction of the multi-step launch toast before wiring it to the
 * real control flow. Three things to review:
 *   1. Live canvas — drive the full sequence with the debug controls.
 *   2. Fire in Sonner — validate real placement/stacking (top-center).
 *   3. Device card — the Pathfinder DeviceRow with its state-aware primary.
 *   4. Frozen gallery — every key state side by side.
 */

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Toaster } from '../ui/sonner';
import {
  DeviceRow,
  DEFAULT_DEVICE_PANEL_STRINGS,
  DEFAULT_CONNECTION_STATE_LABELS,
  type Device,
} from '@/app/components/devices-panel';
import { getStrings } from '@/lib/intl';
import { DroneDeviceIcon } from '@/primitives/ProductIcons';
import { PathfinderLaunchToast } from '@/app/components/pathfinder/PathfinderLaunchToast';
import { usePathfinderLaunchSim, type PathfinderSim } from '@/app/components/pathfinder/usePathfinderLaunchSim';
import {
  PREPARE_STEPS,
  TAKEOFF_STEPS,
  RETURN_STEPS,
  type LaunchPhase,
  type LaunchStep,
  type Locale,
  type StepStatus,
} from '@/app/components/pathfinder/launchSequence';

/** Card lifecycle states the sandbox previews. `fault` reuses the health dim. */
type CardFlightState = 'docked' | 'launching' | 'airborne' | 'fault';

const noop = () => {};
const SONNER_TOAST_ID = 'pathfinder-launch';

const FAULT_OPTIONS: { id: string; label: string }[] = [
  ...PREPARE_STEPS.map((s) => ({ id: s.id, label: `Prepare · ${s.label.en}` })),
  ...TAKEOFF_STEPS.map((s) => ({ id: s.id, label: `Takeoff · ${s.label.en}` })),
];

/**
 * Sonner's exit animation keeps a dismissed toast in the DOM briefly. Firing a
 * fresh toast inside that window stacks it behind the one that's leaving, which
 * reads as a doubled toast — so a re-launch waits out this much before showing.
 */
const TOAST_EXIT_MS = 350;

/** Self-contained live instance for the real sonner surface. */
function SonnerLaunchToast({
  speedMs,
  failStepId,
  locale,
  onClose,
}: {
  speedMs: number;
  failStepId: string | null;
  locale: Locale;
  onClose: () => void;
}) {
  const sim = usePathfinderLaunchSim({ speedMs, failStepId });
  return <PathfinderLaunchToast sim={sim} locale={locale} onDismiss={onClose} />;
}

/**
 * The Pathfinder DeviceRow, wired with its own expand/pin state so it behaves
 * like the real card. Builds a `pathfinder` Device from the current locale +
 * flight state; `fault` flips it to malfunctioning so health + Logs light up.
 */
function PathfinderCardDemo({
  locale,
  flightState,
  onLaunch,
  onAbort,
  onReturnToBase,
}: {
  locale: Locale;
  flightState: CardFlightState;
  onLaunch: () => void;
  onAbort: () => void;
  onReturnToBase: () => void;
}) {
  const t = getStrings(locale);
  const [expanded, setExpanded] = useState(true);
  const [pinned, setPinned] = useState(false);

  const malfunction = flightState === 'fault';
  const device: Device = {
    id: 'PATHFINDER-01',
    name: locale === 'he' ? 'פתפיינדר-1' : 'Pathfinder-1',
    type: 'pathfinder',
    lat: 32.477,
    lon: 35.005,
    status: flightState === 'airborne' ? 'active' : 'available',
    operationalStatus: malfunction ? 'malfunctioning' : 'operational',
    connectionState: malfunction ? 'warning' : 'online',
    altitude: locale === 'he' ? '90 מ׳' : '90 m',
    batteryPct: 82,
    errorCount: malfunction ? 2 : 0,
    errors: malfunction
      ? [
          { severity: 'error', message: locale === 'he' ? 'תקלת מנוע' : 'Motor fault' },
          { severity: 'warning', message: locale === 'he' ? 'מתח סוללה נמוך' : 'Low battery voltage' },
        ]
      : undefined,
    Icon: DroneDeviceIcon,
  };

  return (
    <DeviceRow
      device={device}
      isExpanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
      onHover={noop}
      onFlyTo={noop}
      isPinnedToFeed={pinned}
      onPinToFeed={() => setPinned(true)}
      onUnpinFromFeed={() => setPinned(false)}
      pathfinderFlightState={
        flightState === 'airborne' ? 'airborne' : flightState === 'launching' ? 'launching' : 'docked'
      }
      onLaunch={onLaunch}
      onAbort={onAbort}
      onReturnToBase={onReturnToBase}
      onOpenLogs={(id) => console.info('[pathfinder-sandbox] open logs', id)}
      onArmNotifications={(id, armed) => console.info('[pathfinder-sandbox] notifications', id, armed)}
      strings={{ ...DEFAULT_DEVICE_PANEL_STRINGS, ...t.devices.strings }}
      connectionStateLabels={{ ...DEFAULT_CONNECTION_STATE_LABELS, ...t.devices.connectionLabels }}
    />
  );
}

export default function PathfinderSandbox() {
  const [speedMs, setSpeedMs] = useState(700);
  const [failStepId, setFailStepId] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>('he');
  const [flightState, setFlightState] = useState<CardFlightState>('docked');

  const sim = usePathfinderLaunchSim({ speedMs, failStepId });

  // Timestamp of the last close, so a re-fire can wait out the exit animation
  // (see `TOAST_EXIT_MS`) instead of stacking a new toast behind the old one.
  const lastClosedAtRef = useRef(0);

  // The single close path for the launch toast. Records when it happened so the
  // next `fireInSonner` can replace-not-overlap.
  const closeSonner = () => {
    lastClosedAtRef.current = Date.now();
    toast.dismiss(SONNER_TOAST_ID);
  };

  const fireInSonner = () => {
    const show = () =>
      toast.custom(
        () => (
          <SonnerLaunchToast
            speedMs={speedMs}
            failStepId={failStepId}
            locale={locale}
            onClose={closeSonner}
          />
        ),
        {
          id: SONNER_TOAST_ID,
          duration: Infinity,
          // The shared Toaster styles every toast `<li>` with its own bg, 8px
          // radius and shadow. Our card brings its own surface, so strip the
          // default container here — otherwise it peeks out behind ours and
          // reads as a doubled toast.
          unstyled: true,
          style: {
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            borderRadius: 0,
            padding: 0,
            width: 'auto',
          },
        },
      );
    // While a toast is live, the stable id makes this an in-place replace. Only
    // when one was just closed do we defer, so the new toast enters after the
    // old has fully left rather than racing its exit (the doubled-toast case).
    const sinceClose = Date.now() - lastClosedAtRef.current;
    if (sinceClose >= TOAST_EXIT_MS) show();
    else window.setTimeout(show, TOAST_EXIT_MS - sinceClose);
  };

  // Launch from the card moves it into the running sequence and plays the
  // takeoff toast; abort/RTB bring it home and close the toast — the two
  // surfaces stay in sync.
  const handleLaunch = () => {
    setFlightState('launching');
    fireInSonner();
  };
  const handleAbort = () => {
    setFlightState('docked');
    closeSonner();
  };
  const handleReturnToBase = () => {
    setFlightState('docked');
    closeSonner();
  };

  return (
    <div className="min-h-screen w-full bg-surface-1 text-slate-12 flex flex-col">
      {/* Debug header */}
      <header className="flex flex-wrap items-center gap-3 border-b border-border-subtle px-4 py-2.5 text-xs shrink-0">
        <a
          href="/demo"
          className="rounded border border-border-default bg-surface-2 px-2 py-1 text-xs-plus font-medium text-slate-11 transition-colors hover:border-border-strong hover:text-slate-12"
        >
          Open Demo →
        </a>
        <span className="font-mono text-xs-plus uppercase tracking-[0.18em] text-slate-9">
          Pathfinder · Takeoff toast
        </span>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={sim.paused ? sim.play : sim.pause}
            className="rounded border border-border-default bg-surface-2 px-2 py-1 text-xs-plus text-slate-11 hover:border-border-strong"
          >
            {sim.paused ? 'Play' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={sim.stepForward}
            className="rounded border border-border-default bg-surface-2 px-2 py-1 text-xs-plus text-slate-11 hover:border-border-strong"
          >
            Step ▸
          </button>
          <button
            type="button"
            onClick={sim.restart}
            className="rounded border border-border-default bg-surface-2 px-2 py-1 text-xs-plus text-slate-11 hover:border-border-strong"
          >
            Restart
          </button>

          <label className="flex items-center gap-2 rounded-md border border-border-default bg-surface-2 px-2 py-1">
            <span className="font-mono text-2xs uppercase tracking-[0.18em] text-slate-9">
              Speed
            </span>
            <input
              type="range"
              min={200}
              max={1500}
              step={50}
              value={speedMs}
              onChange={(e) => setSpeedMs(parseInt(e.target.value, 10))}
              aria-label="Step speed (ms)"
              className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-state-hover-strong accent-accent-info [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-12"
            />
            <span className="min-w-[5ch] text-end font-mono text-xs-plus tabular-nums text-slate-12">
              {speedMs}ms
            </span>
          </label>

          <select
            value={failStepId ?? ''}
            onChange={(e) => setFailStepId(e.target.value || null)}
            className="max-w-[200px] rounded border border-border-default bg-surface-2 px-2 py-1 text-xs-plus text-slate-11"
            aria-label="Inject fault on step"
          >
            <option value="">No fault</option>
            {FAULT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                Fail: {o.label}
              </option>
            ))}
          </select>

          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="rounded border border-border-default bg-surface-2 px-2 py-1 text-xs-plus text-slate-11"
            aria-label="Locale / direction"
          >
            <option value="he">עברית (RTL)</option>
            <option value="en">English (LTR)</option>
          </select>

          <button
            type="button"
            onClick={fireInSonner}
            className="rounded border border-accent-info/40 bg-accent-info/10 px-2 py-1 text-xs-plus font-medium text-slate-12 hover:bg-accent-info/20"
          >
            Fire in Sonner ↑
          </button>
        </div>
      </header>

      {/* Live canvas */}
      <main className="flex-1 overflow-auto">
        <section className="flex flex-col items-center justify-center gap-6 px-6 py-16">
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xs uppercase tracking-[0.2em] text-slate-9">
              Live canvas
            </span>
            <span className="rounded-full bg-surface-3 px-2 py-0.5 font-mono text-2xs text-slate-10">
              {sim.runState}
            </span>
          </div>

          {/* Subtle dot grid stage so the toast's shadow + glow read honestly. */}
          <div
            className="flex w-full max-w-3xl items-center justify-center rounded-2xl border border-border-subtle p-12"
            style={{
              backgroundColor: '#0c0c0e',
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          >
            <PathfinderLaunchToast sim={sim} locale={locale} onDismiss={sim.restart} />
          </div>

          <p className="max-w-[60ch] text-center text-xs leading-relaxed text-slate-9">
            Prepare runs automatically and gates on the{' '}
            <span className="text-slate-11">Takeoff</span> button. Takeoff runs to an
            open-ended loiter that waits for{' '}
            <span className="text-slate-11">Return to dock</span>. Use{' '}
            <span className="text-slate-11">Inject fault</span> to preview the halted /
            retry state, and toggle locale to check the RTL layout.
          </p>
        </section>

        {/* Device card */}
        <section className="flex flex-col items-center gap-6 border-t border-border-subtle px-6 py-14">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="font-mono text-2xs uppercase tracking-[0.2em] text-slate-9">
              Device card
            </span>
            <div className="flex items-center gap-1 rounded-md border border-border-default bg-surface-2 p-0.5">
              {(['docked', 'launching', 'airborne', 'fault'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFlightState(s)}
                  className={`rounded px-2.5 py-1 text-xs-plus capitalize transition-colors ${
                    flightState === s
                      ? 'bg-state-hover-strong text-slate-12'
                      : 'text-slate-10 hover:text-slate-12'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div
            dir={locale === 'he' ? 'rtl' : 'ltr'}
            className="w-full max-w-[360px] overflow-hidden rounded-lg border border-white/10"
            style={{ backgroundColor: 'rgb(9,9,11)' }}
          >
            <PathfinderCardDemo
              locale={locale}
              flightState={flightState}
              onLaunch={handleLaunch}
              onAbort={handleAbort}
              onReturnToBase={handleReturnToBase}
            />
          </div>

          <p className="max-w-[60ch] text-center text-xs leading-relaxed text-slate-9">
            The primary action is state-aware:{' '}
            <span className="text-slate-11">Launch</span> when docked (fires the takeoff
            toast above and moves the card into{' '}
            <span className="text-slate-11">Launching</span>),{' '}
            <span className="text-slate-11">Stop</span> while the sequence runs, and{' '}
            <span className="text-slate-11">Return to dock</span> when airborne. While{' '}
            <span className="text-slate-11">Launching</span>, a red Stop icon also appears
            in the collapsed header row. The{' '}
            <span className="text-slate-11">Fault</span> state disables Launch and lights
            the Logs channel red. Secondary: Watch video + Calibrate; overflow holds
            Notifications + Logs.
          </p>
        </section>

        {/* Frozen-state gallery */}
        <section className="border-t border-border-subtle px-6 py-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-1 text-sm font-semibold text-slate-12">State gallery</h2>
            <p className="mb-8 text-xs text-slate-9">
              Every key state frozen for side-by-side review.
            </p>
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {GALLERY.map((item) => (
                <FrozenCard key={item.title} item={item} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Toaster />
    </div>
  );
}

// ── Frozen gallery ───────────────────────────────────────────────────────────

interface GalleryItem {
  title: string;
  note: string;
  sim: PathfinderSim;
}

function buildStatuses(
  steps: LaunchStep[],
  activeIndex: number,
  opts?: { error?: boolean; allDone?: boolean },
): Record<string, StepStatus> {
  const m: Record<string, StepStatus> = {};
  steps.forEach((s, i) => {
    if (opts?.allDone) m[s.id] = 'done';
    else if (i < activeIndex) m[s.id] = 'done';
    else if (i === activeIndex) m[s.id] = opts?.error ? 'error' : 'active';
    else m[s.id] = 'pending';
  });
  return m;
}

function frozen(opts: {
  phase: LaunchPhase;
  steps: LaunchStep[];
  statuses: Record<string, StepStatus>;
  activeId: string | null;
  runState: PathfinderSim['runState'];
}): PathfinderSim {
  const total = opts.steps.length;
  const completed = opts.steps.filter((s) => opts.statuses[s.id] === 'done').length;
  return {
    phase: opts.phase,
    runState: opts.runState,
    paused: true,
    steps: opts.steps,
    statuses: opts.statuses,
    activeId: opts.activeId,
    completed,
    total,
    progress: total ? completed / total : 0,
    play: noop,
    pause: noop,
    restart: noop,
    takeoff: noop,
    returnToBase: noop,
    retry: noop,
    abort: noop,
    stepForward: noop,
  };
}

const GALLERY: GalleryItem[] = [
  {
    title: 'Prepare · gate check',
    note: 'Auto-running through a verification gate.',
    sim: frozen({
      phase: 'prepare',
      steps: PREPARE_STEPS,
      statuses: buildStatuses(PREPARE_STEPS, 3),
      activeId: PREPARE_STEPS[3].id,
      runState: 'running',
    }),
  },
  {
    title: 'Halted · fault',
    note: 'A gate failed; operator can retry.',
    sim: frozen({
      phase: 'prepare',
      steps: PREPARE_STEPS,
      statuses: buildStatuses(PREPARE_STEPS, 7, { error: true }),
      activeId: PREPARE_STEPS[7].id,
      runState: 'error',
    }),
  },
  {
    title: 'Ready · takeoff CTA',
    note: 'Prepare complete, waiting for operator.',
    sim: frozen({
      phase: 'prepare',
      steps: PREPARE_STEPS,
      statuses: buildStatuses(PREPARE_STEPS, PREPARE_STEPS.length, { allDone: true }),
      activeId: null,
      runState: 'awaiting-takeoff',
    }),
  },
  {
    title: 'Takeoff · executing',
    note: 'Deploy + departure sequence running.',
    sim: frozen({
      phase: 'takeoff',
      steps: TAKEOFF_STEPS,
      statuses: buildStatuses(TAKEOFF_STEPS, 3),
      activeId: TAKEOFF_STEPS[3].id,
      runState: 'running',
    }),
  },
  {
    title: 'On station · loiter',
    note: 'Open-ended loiter; waiting for RTB.',
    sim: frozen({
      phase: 'takeoff',
      steps: TAKEOFF_STEPS,
      statuses: buildStatuses(TAKEOFF_STEPS, TAKEOFF_STEPS.length - 1),
      activeId: TAKEOFF_STEPS[TAKEOFF_STEPS.length - 1].id,
      runState: 'loiter',
    }),
  },
  {
    title: 'Aborted',
    note: 'Operator called off the launch.',
    sim: frozen({
      phase: 'prepare',
      steps: PREPARE_STEPS,
      statuses: buildStatuses(PREPARE_STEPS, 5),
      activeId: null,
      runState: 'aborted',
    }),
  },
  {
    title: 'Docked',
    note: 'Returned to station and secured.',
    sim: frozen({
      phase: 'return',
      steps: RETURN_STEPS,
      statuses: buildStatuses(RETURN_STEPS, RETURN_STEPS.length, { allDone: true }),
      activeId: null,
      runState: 'done',
    }),
  },
];

function FrozenCard({ item, locale }: { item: GalleryItem; locale: Locale }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-xs font-medium text-slate-11">{item.title}</div>
        <div className="text-xs-plus text-slate-9">{item.note}</div>
      </div>
      <div className="flex justify-center rounded-xl border border-border-subtle bg-[#0c0c0e] p-6">
        <PathfinderLaunchToast sim={item.sim} locale={locale} />
      </div>
    </div>
  );
}
