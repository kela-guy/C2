/**
 * Floating perf HUD overlay. Dev-only.
 *
 * Layout:
 *   ┌──── C2 Perf ──── [×] ┐
 *   │  FPS / p50 / p95 / p99
 *   │  ▁▃▂▅▇█▆▃▁  ← frame strip (last 5 s)
 *   │  ── stats-gl panels ──
 *   │  ── INP feed ──
 *   │  ── LoAF feed ──
 *   │  ── Cesium counters ──
 *   │  ── React render counts ──
 *   │  ── Cesium debug toggles ──
 *   │  [ Download trace ]
 *   └──────────────────────┘
 *
 * The HUD is a *single* fixed-position root, not portaled into Cesium
 * — overlaying inside the WebGL canvas would force an extra DOM
 * compositing layer per update. As a fixed-position div on top of
 * everything, it composites once per frame regardless of content.
 *
 * Drag the title bar to reposition; double-click to reset. Position
 * persists in localStorage.
 *
 * Toggle visibility: `Ctrl/Cmd + Shift + P` or click the floating tab.
 */

import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { downloadTrace } from '@/lib/perf/trace';
import { snapshotRecent, subscribe, getTotalCount, type PerfEvent } from '@/lib/perf/sink';
import { getFrameIntervals } from '@/lib/perf/framePacing';
import { attachStatsGl, detachStatsGl } from '@/lib/perf/statsGl';
import { getRenderCounts, subscribeRenderCounts } from '@/lib/perf/renderCounters';
import { PerfScenarios } from './PerfScenarios';
import type { Viewer } from 'cesium';

type CesiumViewerLike = Viewer;

interface CesiumDebugFlags {
  showFps: boolean;
  showFrustums: boolean;
  showFrustumPlanes: boolean;
  showCommands: boolean;
  showWireframe: boolean;
}

const POS_KEY = 'c2hub.perf.hud.pos';
const VIS_KEY = 'c2hub.perf.hud.visible';

interface Pos {
  x: number;
  y: number;
}

function readPos(): Pos {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Pos;
      if (Number.isFinite(v.x) && Number.isFinite(v.y)) return v;
    }
  } catch {
    /* fall through to default */
  }
  return { x: 16, y: 16 };
}

function writePos(p: Pos): void {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(p));
  } catch {
    /* swallowed */
  }
}

function readVisible(): boolean {
  try {
    return localStorage.getItem(VIS_KEY) !== '0';
  } catch {
    return true;
  }
}

function writeVisible(v: boolean): void {
  try {
    localStorage.setItem(VIS_KEY, v ? '1' : '0');
  } catch {
    /* swallowed */
  }
}

let registeredViewer: CesiumViewerLike | null = null;
const viewerSubscribers = new Set<(viewer: CesiumViewerLike | null) => void>();

/**
 * Called from `CesiumMap.tsx` once a Viewer exists. The HUD subscribes
 * to learn when to attach `stats-gl` and the Cesium debug toggles.
 * Passing `null` deregisters (viewer torn down).
 */
export function registerCesiumViewerForPerf(viewer: CesiumViewerLike | null): void {
  registeredViewer = viewer;
  for (const fn of viewerSubscribers) fn(viewer);
}

/**
 * Read the currently-registered Cesium viewer outside of React. Used
 * by the PerfScenarios runner: scenario `run` callbacks are plain
 * async functions that need to drive the camera without going through
 * a hook + re-render dance. Returns `null` if no viewer is mounted yet.
 */
export function getRegisteredCesiumViewer(): CesiumViewerLike | null {
  return registeredViewer;
}

function useRegisteredViewer(): CesiumViewerLike | null {
  const [v, setV] = useState<CesiumViewerLike | null>(registeredViewer);
  useEffect(() => {
    const fn = (viewer: CesiumViewerLike | null): void => setV(viewer);
    viewerSubscribers.add(fn);
    return () => {
      viewerSubscribers.delete(fn);
    };
  }, []);
  return v;
}

