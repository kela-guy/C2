import { defineConfig, type PluginOption } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
import { fileURLToPath } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';
import reactScan from '@react-scan/vite-plugin-react-scan';
import { vercelToolbar } from '@vercel/toolbar/plugins/vite';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const ANALYZE = process.env.ANALYZE === '1';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  // `vercelToolbar()` serves the toolbar's client assets so PMs can pin
  // Comments on live elements. It only mounts when `mountVercelToolbar()`
  // is called (see src/main.tsx) — gated so end-users never see it.
  const plugins: PluginOption[] = [react(), tailwindcss(), cesium(), vercelToolbar()];

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
      },
    },
    // Help DevTools symbolicate stacks against the original sources when
    // investigating regressions.
    esbuild: {
      sourcemap: true,
      keepNames: true,
    },
    build: {
      // Target modern browsers only — no legacy syntax lowering, no
      // injected polyfills. Matches the skill's "modern-only build".
      target: 'esnext',
      // Minify CSS with Lightning CSS (Rust) — faster and smaller than the
      // default esbuild CSS minifier.
      cssMinify: 'lightningcss',
      // Drop the modulePreload polyfill: every browser we target supports
      // <link rel=modulepreload> natively, so the polyfill is dead weight.
      modulePreload: { polyfill: false },
      rollupOptions: {
        input: {
          main: path.resolve(dirname, 'index.html'),
        },
        output: {
          // Predictable vendor splits. The hand-tuned cases below stay
          // (Cesium/shiki isolation + the preload-helper pin are load-bearing);
          // everything else falls through to a per-package chunk so a bump to
          // one library invalidates only its own chunk, not a shared bundle.
          manualChunks: (id) => {
            // CRITICAL: pin Vite's preload helper to its own tiny chunk.
            // Without this, Rollup's auto-hoisting puts `__vitePreload`
            // into the chunk with the most importers — which is `shiki`
            // (used by the lazy /styleguide route). The result is that
            // every dynamic import() in the app statically depends on the
            // 9.6 MB shiki chunk, ballooning cold-start by ~1.68 MB gzipped.
            if (id.includes('vite/preload-helper')) return 'vendor';
            if (!id.includes('node_modules')) return undefined;
            // Deliberate group splits — kept as-is. Cesium is the huge WebGL
            // globe; shiki is the 9.6 MB highlighter behind /styleguide. Both
            // earn dedicated long-lived cache entries.
            if (id.includes('cesium')) return 'cesium';
            if (id.includes('shiki')) return 'shiki';
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('@radix-ui')) return 'radix';
            // Per-package fallback. Cache invalidation becomes per-library
            // instead of per-app-revision. Resolve the real package name from
            // the LAST `node_modules/` segment (handles pnpm's nested layout)
            // and preserve scoped (`@scope/name`) packages.
            const afterLast = id.split('node_modules/').pop() ?? '';
            const segments = afterLast.split('/');
            const pkg = segments[0]?.startsWith('@')
              ? `${segments[0]}/${segments[1]}`
              : segments[0];
            if (!pkg) return undefined;
            return `vendor-${pkg.replace('@', '').replace(/\//g, '-')}`;
          },
        },
      },
    },
  };
});
