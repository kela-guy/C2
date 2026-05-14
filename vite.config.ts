import { defineConfig, type PluginOption } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
import { fileURLToPath } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';
import reactScan from '@react-scan/vite-plugin-react-scan';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const ANALYZE = process.env.ANALYZE === '1';
const PERF_BUILD = process.env.PERF_BUILD === '1';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const plugins: PluginOption[] = [react(), tailwindcss(), cesium()];

  // react-scan annotates every commit with a render-cause overlay in
  // dev. The plugin loads but starts disabled — toggle it on from the
  // react-scan browser overlay (or set `enable: true` here) when you
  // actually need the render-cause annotations. Always-on instrumentation
  // wraps every React commit and adds noticeable overhead during the
  // 4 Hz simulation tick, so the default is off.
  if (isDev) {
    plugins.push(reactScan({ enable: false, autoDisplayNames: true }));
  }

  // Bundle visualizer. Run `pnpm build:analyze` to emit
  // `dist/stats.html` with the standard sunburst/treemap reports.
  if (ANALYZE) {
    plugins.push(
      visualizer({
        filename: 'dist/stats.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }) as PluginOption,
    );
  }

  return {
    // `vite-plugin-cesium` copies CesiumJS static assets (workers, widgets CSS,
    // Assets dir) into the dev server + production bundle and sets
    // `window.CESIUM_BASE_URL` automatically.
    plugins,
    resolve: {
      alias: {
        '@/shared': path.resolve(dirname, './src/app'),
        '@': path.resolve(dirname, './src'),
        // `pnpm build:perf` swaps in react-dom/profiling so the React
        // <Profiler> API actually fires in production-like builds.
        // Otherwise Profiler `onRender` is a no-op outside dev. The
        // resulting bundle keeps tree shaking + minification but allows
        // real-world profiling against production paths.
        ...(PERF_BUILD ? { 'react-dom$': 'react-dom/profiling' } : {}),
      },
    },
    // Dev-server config (headers + file-watcher exclusions).
    //
    // Headers — `Document-Policy: js-profiling` enables the JS
    // Self-Profiling API (`new Profiler({...})` for src/lib/perf).
    // Without it the constructor throws. Cheap, no side-effects, always on.
    //
    // The cross-origin-isolation header pair (COOP `same-origin` +
    // COEP `credentialless`) is intentionally NOT enabled by default.
    // It's a precondition for `performance.measureUserAgentSpecificMemory()`,
    // but in practice it interferes with Bing imagery tile fetches inside
    // Cesium's Ion provider chain — the globe goes blank with no error
    // surfaced. We only opt into isolation when the URL has `?perf=full`
    // (the same gate the memory sampler reads), and we do that via a
    // dev-time middleware so static asset routes still work normally.
    //
    // None of this affects the production bundle — `vite preview` serves
    // its own headers, and the perf code is dynamically imported behind
    // an `import.meta.env.DEV` gate so it never reaches end users.
    //
    // Watch — Vite normally only watches files in the module graph, but
    // pnpm's symlinked `node_modules/.pnpm/*` layout sometimes confuses
    // chokidar's "is this in node_modules?" check and it ends up
    // registering watchers for files we never import. Telling chokidar
    // to skip the largest unused trees explicitly removes that overhead
    // without affecting HMR for files we DO import (their explicit
    // resolution still wins).
    //
    // The icon packages are the worst offender: 4 packages × ~500
    // files each = ~2,000 individual icon ESMs. We use 65 of them.
    server: {
      headers: {
        'Document-Policy': 'js-profiling',
      },
      watch: {
        ignored: [
          '**/node_modules/.pnpm/@central-icons-react+**/dist/**',
          '**/node_modules/.pnpm/@central-icons-react+**/es/**',
          '**/node_modules/.pnpm/@cesium*/**/Source/**',
          '**/node_modules/.pnpm/cesium@*/cesium/Source/**',
          '**/node_modules/.vite/**',
          '**/.git/**',
          '**/dist/**',
        ],
      },
    },
    // Help DevTools symbolicate stacks against the original sources so
    // both LoAF `scripts[].sourceURL` and JS Self Profiler frames point
    // back to the right files when investigating regressions.
    //
    // Gated behind PERF_BUILD because forcing both knobs on every
    // esbuild transform roughly doubles HMR rebuild cost on a project
    // this size (Cesium + Radix + Tailwind v4 + sim hooks). When you
    // need symbolicated stacks for a profiling session, start the dev
    // server with `PERF_BUILD=1 pnpm dev` (or use `pnpm build:perf`).
    esbuild: {
      sourcemap: PERF_BUILD,
      keepNames: PERF_BUILD,
    },
    // Pre-bundle dependencies we know we use, so cold start does ONE
    // esbuild pass instead of discovering them lazily as the user
    // navigates. Each "lazy discovery" emits an `optimized dependencies
    // changed` event that interrupts the page (full reload + Vite spike
    // on the dev-server process) — the terminal log routinely shows ~80
    // such entries on first load, mostly Central icons.
    //
    // We intentionally do NOT exclude `cesium` from pre-bundling here.
    // Cesium pulls in CJS sub-deps (e.g. mersenne-twister) that need
    // Vite's ESM interop wrapper to expose a synthetic default export.
    // Excluding cesium leaves those imports as raw `import x from 'cjs-pkg'`
    // and the dev page blanks with a SyntaxError on first load.
    // The cold-start cost of pre-bundling cesium is paid once and cached
    // under `node_modules/.vite/deps`.
    optimizeDeps: {
      include: [
        // ── Radix primitives used across the UI shell ────────────
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-popover',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-dialog',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-collapsible',
        '@radix-ui/react-context-menu',
        '@radix-ui/react-direction',
        '@radix-ui/react-slider',
        '@radix-ui/react-slot',
        '@radix-ui/react-switch',
        '@radix-ui/react-tabs',
        '@radix-ui/react-toggle',

        // ── Animation runtime (motion is the rebrand of framer-motion;
        // both ids resolve to the same package, but we import via
        // `motion/react`) ───────────────────────────────────────
        'motion/react',
        'framer-motion',

        // ── App-wide runtime deps ────────────────────────────────
        'react-dom/client',
        'react-router-dom',
        'react-dnd',
        'react-dnd-html5-backend',
        'react-map-gl',
        'sonner',
        'cmdk',
        'lucide-react',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'dialkit',

        // ── Central icons (only the 65 we actually re-export from
        // src/lib/icons/central.ts) ─────────────────────────────
        // Listing each subpath here turns ~65 separate "discovered new
        // dep, re-optimizing" cycles on first load into a single batch
        // pass during cold start. Generated with:
        //   grep -oE "@central-icons-react/[^']+" src/lib/icons/central.ts | sort -u
        '@central-icons-react/round-filled-radius-0-stroke-2/IconLayoutGrid2',
        '@central-icons-react/round-filled-radius-0-stroke-2/IconVideo2',
        '@central-icons-react/round-filled-radius-1-stroke-1.5/IconPin',
        '@central-icons-react/square-filled-radius-0-stroke-2/IconBulletList',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconAirplane',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowBottomTop',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowRotateCounterClockwise',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconArrowUp',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBatteryFull',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBatteryLow',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBell',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBellOff',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBlock',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconBookSimple',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCamera1',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCheckCircle2',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCheckmark1Medium',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronBottom',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronDoubleLeft',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronDoubleRight',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronLeft',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronRight',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconChevronTop',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCircleX',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconClock',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconColorPalette',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconCompassRound',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconEyeClosed',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconEyeOpen',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconFullscreen1',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconFullscreen2',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconGauge',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconHand5Finger',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconHistory',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconHome',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconInfoSimple',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconLightningBolt',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconListBullets',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconLock',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconMagnifyingGlass',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconMap',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconMapPin',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconMoon',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPause',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPhone',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPin',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPlay',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconPlusMedium',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconRadar',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconRadio',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconRuler',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSend',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSettingsGear1',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSettingsSliderHor',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconShield',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconShip',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSignalTower',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSparkles3Bold',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSplit',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSquareArrowOutTopLeft',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconStopwatch',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconSun',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconTag',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconTrashCanSimple',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconUnlocked',
        '@central-icons-react/round-outlined-radius-1-stroke-1.5/IconWarningSign',
      ],
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(dirname, 'index.html'),
        },
        output: {
          // Predictable vendor splits — Cesium is huge (the WebGL globe) and
          // benefits from being its own long-lived cache entry, separate from
          // app code that ships frequently.
          manualChunks: (id) => {
            // CRITICAL: pin Vite's preload helper to its own tiny chunk.
            // Without this, Rollup's auto-hoisting puts `__vitePreload`
            // into the chunk with the most importers — which is `shiki`
            // (used by the lazy /styleguide route). The result is that
            // every dynamic import() in the app statically depends on the
            // 9.6 MB shiki chunk, ballooning cold-start by ~1.68 MB gzipped.
            if (id.includes('vite/preload-helper')) return 'vendor';
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('cesium')) return 'cesium';
            if (id.includes('react-joyride') || id.includes('react-floater')) return 'tour';
            if (id.includes('shiki')) return 'shiki';
            // Animation chunk. We import from `motion/react` (the
            // official rebrand of Framer Motion), but the actual
            // implementation lives in the `framer-motion` package
            // that `motion` re-exports — so both ids must land in
            // this chunk to keep the bundle de-duplicated.
            // motion-dom / motion-utils are internal sub-packages.
            if (
              id.includes('framer-motion') ||
              id.includes('/motion/') ||
              id.includes('motion-dom') ||
              id.includes('motion-utils')
            ) return 'motion';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('@radix-ui')) return 'radix';
            return undefined;
          },
        },
      },
    },
  };
});
