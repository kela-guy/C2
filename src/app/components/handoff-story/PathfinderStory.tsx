/**
 * Pathfinder launch toast — interaction handoff story.
 *
 * A scrollytelling walkthrough (route `/handoff`) that teaches every interaction
 * in the multi-step takeoff toast the way the devouringdetails Next.js Dev Tools
 * page does: narrative on the left, a sticky live stage on the right, hand-drawn
 * annotations, focused code, and an exposed debug console — ending in a
 * props/sim contract and a frozen-state gallery for the dev implementing it.
 *
 * It reuses the production-bound pieces verbatim (`PathfinderLaunchToast`,
 * `usePathfinderLaunchSim`) so the handoff shows the real component, not a mock.
 */

import { useState } from 'react';
import {
  StoryLayout,
  StageFrame,
  Annotation,
  GhostFrame,
  CodeBlock,
  DebugChips,
  Fade,
  InlineDemo,
  P,
  Lead,
  Mono,
  type StoryChapter,
} from '@/app/components/story-kit';
import { PathfinderLaunchToast } from '@/app/components/pathfinder/PathfinderLaunchToast';
import {
  usePathfinderLaunchSim,
  type PathfinderSim,
} from '@/app/components/pathfinder/usePathfinderLaunchSim';
import {
  frozenSim,
  buildStatuses,
  PATHFINDER_GALLERY,
} from '@/app/components/pathfinder/frozenSim';
import { PREPARE_STEPS, TAKEOFF_STEPS, type Locale } from '@/app/components/pathfinder/launchSequence';
// The dependency-free reference implementation, shipped both as source (the
// Component chapter's code view) and as a live import (the chapter's preview)
// — never out of sync with the repo because it IS the repo file.
import STARTER_SOURCE from '@/app/components/pathfinder/ProcessStatusToast.starter.tsx?raw';
import {
  ProcessStatusToast,
  ProcessStatusToastDemo,
  useDemoSim,
} from '@/app/components/pathfinder/ProcessStatusToast.starter';
import { ComponentPreview } from '@/app/styleguide/registry/docPrimitives';
import { DroneDeviceIcon } from '@/primitives/ProductIcons';
import { cn } from '@/app/components/ui/utils';

/** A prepare-phase gate we deliberately fail to demo the halted/retry state. */
const FAULT_ID = 'confirm-pitot';

// ── Stage helpers ────────────────────────────────────────────────────────────

/**
 * Centers the real toast on a dot-grid stage. The inner `relative` box is the
 * anchor for `Annotation` / `GhostFrame` overlays (the toast is a fixed 340px,
 * so absolute callouts line up against it predictably).
 */
function ToastStage({
  sim,
  locale = 'en',
  children,
  className,
}: {
  sim: PathfinderSim;
  locale?: Locale;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <StageFrame className={cn('w-full max-w-[560px]', className)}>
      <div className="relative" dir={locale === 'he' ? 'rtl' : 'ltr'}>
        <PathfinderLaunchToast sim={sim} locale={locale} onDismiss={sim.restart} />
        {children}
      </div>
    </StageFrame>
  );
}

/** The frozen state gallery — every key state, scrollable, softened by Fades. */
function GalleryStage() {
  return (
    <div className="relative h-[78vh] w-full max-w-[600px]">
      <div className="h-full overflow-y-auto pe-2">
        <div className="flex flex-col gap-4 py-8">
          {PATHFINDER_GALLERY.map((item) => (
            <div key={item.title} className="flex flex-col gap-2">
              <div>
                <div className="text-xs font-medium text-[color:var(--story-ink)]">{item.title}</div>
                <div className="text-xs-plus text-[color:var(--story-muted)]">{item.note}</div>
              </div>
              <StageFrame className="w-full" dots>
                <PathfinderLaunchToast sim={item.sim} locale="en" />
              </StageFrame>
            </div>
          ))}
        </div>
      </div>
      <Fade side="top" height={56} stop="20%" blend="panel" className="absolute inset-x-0 top-0" />
      <Fade side="bottom" height={56} stop="20%" blend="panel" className="absolute inset-x-0 bottom-0" />
    </div>
  );
}

/** A labelled definition row for the props/sim contract. */
function SpecRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <code className="shrink-0 font-[family:var(--font-code)] text-sm-minus text-[color:var(--story-ink)] sm:w-40">
        {name}
      </code>
      <span className="text-sm leading-[24px] text-[color:var(--story-muted)]">{children}</span>
    </div>
  );
}

