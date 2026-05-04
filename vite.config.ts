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
  // dev. We import its Vite plugin (which only takes effect during
  // `vite dev`) and hide the overlay behind `?perf=1` (the package
  // honors that automatically).
  if (isDev) {
    plugins.push(reactScan({ enable: true, autoDisplayNames: true }));
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
  // Headers for the dev-only perf instrumentation (src/lib/perf):
  //   - `Document-Policy: js-profiling` allows the JS Self-Profiling API
  //     (`new Profiler({...})`) to attach a sampling profiler. Without
  //     it the constructor throws. Cheap, no side-effects, always on.
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
  server: {
    headers: {
      'Document-Policy': 'js-profiling',
    },
  },
  // Help DevTools symbolicate stacks against the original sources so
  // both LoAF `scripts[].sourceURL` and JS Self Profiler frames point
  // back to the right files when investigating regressions.
  esbuild: {
    sourcemap: true,
    keepNames: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(dirname, 'index.html')
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
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('@radix-ui')) return 'radix';
          return undefined;
        },
      },
    }
  }
  };
});
