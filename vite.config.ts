import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
import { fileURLToPath } from 'node:url';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // `vite-plugin-cesium` copies CesiumJS static assets (workers, widgets CSS,
  // Assets dir) into the dev server + production bundle and sets
  // `window.CESIUM_BASE_URL` automatically.
  plugins: [react(), tailwindcss(), cesium()],
  resolve: {
    alias: {
      '@/shared': path.resolve(dirname, './src/app'),
      '@': path.resolve(dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(dirname, 'index.html')
      }
    }
  }
});