// A running prepare-phase snapshot, used wherever we want the loader + Stop CTA.
const RUNNING_SNAPSHOT = frozenSim({
  phase: 'prepare',
  steps: PREPARE_STEPS,
  statuses: buildStatuses(PREPARE_STEPS, 4),
  activeId: PREPARE_STEPS[4].id,
  runState: 'running',
});

const READY_SNAPSHOT = frozenSim({
  phase: 'prepare',
  steps: PREPARE_STEPS,
  statuses: buildStatuses(PREPARE_STEPS, PREPARE_STEPS.length, { allDone: true }),
  activeId: null,
  runState: 'awaiting-takeoff',
});

// ── Code excerpts (the relevant lines, highlighted) ──────────────────────────

const CODE_ANATOMY = `<div className="flex items-center gap-3 ...">
  <StateIcon sim={sim} />          // 1 · icon / loader
  <TaskLabel>{label}</TaskLabel>   // 2 · current step
  <Counter>{counter}</Counter>     // quiet n/total marker
  <ContextCTA sim={sim} />         // 3 · the one action that matters now
</div>`;

const CODE_GATE = `// End of the prepare list — don't auto-continue.
if (nextIndex >= list.length) {
  if (prev.phase === 'prepare') {
    return { ...prev, runState: 'awaiting-takeoff' };
  }
  return { ...prev, runState: 'done' };
}`;

const CODE_FAULT = `// Injected fault: halt on this step until retried.
if (failStepId === active.id && !retried.has(active.id)) {
  return {
    ...prev,
    statuses: { ...prev.statuses, [active.id]: 'error' },
    runState: 'error',
  };
}`;

const CODE_LABEL = `<AnimatePresence initial={false}>
  <motion.span
    key={label}                 // replay the swap on every label change
    initial={{ opacity: 0, y: 7 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -7 }}
    transition={reduce ? { duration: 0 } : spring.moderate}
  >
    {label}
  </motion.span>
</AnimatePresence>`;

const CODE_SONNER = `// A re-fire during the old toast's exit window would stack behind it.
const sinceClose = Date.now() - lastClosedAt;
if (sinceClose >= TOAST_EXIT_MS) show();
else setTimeout(show, TOAST_EXIT_MS - sinceClose);`;

/** Every step that can be chosen as an injected fault in the debug console. */
const FAULT_OPTIONS: { id: string; label: string }[] = [
  ...PREPARE_STEPS.map((s) => ({ id: s.id, label: `Prepare · ${s.label.en}` })),
  ...TAKEOFF_STEPS.map((s) => ({ id: s.id, label: `Takeoff · ${s.label.en}` })),
];

// ── Story ────────────────────────────────────────────────────────────────────

