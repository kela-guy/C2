import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@/shared': path.resolve(__dirname, './src/app'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // The repo's *.spec.ts files are ComponentSpec design metadata, not tests.
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
