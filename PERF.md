# C2 Hub — Perf instrumentation

Dev-only telemetry stack. Nothing here ships to production: every entry
point is gated by `import.meta.env.DEV` + dynamic import, so Rollup
tree-shakes the whole `src/lib/perf` tree out of the prod bundle. A
prod build (`pnpm build`) emits zero matches for `recordEvent`,
`PerfHud`, `setupPerf`, or `stats-gl` (verified).

## Quick start

```bash
pnpm dev
# open http://localhost:5173/?perf=1
```

The HUD auto-mounts in the top-left. Drag the title bar to move,
double-click to reset. `Ctrl/Cmd + Shift + P` toggles visibility.

URL flags (persisted in `localStorage.c2hub.perf.level`):

| Flag           | What you get                                                          |
| -------------- | --------------------------------------------------------------------- |
| _no flag_      | Off — zero overhead.                                                  |
| `?perf=1`      | HUD + observer battery + frame pacing + Cesium marks + sim wraps.     |
| `?perf=full`   | Everything in `?perf=1` plus JS Self Profiler + memory sampler.       |
| `?perf=off`    | Off (also persists).                                                  |
| `?perf=clear`  | Wipes localStorage + persists `off`.                                  |

## What you get

### Always-on (`?perf=1`)

- **Frame pacing** — 1 Hz FPS + p50/p95/p99 + dropped-frame count.
- **stats-gl** — CPU ms, GPU ms (via `EXT_disjoint_timer_query_webgl2`),
  FPS, Hz. Reads from the actual Cesium WebGL2 context, no extra GL
  context.
- **Long Animation Frames (LoAF)** — every frame >50 ms with the top
  three contributing scripts (function name, source URL, duration).
- **Event Timing** — every interaction with `interactionId` + delays.
  Aggregated by `web-vitals/attribution` into a live INP value.
- **LCP / CLS / FCP / TTFB** — both raw `PerformanceObserver` entries
  and the spec-correct `web-vitals/attribution` aggregates.
- **Navigation + Resource Timing** — for cold-start regressions.
- **Cesium marks** — `cesium.moveStart`, `cesium.moveEnd`,
  `cesium.morphComplete`, `cesium.tilesQueued` counter,
  `cesium.entities` counter, `cesium.htmlMarkers` counter,
  `cesium.settle` (settle-after-move latency).
- **Sim marks** — every `friendlyPatrol` and `hostileLoiter` tick is
  wrapped with `measure()`, showing up on the "Sim" custom DevTools
  track.
- **React render counts** — top-level panels are wrapped in
  `<PerfProfiled id="…">`. The HUD lists each id with render count +
  last-actual-duration.
- **Cesium debug toggles** — wireframe, frustums, frustum-planes,
  command-count overlay, debug FPS counter.
- **Download trace** — exports the in-memory ring buffer (~120 k
  events) as a Chrome JSON trace file. Drop into:
  - `chrome://tracing`
  - DevTools Performance panel ("Load profile…")
  - <https://ui.perfetto.dev>

### Heavyweight (`?perf=full`)

- **JS Self-Profiling API** — sampled stack traces at 10 ms,
  rotated every 30 s and stored in the sink so the Chrome trace
  export carries them.
- **`measureUserAgentSpecificMemory`** — true total agent memory by
  type (JavaScript, DOM, Other), sampled every 30 s. Requires COOP+COEP
  headers (already set in `vite.config.ts`).

## Build modes

| Command                | Purpose                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- |
| `pnpm build`           | Production. Perf tree dropped.                                                |
| `pnpm build:analyze`   | Production + writes `dist/stats.html` (rollup-plugin-visualizer treemap).     |
| `pnpm build:perf`      | Production-like, but aliases `react-dom` → `react-dom/profiling`.             |

`pnpm build:perf` is for measuring real-world perf regressions in a
minified/tree-shaken bundle while still letting the React `<Profiler>`
fire. Run with `?perf=1` against a `vite preview` of that build.

## Custom DevTools tracks

Every `measure()` / `mark()` call uses the User Timing API
extensibility payload (`detail.devtools.dataType: 'track-entry'`).
Open Chrome DevTools' Performance panel after running a session and
you'll see the `C2 Hub` track group with `Sim`, `Cesium`, `React`,
`Network`, and `App` tracks pre-colored.

Reference: <https://developer.chrome.com/docs/devtools/performance/extension>

## File layout

```
src/lib/perf/
├── bootstrap.ts        — setupPerf() entry, dynamic-import only
├── flags.ts            — URL/localStorage flag parser
├── sink.ts             — in-memory ring buffer (120 k events)
├── trace.ts            — Chrome JSON trace exporter
├── measure.ts          — measure/mark/counter wrappers + DevTools tracks
├── observers.ts        — PerformanceObserver battery
├── webVitals.ts        — web-vitals/attribution INP/LCP/CLS feeds
├── framePacing.ts      — 1 Hz FPS + percentiles + frame strip
├── cesiumMarks.ts      — Cesium scene/camera event marks
├── statsGl.ts          — stats-gl wrapper for the Cesium WebGL ctx
├── jsSelfProfiler.ts   — JS Self-Profiling API (?perf=full only)
├── memorySampler.ts    — measureUserAgentSpecificMemory (?perf=full only)
└── renderCounters.ts   — React Profiler aggregator

src/app/components/perf/
├── PerfHud.tsx         — floating overlay
└── PerfProfiled.tsx    — <Profiler> drop-in wrapper
```

## Adding new instrumentation

```ts
import { measure, mark, counter } from '@/lib/perf/measure';

// Synchronous timing — appears as a bar on the chosen DevTools track.
const result = measure('Sim', 'sim.targetUpdate', () => updateTargets(prev), {
  properties: { targetCount: prev.length },
});

// Async timing.
await measureAsync('Network', 'fetch.terrain', () => fetch(url));

// Instant marker — appears as a tick.
mark('Cesium', 'cesium.userClickedEngage');

// Counter / metric — graphed by chrome:tracing as a time series.
counter('cesium', 'cesium.fovEntities', count);
```

`measure()` is a no-op in production (the constant inlines + tree
shakes), so feel free to leave wrappers in hot paths.

## Wrapping React panels

```tsx
import { PerfProfiled } from '@/app/components/perf/PerfProfiled';

<PerfProfiled id="MyPanel">
  <MyPanel />
</PerfProfiled>
```

The id will appear in the HUD's "React renders" section with live
counts and last-render duration. In a `pnpm build:perf` bundle the
counter still works against minified code.