export default function PathfinderStory() {
  // One shared dwell speed for the live sims; the debug console can change it.
  const [speedMs, setSpeedMs] = useState(700);
  const [localeRtl, setLocaleRtl] = useState<Locale>('he');
  const [debugFault, setDebugFault] = useState<string | null>(null);

  // Live sims — each interactive chapter drives its own instance so demos stay
  // independent as you scroll. All are mounted at once by the sticky stage.
  const simPrimary = usePathfinderLaunchSim({ speedMs, failStepId: null });
  const simGate = usePathfinderLaunchSim({ speedMs, failStepId: null });
  const simFault = usePathfinderLaunchSim({ speedMs, failStepId: FAULT_ID });
  const simDebug = usePathfinderLaunchSim({ speedMs, failStepId: debugFault });
  // Drives the Component chapter's stage — the generic starter toast, running
  // from the same file the chapter hands off (via its demo driver).
  const starter = useDemoSim({ speedMs: 900 });

  const chapters: StoryChapter[] = [
    // 1 · Intro -------------------------------------------------------------
    {
      id: 'intro',
      label: 'The launch toast',
      prose: (
        <>
          <Lead>
            When an operator launches a Pathfinder, a single-row toast narrates the
            whole takeoff — prepare, takeoff, loiter, return — without ever leaving
            the map.
          </Lead>
          <P>
            It is deliberately near-monochrome: the
            <InlineDemo>
              <DroneDeviceIcon size={15} fill="#d4d4d8" />
            </InlineDemo>
            Pathfinder identity, the current step, and one context action. Colour is
            reserved for the two signals that matter — <Mono>Stop</Mono> and a fault.
          </P>
          <P>
            This page walks every interaction in it, the way you would explain it at a
            desk. Scroll, and the stage on the right plays along.
          </P>
        </>
      ),
      stage: <ToastStage sim={READY_SNAPSHOT} />,
      takeaway: (
        <>One surface tells the entire launch story — status, progress, and the next move — in a single calm row.</>
      ),
    },

    // 2 · Anatomy -----------------------------------------------------------
    {
      id: 'anatomy',
      label: 'Anatomy',
      prose: (
        <>
          <P>
            The row is exactly three elements. An icon that doubles as a loader, the
            current task label, and the one context action for the current state —
            nothing else competes for attention.
          </P>
          <P>
            A quiet <Mono>n/total</Mono> counter rides between the label and the CTA
            so progress is legible without a progress bar.
          </P>
          <CodeBlock code={CODE_ANATOMY} highlightLines={[2, 3, 4, 5]} />
        </>
      ),
      stage: (
        <ToastStage sim={RUNNING_SNAPSHOT}>
          <Annotation arrow="down" labelAlign="end" style={{ bottom: 'calc(100% + 2px)', left: 13 }}>
            icon / loader
          </Annotation>
          <Annotation arrow="down" labelAlign="start" style={{ bottom: 'calc(100% + 2px)', left: 82 }}>
            task label
          </Annotation>
          <Annotation arrow="up" style={{ top: 'calc(100% + 2px)', left: 283 }}>
            context action
          </Annotation>
        </ToastStage>
      ),
      takeaway: <>Three slots, one job each. The CTA column only ever holds the action that is valid right now.</>,
    },

    // 3 · State-aware primary ----------------------------------------------
    {
      id: 'context-cta',
      label: 'The context action',
      prose: (
        <>
          <P>
            The right-most action is state-aware. While the sequence auto-runs it is{' '}
            <Mono>Stop</Mono>; once prepare completes it becomes{' '}
            <Mono>Takeoff</Mono>; on station it turns into <Mono>Return to dock</Mono>.
          </P>
          <P>
            Drive it yourself — the CTA morphs to match. Each command is a no-op in a
            state where it does not apply, so the surface tolerates mashing.
          </P>
          <DebugChips
            chips={[
              { shortcut: 'r', label: 'Restart', onTrigger: simPrimary.restart },
              { shortcut: 't', label: 'Takeoff', onTrigger: simPrimary.takeoff },
              { shortcut: 'b', label: 'Return', onTrigger: simPrimary.returnToBase },
              { shortcut: 's', label: 'Stop', onTrigger: simPrimary.abort },
            ]}
            className="justify-start"
          />
        </>
      ),
      stage: (
        <ToastStage sim={simPrimary}>
          <Annotation arrow="up" style={{ top: 'calc(100% + 2px)', left: 289 }}>
            morphs with state
          </Annotation>
        </ToastStage>
      ),
      takeaway: <>A single, predictable action slot beats a row of buttons most of which are disabled.</>,
    },

    // 4 · Auto-run + gate ---------------------------------------------------
    {
      id: 'gate',
      label: 'Backend pace, client gate',
      prose: (
        <>
          <P>
            The prepare steps advance on their own — but the row is not running a
            clock. It is presentational: in production the backend owns the rhythm
            and reports each step as it resolves, and the toast simply renders the
            latest snapshot. On this page a local simulation stands in for that
            backend so the flow can play.
          </P>
          <P>
            The one thing the client decides is the gate. The sequence will not
            commit to flight on its own: at the end of prepare it parks in{' '}
            <Mono>awaiting-takeoff</Mono> and waits for the operator&apos;s{' '}
            <Mono>Takeoff</Mono> before anything irreversible happens.
          </P>
          <P>Drive the stand-in to feel the pacing — pause it, or step through it beat by beat.</P>
          <CodeBlock code={CODE_GATE} highlightLines={[3, 4]} />
          <DebugChips
            chips={[
              { shortcut: 'p', label: simGate.paused ? 'Play' : 'Pause', onTrigger: () => (simGate.paused ? simGate.play() : simGate.pause()) },
              { shortcut: '.', label: 'Step', onTrigger: simGate.stepForward },
              { shortcut: 'r', label: 'Restart', onTrigger: simGate.restart },
            ]}
            className="justify-start"
          />
        </>
      ),
      stage: (
        <ToastStage sim={simGate}>
          <Annotation arrow="down" style={{ bottom: 'calc(100% + 2px)', left: 82 }}>
            backend-paced
          </Annotation>
        </ToastStage>
      ),
      takeaway: <>Let the backend stream the rote steps; gate the one irreversible step on a deliberate human action.</>,
    },

    // 5 · Fault + retry -----------------------------------------------------
    {
      id: 'fault',
      label: 'Fault & retry',
      prose: (
        <>
          <P>
            When a gate fails, the sequence halts on that step and the whole row turns
            to the fault colour — label, counter, and a <Mono>Retry</Mono> next to{' '}
            <Mono>Stop</Mono>. Nothing advances until the operator decides.
          </P>
          <P>
            This demo is rigged to fail at the pitot calibration gate. Restart it,
            watch it stop, then retry — the injected fault clears on the second pass.
          </P>
          <CodeBlock code={CODE_FAULT} highlightLines={[2, 3, 4, 5, 6, 7]} />
          <DebugChips
            chips={[
              { shortcut: 'r', label: 'Restart', onTrigger: simFault.restart },
              { shortcut: 'y', label: 'Retry', onTrigger: simFault.retry },
              { shortcut: 's', label: 'Stop', onTrigger: simFault.abort },
            ]}
            className="justify-start"
          />
        </>
      ),
      stage: (
        <ToastStage sim={simFault}>
          <Annotation arrow="up" style={{ top: 'calc(100% + 2px)', left: 59 }}>
            fault colour
          </Annotation>
        </ToastStage>
      ),
      takeaway: <>Failure is a first-class state: same row, recoloured, with the recovery action right where the next action always lives.</>,
    },

    // 6 · Label motion ------------------------------------------------------
    {
      id: 'label-motion',
      label: 'Label motion',
      prose: (
        <>
          <P>
            The task label changes a lot. Each swap is a snappy slide-and-fade, keyed
            on the label text so React replays the entrance every time it changes —
            no manual animation bookkeeping.
          </P>
          <P>
            The <Mono>n/total</Mono> counter climbs continuously across the prepare to
            takeoff boundary (…<Mono>16/23</Mono> then <Mono>17/23</Mono>) instead of
            resetting, so the number reads as one journey. Motion only ever marks a
            real change, and it all drops to a plain fade under reduced-motion.
          </P>
          <CodeBlock code={CODE_LABEL} highlightLines={[3]} />
        </>
      ),
      stage: (
        <ToastStage sim={simGate}>
          <Annotation arrow="down" style={{ bottom: 'calc(100% + 2px)', left: 82 }}>
            slides on change
          </Annotation>
        </ToastStage>
      ),
      takeaway: <>Tie the animation to the data with a key, and let motion signal change — never decorate.</>,
    },

    // 7 · RTL / locale ------------------------------------------------------
    {
      id: 'rtl',
      label: 'RTL & locale',
      prose: (
        <>
          <P>
            Operators run the console in Hebrew, so the row mirrors wholesale: icon,
            label, and CTA flip across the centre axis while the counter stays{' '}
            <Mono>ltr</Mono> (numbers never mirror). It is built on logical properties
            — <Mono>gap</Mono>, <Mono>text-start</Mono>, <Mono>ms-*</Mono> — so one
            <Mono>dir</Mono> flip does the work.
          </P>
          <P>Toggle the direction and watch the whole row reflect across the axis.</P>
          <DebugChips
            chips={[
              { shortcut: 'h', label: 'עברית (RTL)', onTrigger: () => setLocaleRtl('he') },
              { shortcut: 'e', label: 'English (LTR)', onTrigger: () => setLocaleRtl('en') },
            ]}
            className="justify-start"
          />
        </>
      ),
      stage: (
        <ToastStage sim={RUNNING_SNAPSHOT} locale={localeRtl}>
          <GhostFrame
            label="mirror axis"
            style={{ left: '50%', top: -22, height: 110, width: 0 }}
          />
        </ToastStage>
      ),
      takeaway: <>Design in logical properties and direction is a single flip, not a second layout.</>,
    },

    // 8 · Sonner placement --------------------------------------------------
    {
      id: 'placement',
      label: 'Real placement',
      prose: (
        <>
          <P>
            In production the toast lives in Sonner, pinned top-center. It carries its
            own surface, so the shared Toaster styles are stripped for this one toast —
            otherwise the default container peeks out and reads as a doubled toast.
          </P>
          <P>
            A re-launch uses a stable toast id to replace in place. The only special
            case is re-firing during the previous toast&apos;s exit animation, which
            would stack behind it — so a fresh fire waits out that exit window first.
          </P>
          <CodeBlock code={CODE_SONNER} highlightLines={[3, 4]} />
        </>
      ),
      stage: (
        <StageFrame className="w-full max-w-[560px]" dots={false}>
          {/* A faux app window so the top-center placement reads honestly. */}
          <div
            className="relative h-[300px] w-full overflow-hidden rounded-xl border"
            style={{ borderColor: 'var(--story-border)', backgroundColor: 'var(--story-surface)' }}
          >
            <div
              className="flex h-7 items-center gap-1.5 border-b px-3"
              style={{ borderColor: 'var(--story-border)' }}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--story-border)' }} />
              <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--story-border)' }} />
              <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--story-border)' }} />
            </div>
            <div className="absolute left-1/2 top-10 -translate-x-1/2">
              <PathfinderLaunchToast sim={RUNNING_SNAPSHOT} locale="en" />
            </div>
            <Annotation arrow="up" style={{ left: '50%', top: 92, transform: 'translateX(-50%)' }}>
              top-center · replace-in-place
            </Annotation>
          </div>
        </StageFrame>
      ),
      takeaway: <>Match the real mounting context in the handoff — placement and stacking bugs only show up where the component actually lives.</>,
    },

    // 9 · Debug console -----------------------------------------------------
    {
      id: 'debug',
      label: 'Debugging states',
      prose: (
        <>
          <P>
            There are a lot of states in here, and reaching each one by hand is slow.
            So the controls below are the same debug tool used to build it — every
            state on a keyboard shortcut.
          </P>
          <P>
            Spam them. Mash <Mono>Stop</Mono> mid-step, retry a state with no fault,
            change the simulated backend pace while it runs. A good interaction
            tolerates abuse without breaking — the only way to find the broken states
            is to click around a lot.
          </P>
          <DebugChips
            chips={[
              { shortcut: 'p', label: simDebug.paused ? 'Play' : 'Pause', onTrigger: () => (simDebug.paused ? simDebug.play() : simDebug.pause()) },
              { shortcut: '.', label: 'Step', onTrigger: simDebug.stepForward },
              { shortcut: 'r', label: 'Restart', onTrigger: simDebug.restart },
              { shortcut: 't', label: 'Takeoff', onTrigger: simDebug.takeoff },
              { shortcut: 'b', label: 'Return', onTrigger: simDebug.returnToBase },
              { shortcut: 'y', label: 'Retry', onTrigger: simDebug.retry },
              { shortcut: 's', label: 'Stop', onTrigger: simDebug.abort },
            ]}
            className="justify-start"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-[color:var(--story-muted)]">
              <span className="font-[family:var(--font-mono)] uppercase tracking-[0.12em]">Sim pace</span>
              <input
                type="range"
                min={200}
                max={1500}
                step={50}
                value={speedMs}
                onChange={(e) => setSpeedMs(parseInt(e.target.value, 10))}
                aria-label="Simulated backend pace (ms per step)"
                className="h-1 w-28 cursor-pointer appearance-none rounded-full"
                style={{ backgroundColor: 'var(--story-border)', accentColor: 'var(--story-accent)' }}
              />
              <span className="min-w-[5ch] font-[family:var(--font-code)] tabular-nums text-[color:var(--story-ink)]">
                {speedMs}ms
              </span>
            </label>
            <select
              value={debugFault ?? ''}
              onChange={(e) => {
                setDebugFault(e.target.value || null);
                simDebug.restart();
              }}
              aria-label="Inject fault on step"
              className="max-w-[200px] rounded-md border px-2 py-1 text-xs"
              style={{
                borderColor: 'var(--story-border)',
                backgroundColor: 'var(--story-surface)',
                color: 'var(--story-ink)',
              }}
            >
              <option value="">No fault</option>
              {FAULT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  Fail: {o.label}
                </option>
              ))}
            </select>
          </div>
        </>
      ),
      stage: (
        <ToastStage sim={simDebug}>
          <Annotation arrow="down" style={{ bottom: 'calc(100% + 2px)', left: 82 }}>
            drive every state
          </Annotation>
        </ToastStage>
      ),
      takeaway: <>Ship the debug tool with the component. Shortcut-driven states are how you sand every edge before a dev ever sees it.</>,
    },

    // 10 · Spec / contract --------------------------------------------------
    {
      id: 'contract',
      label: 'The contract',
      prose: (
        <>
          <P>
            Everything above reduces to a small contract. The toast is presentational:
            give it a <Mono>sim</Mono> and a <Mono>locale</Mono>, and it renders the
            right row for the current state. It never owns the pace, the timing, or
            the sequence — only how the current state looks.
          </P>

          <div
            className="rounded-xl border p-4"
            style={{ borderColor: 'var(--story-border)', backgroundColor: 'var(--story-surface)' }}
          >
            <div className="font-[family:var(--font-mono)] text-xs-plus uppercase tracking-[0.14em] text-[color:var(--story-muted)]">
              Props
            </div>
            <div className="mt-1 divide-y" style={{ borderColor: 'var(--story-border)' }}>
              <SpecRow name="sim">
                A <Mono>PathfinderSim</Mono> — the current state plus the command
                callbacks. Here it comes from <Mono>usePathfinderLaunchSim</Mono>, a
                local timer that fakes the backend; in production you feed the row
                your backend-driven snapshot instead.
              </SpecRow>
              <SpecRow name="locale">
                <Mono>&apos;he&apos;</Mono> or <Mono>&apos;en&apos;</Mono>; drives copy and direction.
              </SpecRow>
              <SpecRow name="onDismiss?">
                Called from the terminal states (<Mono>done</Mono> / <Mono>aborted</Mono>) close affordance.
              </SpecRow>
            </div>

            <div className="mt-4 font-[family:var(--font-mono)] text-xs-plus uppercase tracking-[0.14em] text-[color:var(--story-muted)]">
              Run states
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['running', 'awaiting-takeoff', 'loiter', 'error', 'aborted', 'done'].map((s) => (
                <code
                  key={s}
                  className="rounded-md border px-2 py-0.5 font-[family:var(--font-code)] text-xs text-[color:var(--story-ink)]"
                  style={{ borderColor: 'var(--story-border)' }}
                >
                  {s}
                </code>
              ))}
            </div>
          </div>

          <P>
            Do drive it from one state snapshot and let state pick the CTA. Don&apos;t
            add buttons outside the context slot, wrap it in another card (it brings
            its own surface), animate it on first mount, or drive the pace from the
            client — that belongs to the backend.
          </P>
          <P className="text-base leading-[28px] text-[color:var(--story-muted)]">
            The full state set is on the right — the same gallery used to review the
            design, now the reference a dev builds against. The final chapter hands
            you the code itself.
          </P>
        </>
      ),
      stage: <GalleryStage />,
      takeaway: <>A handoff ends in a contract: the props, the states, and a side-by-side of every one of them.</>,
    },

    // 11 · Component ---------------------------------------------------------
    {
      id: 'component',
      label: 'Component',
      prose: (
        <>
          <P>
            And here is the code itself. One self-contained React file, zero
            dependencies: no animation library, no icon package, no CSS framework.
            Copy it from the card below — paste it into any project and it runs.
          </P>
          <P>
            It ships as a generic deployment pipeline (build → gate on{' '}
            <Mono>Deploy</Mono> → live → take offline) so nothing app-specific
            leaks into your starting point. The contract is the point: the toast
            renders a <Mono>ProcessState</Mono> snapshot and calls{' '}
            <Mono>ProcessCommands</Mono> — your backend owns the pace, exactly as
            chapter 4 described. A wiring sketch in the file shows how to feed
            both from your real event stream.
          </P>
          <P>
            The comments are the instructions: replace the sequence model with
            your domain, keep the contract and the presentational toast, and
            delete the demo driver at the bottom — it is a fake backend that
            exists only so this file plays on your desk.
          </P>
          <ComponentPreview
            render={() => <ProcessStatusToastDemo />}
            code={STARTER_SOURCE}
            stripComments={false}
          />
        </>
      ),
      stage: (
        <StageFrame className="w-full max-w-[560px]">
          <ProcessStatusToast
            state={starter.state}
            commands={starter.commands}
            onDismiss={starter.restart}
          />
        </StageFrame>
      ),
      takeaway: (
        <>The handoff ends in runnable code — both previews on this spread are rendered from the very file you copy.</>
      ),
    },
  ];

  return (
    <StoryLayout
      kicker="Handoff"
      title="Pathfinder · Launch toast"
      homeHref="/pathfinder-sandbox"
      appHref="/"
      chapters={chapters}
    />
  );
}
