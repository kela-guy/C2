import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
