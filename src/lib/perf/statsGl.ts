/**
 * stats-gl wrapper for the Cesium WebGL context.
 *
 * stats-gl extends Stats.js with WebGL2 GPU timing (via the
 * `EXT_disjoint_timer_query_webgl2` extension) and a CPU/MS panel.
 * Wiring it directly to Cesium's existing WebGL2 context is
 * essentially free — no duplicate context, no extra geometry — and
 * gives us *true* GPU frame time, which is the single most important
 * number for Cesium perf work.
 *
 * Why not use Cesium's `viewer.scene.debugShowFramesPerSecond`:
 *   - That overlay shows CPU frame time (between rAF callbacks). It
 *     does NOT show GPU time. With Cesium's `requestRenderMode` on,
 *     CPU time is often near zero while GPU is doing real work — the
 *     debug FPS counter looks great while the user sees jank.
 *   - stats-gl uses GPU timer queries to read the actual gpu time
 *     spent on each frame's draw calls.
 *
 * The HUD owns the DOM container; this module only manages the
 * Stats instance lifecycle. `update()` is called from the Cesium
 * `postRender` event so the GPU timer query bracket aligns with
 * Cesium's actual draw work.
 */

import type { Viewer } from 'cesium';

interface StatsInstance {
  init: (canvasOrContext: HTMLCanvasElement | WebGL2RenderingContext | WebGLRenderingContext) => Promise<void> | void;
  begin: () => void;
  end: () => void;
  update: () => void;
  dom: HTMLElement;
  container: HTMLElement;
}

interface StatsCtor {
  new (options: {
    logsPerSecond?: number;
    samplesLog?: number;
    samplesGraph?: number;
    precision?: number;
    minimal?: boolean;
    horizontal?: boolean;
    mode?: number;
    trackGPU?: boolean;
    trackHz?: boolean;
    trackCPT?: boolean;
  }): StatsInstance;
}

let stats: StatsInstance | null = null;
let detachPostRender: (() => void) | null = null;

export async function attachStatsGl(viewer: Viewer, hostEl: HTMLElement): Promise<StatsInstance | null> {
  // Lazy-load to keep stats-gl out of any non-perf code paths.
  const mod = (await import('stats-gl')) as { default: StatsCtor };
  const Stats = mod.default;
  stats = new Stats({
    trackGPU: true,
    trackHz: true,
    trackCPT: true,
    logsPerSecond: 4,
    samplesLog: 60,
    samplesGraph: 30,
    precision: 2,
    horizontal: false,
    minimal: false,
    mode: 0,
  });

  // Cesium uses WebGL2 by default in modern builds; pass the actual
  // GL context so the GPU panel can query EXT_disjoint_timer_query_webgl2.
  const canvas = viewer.canvas;
  const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as
    | WebGL2RenderingContext
    | WebGLRenderingContext
    | null;
  if (gl) {
    await stats.init(gl);
  } else {
    await stats.init(canvas);
  }

  // Mount stats-gl's DOM into the host. stats-gl positions itself
  // absolutely; the host should be `position: relative` (the HUD
  // panel is).
  hostEl.appendChild(stats.dom);
  stats.dom.style.position = 'relative';
  stats.dom.style.cursor = 'pointer';

  // Bracket each Cesium frame: begin() before render, end() + update()
  // after. preRender / postRender are the canonical pair.
  const onPreRender = (): void => stats?.begin();
  const onPostRender = (): void => {
    stats?.end();
    stats?.update();
  };
  viewer.scene.preRender.addEventListener(onPreRender);
  viewer.scene.postRender.addEventListener(onPostRender);
  detachPostRender = (): void => {
    viewer.scene.preRender.removeEventListener(onPreRender);
    viewer.scene.postRender.removeEventListener(onPostRender);
  };

  return stats;
}

export function detachStatsGl(): void {
  detachPostRender?.();
  detachPostRender = null;
  if (stats?.dom.parentElement) {
    stats.dom.parentElement.removeChild(stats.dom);
  }
  stats = null;
}
