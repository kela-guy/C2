/**
 * One-click scenario runner for reproducible perf captures.
 *
 * Each scenario:
 *   1. Wipes the in-memory sink so the trace starts clean — without
 *      this, A/B comparisons get polluted by warm-up FPS samples,
 *      stale LoAF entries, and whatever else accumulated since
 *      `setupPerf()` ran.
 *   2. Brackets the run with `mark('App', 'scenario.start.<id>')` /
 *      `'scenario.end.<id>'` so the trace has an unambiguous time
 *      window when loaded into DevTools / Perfetto.
 *   3. Drives the canned interaction.
 *   4. Downloads a Chrome JSON trace whose filename embeds the
 *      scenario id, so two captures of the same scenario across two
 *      code revisions don't collide on disk and can be diffed by
 *      filename in tooling.
 *
 * The runner is intentionally allergic to background scheduling
 * surprises: it uses `requestAnimationFrame` for per-frame work,
 * `setTimeout` for sleeps, and an `AbortSignal` so an in-flight
 * scenario can be torn down cleanly if the HUD unmounts mid-run
 * (HMR, `?perf=off`, etc.) — leaving a `flyTo` callback alive
 * past unmount would call into a destroyed Cesium viewer.
 *
 * Manual scenarios bracket a window during which the operator does
 * the interaction by hand. The overlay is portalled to `document.body`
 * because the HUD root applies `backdrop-filter`, which establishes a
 * containing block for fixed descendants — an in-tree fixed overlay
 * would clip to the HUD instead of the viewport.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import * as Cesium from 'cesium';
import { mark } from '@/lib/perf/measure';
import { clearSink } from '@/lib/perf/sink';
import { downloadTrace } from '@/lib/perf/trace';
import { getRegisteredCesiumViewer } from './PerfHud';

interface RunContext {
  signal: AbortSignal;
  durationMs: number;
}

type ScenarioRunner = (ctx: RunContext) => Promise<void>;

interface ScenarioDef {
  id: string;
  label: string;
  durationMs: number;
  kind: 'auto' | 'manual';
  needsViewer?: boolean;
  hint?: string;
  run: ScenarioRunner;
}

const SCENARIOS: ScenarioDef[] = [
  { id: 'idle-30s', label: 'Idle baseline', durationMs: 30_000, kind: 'auto', run: idleRunner },
  { id: 'camera-pan-20s', label: 'Camera pan', durationMs: 20_000, kind: 'auto', needsViewer: true, run: cameraPanRunner },
  { id: 'camera-zoom-cycle-15s', label: 'Camera zoom cycle', durationMs: 15_000, kind: 'auto', needsViewer: true, run: cameraZoomRunner },
  { id: 'camera-rotate-15s', label: 'Camera rotate', durationMs: 15_000, kind: 'auto', needsViewer: true, run: cameraRotateRunner },
  { id: 'manual-fov-hover', label: 'Hover FOVs', durationMs: 15_000, kind: 'manual', hint: 'Hover and unhover FOV regions on the map', run: idleRunner },
  { id: 'manual-target-burst', label: 'Target burst', durationMs: 30_000, kind: 'manual', hint: 'Trigger CUAS target spawns now', run: idleRunner },
  { id: 'manual-panel-resize', label: 'Panel resize', durationMs: 15_000, kind: 'manual', hint: 'Drag the camera viewer panel resizer back and forth', run: idleRunner },
];

interface RunningState {
  id: string;
  remainingMs: number;
}

export function PerfScenarios(): React.JSX.Element {
  const [running, setRunning] = useState<RunningState | null>(null);
  // Keep the controller in a ref so repeated re-renders during the
  // countdown don't re-create / re-abort it.
  const controllerRef = useRef<AbortController | null>(null);
  const viewerPresent = useViewerPresence();

  useEffect(() => {
    return () => {
      // HMR / unmount path: kill any in-flight scenario so its
      // resolved Cesium callbacks can't reach into a torn-down
      // viewer or call `downloadTrace` on a closed window.
      controllerRef.current?.abort();
    };
  }, []);

  const start = useCallback(async (def: ScenarioDef) => {
    if (controllerRef.current) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setRunning({ id: def.id, remainingMs: def.durationMs });
    const startedAt = performance.now();
    const tickId = window.setInterval(() => {
      const remaining = Math.max(0, def.durationMs - (performance.now() - startedAt));
      setRunning((prev) => (prev && prev.id === def.id ? { id: def.id, remainingMs: remaining } : prev));
    }, 100);
    clearSink();
    mark('App', `scenario.start.${def.id}`, { properties: { kind: def.kind, durationMs: def.durationMs } });
    try {
      await def.run({ signal: controller.signal, durationMs: def.durationMs });
    } catch {
      // Aborts and Cesium viewer hiccups bubble here. We still want
      // to drop the end mark + download whatever we captured.
    } finally {
      window.clearInterval(tickId);
      mark('App', `scenario.end.${def.id}`);
      if (!controller.signal.aborted) downloadTrace(def.id);
      controllerRef.current = null;
      setRunning(null);
    }
  }, []);

  const runningDef = running ? SCENARIOS.find((s) => s.id === running.id) : undefined;

  return (
    <div style={listStyle}>
      {SCENARIOS.map((def) => {
        const isRunning = running?.id === def.id;
        const disabled = running !== null || (def.needsViewer === true && !viewerPresent);
        return (
          <button
            key={def.id}
            type="button"
            disabled={disabled}
            onClick={() => void start(def)}
            style={{
              ...rowBtnStyle,
              opacity: disabled && !isRunning ? 0.45 : 1,
              borderColor: isRunning ? '#1f6feb' : 'rgba(255,255,255,0.12)',
            }}
            title={def.needsViewer && !viewerPresent ? 'Cesium viewer not attached yet' : undefined}
          >
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{def.label}</span>
              <span style={{ opacity: 0.6, fontSize: 9 }}>
                {(def.durationMs / 1000).toFixed(0)}s{def.kind === 'manual' ? ' · manual' : ''}
              </span>
            </span>
            {isRunning && running ? (
              <span style={countdownStyle}>{(running.remainingMs / 1000).toFixed(1)}s</span>
            ) : null}
          </button>
        );
      })}
      {running && runningDef?.kind === 'manual' && runningDef.hint
        ? createPortal(<ManualOverlay hint={runningDef.hint} remainingMs={running.remainingMs} />, document.body)
        : null}
    </div>
  );
}

function ManualOverlay({ hint, remainingMs }: { hint: string; remainingMs: number }): React.JSX.Element {
  return (
    <div style={overlayBackdropStyle} data-perf-scenario-overlay="">
      <div style={overlayCardStyle}>
        <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: 'uppercase' }}>Manual scenario</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8, lineHeight: 1.3 }}>{hint}</div>
        <div style={{ fontSize: 56, fontWeight: 700, marginTop: 16, fontVariantNumeric: 'tabular-nums' }}>
          {(remainingMs / 1000).toFixed(1)}s
        </div>
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 12 }}>
          Trace download starts automatically when the timer hits zero.
        </div>
      </div>
    </div>
  );
}

function useViewerPresence(): boolean {
  // Lightweight poll — we don't want to add a second subscriber list
  // to PerfHud for one boolean. Viewer attach is a one-shot event
  // early in app boot, so 500 ms latency is invisible.
  const [present, setPresent] = useState<boolean>(() => getRegisteredCesiumViewer() !== null);
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = getRegisteredCesiumViewer() !== null;
      setPresent((prev) => (prev === next ? prev : next));
    }, 500);
    return () => window.clearInterval(id);
  }, []);
  return present;
}

// ── Scenario implementations ────────────────────────────────────────

async function idleRunner(ctx: RunContext): Promise<void> {
  await sleep(ctx.durationMs, ctx.signal);
}

async function cameraPanRunner(ctx: RunContext): Promise<void> {
  const viewer = getRegisteredCesiumViewer();
  if (!viewer) {
    await sleep(ctx.durationMs, ctx.signal);
    return;
  }
  const cart = viewer.camera.positionCartographic;
  const baseLon = Cesium.Math.toDegrees(cart.longitude);
  const baseLat = Cesium.Math.toDegrees(cart.latitude);
  const height = cart.height;
  // Six waypoints around the home point. The first re-targets home so
  // the loop is closed and the camera ends roughly where it started.
  const waypoints: Array<[number, number]> = [
    [0, 0],
    [0.05, 0],
    [0.05, 0.05],
    [0, 0.05],
    [-0.05, 0.05],
    [-0.05, 0],
  ];
  const startedAt = performance.now();
  let i = 0;
  while (!ctx.signal.aborted && performance.now() - startedAt < ctx.durationMs) {
    const [dLon, dLat] = waypoints[i % waypoints.length];
    i++;
    await flyToAsync(viewer, baseLon + dLon, baseLat + dLat, height, ctx.signal);
  }
}

async function cameraZoomRunner(ctx: RunContext): Promise<void> {
  const viewer = getRegisteredCesiumViewer();
  if (!viewer) {
    await sleep(ctx.durationMs, ctx.signal);
    return;
  }
  const startedAt = performance.now();
  let zoomingIn = true;
  while (!ctx.signal.aborted && performance.now() - startedAt < ctx.durationMs) {
    const altitude = Math.max(viewer.camera.positionCartographic.height, 100);
    const step = altitude * 0.3;
    try {
      if (zoomingIn) viewer.camera.zoomIn(step);
      else viewer.camera.zoomOut(step);
    } catch {
      // Camera can throw in 2D + extreme zoom-out; ignore and continue.
    }
    zoomingIn = !zoomingIn;
    await sleep(1_000, ctx.signal).catch(() => undefined);
  }
}

function cameraRotateRunner(ctx: RunContext): Promise<void> {
  const viewer = getRegisteredCesiumViewer();
  if (!viewer) return sleep(ctx.durationMs, ctx.signal).catch(() => undefined) as Promise<void>;
  return new Promise<void>((resolve) => {
    const startedAt = performance.now();
    let rafId = 0;
    const cleanup = (): void => {
      cancelAnimationFrame(rafId);
      ctx.signal.removeEventListener('abort', cleanup);
      resolve();
    };
    ctx.signal.addEventListener('abort', cleanup, { once: true });
    const tick = (): void => {
      if (performance.now() - startedAt >= ctx.durationMs) {
        cleanup();
        return;
      }
      try {
        viewer.camera.twistRight(0.01);
      } catch {
        // Same as zoom: 2D mode rejects some camera ops.
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  });
}

// ── Helpers ─────────────────────────────────────────────────────────

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new DOMException('aborted', 'AbortError'));
      return;
    }
    const onAbort = (): void => {
      window.clearTimeout(timer);
      reject(signal.reason ?? new DOMException('aborted', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function flyToAsync(
  viewer: Cesium.Viewer,
  lon: number,
  lat: number,
  height: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const onAbort = (): void => {
      signal.removeEventListener('abort', onAbort);
      try {
        viewer.camera.cancelFlight();
      } catch {
        // No active flight — fine.
      }
      resolve();
    };
    signal.addEventListener('abort', onAbort, { once: true });
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
      duration: 3,
      complete: () => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      },
      cancel: () => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      },
    });
  });
}

// ── Styles ──────────────────────────────────────────────────────────

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  marginTop: 4,
};

const rowBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  font: '10px/1.3 ui-monospace, monospace',
  color: '#e6edf3',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 4,
  padding: '5px 8px',
  cursor: 'pointer',
  textAlign: 'left',
};

const countdownStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  color: '#7ee787',
  fontWeight: 600,
};

const overlayBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 2_147_483_647,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'auto',
  backdropFilter: 'blur(2px)',
};

const overlayCardStyle: CSSProperties = {
  minWidth: 360,
  maxWidth: '60vw',
  background: 'rgba(13, 17, 23, 0.96)',
  color: '#e6edf3',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 10,
  padding: '24px 28px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  font: '13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
  textAlign: 'center',
};