/** Mounts the HUD root once. Called from setupPerf in dev. */
export function PerfHud(): React.JSX.Element | null {
  const [visible, setVisible] = useState<boolean>(readVisible);
  const [pos, setPos] = useState<Pos>(readPos);
  const dragStateRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    writeVisible(visible);
  }, [visible]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Drag handlers — global so dragging works even if the cursor
  // leaves the title bar.
  useEffect(() => {
    const onMove = (e: MouseEvent): void => {
      const s = dragStateRef.current;
      if (!s) return;
      const next = {
        x: Math.max(0, s.origX + (e.clientX - s.startX)),
        y: Math.max(0, s.origY + (e.clientY - s.startY)),
      };
      setPos(next);
    };
    const onUp = (): void => {
      if (dragStateRef.current) {
        dragStateRef.current = null;
        writePos(pos);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [pos]);

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        style={dotStyle}
        title="Show perf HUD (Ctrl+Shift+P)"
      >
        ⚡
      </button>
    );
  }

  return (
    <div
      style={{ ...rootStyle, left: pos.x, top: pos.y }}
      data-perf-hud="root"
    >
      <div
        style={titleBarStyle}
        onMouseDown={(e) => {
          dragStateRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
        }}
        onDoubleClick={() => {
          const reset = { x: 16, y: 16 };
          setPos(reset);
          writePos(reset);
        }}
      >
        <span style={{ fontWeight: 600, letterSpacing: 0.4 }}>C2 Perf</span>
        <button type="button" onClick={() => setVisible(false)} style={closeBtnStyle} title="Hide (Ctrl+Shift+P)">
          ×
        </button>
      </div>
      <div style={bodyStyle}>
        <FrameStats />
        <FrameStrip />
        <StatsGlPanel />
        <SectionDivider label="Cesium" />
        <CesiumCounters />
        <CesiumDebugToggles />
        <SectionDivider label="React renders" />
        <RenderCounters />
        <SectionDivider label="INP / LoAF" />
        <InpLoAFFeed />
        <SectionDivider label="Scenarios" />
        <PerfScenarios />
        <SectionDivider label="Trace" />
        <TraceControls />
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function useTick(intervalMs: number): number {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const id = window.setInterval(force, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return 0;
}

function useSinkSubscription(): number {
  const [tick, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribe(force), []);
  return tick;
}

function FrameStats(): React.JSX.Element {
  useTick(500);
  // Pull the most recent fps record.
  const recent = snapshotRecent(2_000);
  const fpsEvents = recent.filter((e) => e.name === 'fps');
  const last = fpsEvents[fpsEvents.length - 1];
  const fps = last?.value ?? 0;
  const args = (last?.args ?? {}) as { p50?: number; p95?: number; p99?: number; dropped?: number };
  const fpsColor = fps >= 55 ? '#7ee787' : fps >= 30 ? '#f0c674' : '#ff7b72';
  return (
    <div style={statRowStyle}>
      <span>
        FPS <strong style={{ color: fpsColor }}>{fps.toFixed(0)}</strong>
      </span>
      <span>p50 {fmtMs(args.p50)}</span>
      <span>p95 {fmtMs(args.p95)}</span>
      <span>p99 {fmtMs(args.p99)}</span>
      <span>drops {args.dropped ?? 0}</span>
    </div>
  );
}

function FrameStrip(): React.JSX.Element {
  useTick(250);
  // Last ~3 s @ 60 Hz = 180 samples.
  const intervals = getFrameIntervals();
  const len = Math.min(intervals.length, 180);
  const slice = intervals.subarray(intervals.length - len);
  // Each bar: 2 px wide, max height 28 px. >33 ms maps to red.
  return (
    <svg width={len * 2} height={32} style={{ display: 'block', marginTop: 4 }}>
      {Array.from(slice).map((v, i) => {
        const h = Math.min(28, (v / 50) * 28);
        const fill = v > 33 ? '#ff7b72' : v > 20 ? '#f0c674' : '#7ee787';
        return <rect key={i} x={i * 2} y={32 - h} width={1.5} height={h} fill={fill} />;
      })}
    </svg>
  );
}

function StatsGlPanel(): React.JSX.Element {
  const viewer = useRegisteredViewer();
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!viewer || !hostRef.current) return;
    let cancelled = false;
    void attachStatsGl(viewer, hostRef.current).then(() => {
      if (cancelled) detachStatsGl();
    });
    return () => {
      cancelled = true;
      detachStatsGl();
    };
  }, [viewer]);

  return (
    <div ref={hostRef} style={{ marginTop: 6, minHeight: viewer ? 48 : 16, fontSize: 10, opacity: viewer ? 1 : 0.6 }}>
      {!viewer && <span>Cesium viewer not attached yet…</span>}
    </div>
  );
}

