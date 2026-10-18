import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Writes sw.js with the exact list of built files, so the app works offline after one visit. */
function offlineServiceWorker(): Plugin {
  return {
    name: 'offline-service-worker',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = [...new Set(['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', ...Object.keys(bundle).filter((f) => f !== 'index.html').map((f) => './' + f)])];
      const version = Object.keys(bundle).sort().join('|').length.toString(36) + '-' + Date.now().toString(36);
      const sw = `// generated at build time
const CACHE = 'little-thinkers-${version}';
const FILES = ${JSON.stringify(files, null, 2)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== VOICE_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
const VOICE_CACHE = 'little-thinkers-voices';
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    // fresh copy when online, saved copy when offline
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
    return;
  }
  if (url.pathname.endsWith('/voices/manifest.json')) {
    // newest list of recordings when online, saved list when offline
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copy = r.clone();
          caches.open(VOICE_CACHE).then((c) => c.put(e.request, copy));
          return r;
        })
        .catch(() => caches.match(e.request)),
    );
    return;
  }
  if (url.pathname.includes('/voices/')) {
    // recordings: keep each one once heard (or after "Save voices for offline play")
    e.respondWith(
      caches.open(VOICE_CACHE).then((c) =>
        c.match(e.request).then(
          (hit) =>
            hit ||
            fetch(e.request).then((r) => {
              if (r.ok) c.put(e.request, r.clone());
              return r;
            }),
        ),
      ),
    );
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw });
    },
  };
}

/** The single-file version has no separate icon/manifest files, so drop those links. */
function stripInstallLinks(): Plugin {
  return {
    name: 'strip-install-links',
    transformIndexHtml(html) {
      return html.replace(/\s*<link rel="(manifest|apple-touch-icon|icon)"[^>]*>/g, '');
    },
  };
}

// `npm run build`         -> dist/ for GitHub Pages (offline-capable, installable)
// `npm run build:single`  -> dist-single/index.html, one self-contained file
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [react(), stripInstallLinks(), viteSingleFile()] : [react(), offlineServiceWorker()],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    copyPublicDir: mode !== 'single',
  },
}));
