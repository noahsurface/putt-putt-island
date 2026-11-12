import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * A fingerprint of everything in public/assets. It's appended to every image URL
 * (`grass.png?v=…`) so browsers and GitHub Pages never mix cached old art with
 * new game code — new art always means new URLs.
 */
function assetVersion() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public', 'assets');
  const hash = createHash('sha1');
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const file = path.join(dir, name);
      if (fs.statSync(file).isDirectory()) walk(file);
      else hash.update(path.relative(root, file)).update(fs.readFileSync(file));
    }
  };
  if (fs.existsSync(root)) walk(root);
  return hash.digest('hex').slice(0, 10);
}

// `base: './'` keeps asset paths relative so the build works on GitHub Pages
// (served from /putt-putt-island/) and when opened from any folder.
export default defineConfig({
  base: './',
  define: {
    __ASSET_VERSION__: JSON.stringify(assetVersion()),
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as any);