function SectionDivider({ label }: { label: string }): React.JSX.Element {
  return (
    <div style={{ marginTop: 10, marginBottom: 4, fontSize: 10, opacity: 0.7, letterSpacing: 0.5, textTransform: 'uppercase' }}>
      {label}
    </div>
  );
}

function CesiumCounters(): React.JSX.Element {
  useTick(1000);
  const recent = snapshotRecent(2_000);
  const lastBy = (name: string): PerfEvent | undefined => {
    for (let i = recent.length - 1; i >= 0; i--) if (recent[i].name === name) return recent[i];
    return undefined;
  };
  const entities = lastBy('cesium.entities')?.value ?? 0;
  const html = lastBy('cesium.htmlMarkers')?.value ?? 0;
  const tiles = lastBy('cesium.tilesQueued')?.value ?? 0;
  return (
    <div style={statRowStyle}>
      <span>entities <strong>{entities.toFixed(0)}</strong></span>
      <span>html <strong>{html.toFixed(0)}</strong></span>
      <span>tiles <strong>{tiles.toFixed(0)}</strong></span>
    </div>
  );
}

function CesiumDebugToggles(): React.JSX.Element {
  const viewer = useRegisteredViewer();
  const [flags, setFlags] = useState<CesiumDebugFlags>({
    showFps: false,
    showFrustums: false,
    showFrustumPlanes: false,
    showCommands: false,
    showWireframe: false,
  });

  useEffect(() => {
    if (!viewer) return;
    type DebugScene = {
      debugShowFramesPerSecond: boolean;
      debugShowFrustums: boolean;
      debugShowFrustumPlanes: boolean;
      debugShowCommands: boolean;
      globe: { _surface?: { tileProvider?: { _debug?: { wireframe?: boolean } } } };
    };
    const s = viewer.scene as unknown as DebugScene;
    s.debugShowFramesPerSecond = flags.showFps;
    s.debugShowFrustums = flags.showFrustums;
    s.debugShowFrustumPlanes = flags.showFrustumPlanes;
    s.debugShowCommands = flags.showCommands;
    const dbg = s.globe._surface?.tileProvider?._debug;
    if (dbg) dbg.wireframe = flags.showWireframe;
    viewer.scene.requestRender();
  }, [viewer, flags]);

  const toggle = (key: keyof CesiumDebugFlags): void => {
    setFlags((f) => ({ ...f, [key]: !f[key] }));
  };

  const items: Array<{ key: keyof CesiumDebugFlags; label: string }> = [
    { key: 'showFps', label: 'FPS' },
    { key: 'showFrustums', label: 'Frustums' },
    { key: 'showFrustumPlanes', label: 'Frustum planes' },
    { key: 'showCommands', label: 'Commands' },
    { key: 'showWireframe', label: 'Wireframe' },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          disabled={!viewer}
          onClick={() => toggle(it.key)}
          style={{
            ...toggleBtnStyle,
            background: flags[it.key] ? '#1f6feb' : 'rgba(255,255,255,0.06)',
            opacity: viewer ? 1 : 0.5,
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function RenderCounters(): React.JSX.Element {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeRenderCounts(force), []);
  const counts = getRenderCounts();
  const entries = Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
  if (entries.length === 0) {
    return <div style={{ fontSize: 10, opacity: 0.6 }}>No &lt;Profiler&gt; wraps mounted.</div>;
  }
  return (
    <div style={{ fontSize: 10, lineHeight: 1.6 }}>
      {entries.slice(0, 8).map(([id, v]) => (
        <div key={id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{id}</span>
          <span>
            <span style={{ opacity: 0.7 }}>{v.count}× </span>
            <span style={{ color: v.lastDuration > 16 ? '#ff7b72' : v.lastDuration > 4 ? '#f0c674' : '#7ee787' }}>
              {v.lastDuration.toFixed(1)}ms
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function InpLoAFFeed(): React.JSX.Element {
  useSinkSubscription();
  const recent = snapshotRecent(60_000);
  const inps = recent.filter((e) => e.name === 'INP').slice(-3);
  const loafs = recent.filter((e) => e.name === 'LoAF').slice(-5);
  return (
    <div style={{ fontSize: 10, lineHeight: 1.5 }}>
      <div style={{ opacity: 0.7 }}>INP (last 3):</div>
      {inps.length === 0 && <div style={{ opacity: 0.5 }}>none yet</div>}
      {inps.map((e, i) => {
        const a = (e.args ?? {}) as {
          interactionType?: string;
          interactionTarget?: string;
          inputDelay?: number;
          processingDuration?: number;
          presentationDelay?: number;
        };
        return (
          <div key={i}>
            <strong style={{ color: e.value && e.value > 200 ? '#ff7b72' : e.value && e.value > 100 ? '#f0c674' : '#7ee787' }}>
              {e.value?.toFixed(0)}ms
            </strong>{' '}
            {a.interactionType} → {a.interactionTarget?.slice(0, 40) ?? '—'}
            <div style={{ opacity: 0.6, paddingLeft: 8 }}>
              input {fmtMs(a.inputDelay)} · proc {fmtMs(a.processingDuration)} · pres {fmtMs(a.presentationDelay)}
            </div>
          </div>
        );
      })}
      <div style={{ opacity: 0.7, marginTop: 6 }}>LoAF (last 5):</div>
      {loafs.length === 0 && <div style={{ opacity: 0.5 }}>none yet</div>}
      {loafs.map((e, i) => {
        const a = (e.args ?? {}) as {
          blockingDuration?: number;
          scripts?: Array<{ sourceFunctionName?: string; sourceURL?: string; duration?: number }>;
        };
        const top = a.scripts?.[0];
        return (
          <div key={i}>
            <strong style={{ color: e.dur && e.dur > 100 ? '#ff7b72' : '#f0c674' }}>{e.dur?.toFixed(0)}ms</strong>
            {' '}block {fmtMs(a.blockingDuration)}
            {top && (
              <div style={{ opacity: 0.6, paddingLeft: 8 }}>
                {top.sourceFunctionName || '(anon)'} · {top.duration?.toFixed(0)}ms · {top.sourceURL?.split('/').pop()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TraceControls(): React.JSX.Element {
  const total = useTotalCount();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <button type="button" onClick={() => downloadTrace()} style={primaryBtnStyle}>
        Download trace JSON
      </button>
      <span style={{ fontSize: 10, opacity: 0.6 }}>{total.toLocaleString()} events</span>
    </div>
  );
}

function useTotalCount(): number {
  const [n, setN] = useState(getTotalCount);
  useEffect(() => subscribe(() => setN(getTotalCount())), []);
  return n;
}

// ── Helpers ─────────────────────────────────────────────────────────

function fmtMs(v: number | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(1)}ms`;
}

// ── Styles ──────────────────────────────────────────────────────────

const rootStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 2_147_483_647,
  width: 320,
  background: 'rgba(13, 17, 23, 0.92)',
  color: '#e6edf3',
  font: '11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
  backdropFilter: 'blur(6px)',
  pointerEvents: 'auto',
  userSelect: 'none',
};

const titleBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  cursor: 'move',
};

const closeBtnStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#e6edf3',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  padding: '0 4px',
};

const bodyStyle: CSSProperties = {
  padding: '6px 8px 10px',
  maxHeight: '70vh',
  overflowY: 'auto',
};

const statRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  fontSize: 11,
};

const dotStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 2_147_483_647,
  bottom: 16,
  right: 16,
  width: 32,
  height: 32,
  borderRadius: 16,
  background: 'rgba(13, 17, 23, 0.85)',
  color: '#e6edf3',
  border: '1px solid rgba(255,255,255,0.12)',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
};

const toggleBtnStyle: CSSProperties = {
  font: '10px/1 ui-monospace, monospace',
  color: '#e6edf3',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 4,
  padding: '3px 6px',
  cursor: 'pointer',
};

const primaryBtnStyle: CSSProperties = {
  font: '10px/1 ui-monospace, monospace',
  color: '#e6edf3',
  background: '#1f6feb',
  border: '1px solid #1f6feb',
  borderRadius: 4,
  padding: '4px 8px',
  cursor: 'pointer',
};
