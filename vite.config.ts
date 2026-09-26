import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Stamps dist/sw.js with a build id and the list of files to precache, so every
 * deploy ships a byte-different service worker with fresh cache names.
 * Only the app shell is precached; the lazy 3D chunk and data files are cached
 * at runtime when first used, to respect expensive mobile data.
 */
function serviceWorkerStamp(): Plugin {
  let outDir = 'dist';
  const shell = new Set<string>(['/', '/index.html', '/manifest.webmanifest', '/favicon.svg']);
  return {
    name: 'sun-seat-sw-stamp',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    generateBundle(_options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        const isEntry = chunk.type === 'chunk' && chunk.isEntry;
        const isCss = chunk.type === 'asset' && fileName.endsWith('.css');
        if (isEntry || isCss) shell.add(`/${fileName}`);
      }
    },
    closeBundle() {
      const swPath = resolve(outDir, 'sw.js');
      if (!existsSync(swPath)) return;
      const precache = [...shell].sort();
      const buildId = createHash('sha256').update(precache.join('|')).update(String(Date.now())).digest('hex').slice(0, 12);
      const source = readFileSync(swPath, 'utf8')
        .replace("const BUILD_ID = '__BUILD_ID__';", `const BUILD_ID = '${buildId}';`)
        .replace('const PRECACHE = __PRECACHE__;', `const PRECACHE = ${JSON.stringify(precache)};`);
      if (source.includes('__BUILD_ID__') || source.includes('__PRECACHE__')) {
        throw new Error('sun-seat-sw-stamp: service worker placeholders were not replaced');
      }
      writeFileSync(swPath, source);
    }
  };
}

export default defineConfig({
  plugins: [react(), serviceWorkerStamp()],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 700
  }
});
