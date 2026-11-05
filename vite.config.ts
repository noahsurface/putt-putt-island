import { defineConfig } from 'vite';

// `base: './'` keeps asset paths relative so the build works on GitHub Pages
// (served from /putt-putt-island/) and when opened from any folder.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as any);
