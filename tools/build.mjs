// Builds the deliverables from src/:
//   dist/ks-learn.html   one self-contained file: open it in any browser, works offline
//   dist/pwa/            installable offline web app (any static HTTPS host)
//   dist/artifact.html   body-only page for publishing as a claude.ai artifact
// The app makes no network requests. Each page carries a Content-Security-Policy that
// allows only its own inline script and style (by hash) and nothing else.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { ICON } from './icon.mjs';

const VERSION = JSON.parse(readFileSync('package.json', 'utf8')).version;
const sha = (s, enc = 'base64') => createHash('sha256').update(s).digest(enc);
const bundle = async pwa => {
  const { outputFiles } = await build({
    entryPoints: ['src/ui/app.js'], bundle: true, minify: true, format: 'iife', write: false, target: ['es2020'], legalComments: 'none',
    define: { __PWA__: String(pwa) },
  });
  return outputFiles[0].text.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
};
const css = readFileSync('src/ui/style.css', 'utf8');
if (/url\(|@import|https?:/i.test(css)) throw new Error('style.css must not load anything external');

const csp = (js, extra) => [
  "default-src 'none'", `script-src 'sha256-${sha(js)}'`, `style-src 'sha256-${sha(css)}'`,
  "base-uri 'none'", "form-action 'none'", ...extra,
].join('; ');
const page = (js, { policy, links = '', meta = '' }) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${policy}">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="referrer" content="no-referrer">
<title>KS-LEARN</title><meta name="theme-color" content="#16295C">${meta}${links}<style>${css}</style></head>
<body><div id="app"><p class="boot">Loading KS-LEARN…</p></div><noscript>KS-LEARN needs JavaScript.</noscript><script>${js}</script></body></html>`;

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/pwa', { recursive: true });

// 1. Single file (file:// or any host): nothing may be fetched at all.
const jsFile = await bundle(false);
const fileCsp = csp(jsFile, ["img-src data:", "connect-src 'none'"]);
writeFileSync('dist/ks-learn.html', page(jsFile, { policy: fileCsp, links: `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(ICON())}">` }));

// 2. Installable PWA: same-origin files only.
const jsPwa = await bundle(true);
const pwaCsp = csp(jsPwa, ["img-src 'self' data:", "manifest-src 'self'", "worker-src 'self'", "connect-src 'self'"]);
// Sharing card. Nothing is fetched at runtime; these are read by chat apps and search engines.
const META = '<meta name="description" content="KS-LEARN — small beginnings, lasting growth. Personal mastery learning for class 3–9, Hindi and English, offline, on one device.">' +
  '<meta property="og:type" content="website"><meta property="og:site_name" content="KS-LEARN">' +
  '<meta property="og:title" content="KS-LEARN — Small beginnings. Lasting growth.">' +
  '<meta property="og:description" content="Personal mastery learning for class 3–9. Hindi and English. Works offline. No accounts, no ads, nothing leaves the device.">' +
  '<meta property="og:image" content="og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' +
  '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="KS-LEARN — Small beginnings. Lasting growth.">' +
  '<meta name="twitter:image" content="og-image.png">';
const index = page(jsPwa, { policy: pwaCsp, meta: META, links: '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="mask-icon" href="icon.svg" color="#16295C">' });
writeFileSync('dist/pwa/index.html', index);
writeFileSync('dist/pwa/icon.svg', ICON());
for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) copyFileSync(`assets/${f}`, `dist/pwa/${f}`);
copyFileSync('assets/brand/social-card.png', 'dist/pwa/og-image.png'); // sharing card only, never fetched by the app
writeFileSync('dist/pwa/manifest.webmanifest', JSON.stringify({
  id: './', name: 'KS-LEARN — Small beginnings. Lasting growth.', short_name: 'KS-LEARN',
  description: 'Personal mastery learning for class 3–9, Hindi and English. Works offline. No accounts, no ads.',
  start_url: './', scope: './', display: 'standalone', orientation: 'any', background_color: '#f2f5f9', theme_color: '#16295C', lang: 'en-IN',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
  ],
}, null, 1));
// The cache name changes whenever the page changes, so an update replaces the old copy as a whole.
const CACHE = `ks-learn-${VERSION}-${sha(index, 'hex').slice(0, 12)}`;
writeFileSync('dist/pwa/sw.js', `// Offline cache for the app shell. Same-origin GET only; nothing else is stored or proxied.
const CACHE = '${CACHE}';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('ks-learn-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') { e.respondWith(caches.match('index.html', { cacheName: CACHE }).then(hit => hit || fetch(req))); return; }
  e.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then(hit => hit || fetch(req)));
});
`);
// Response headers for hosts that read a _headers file (Cloudflare Pages, Netlify).
// GitHub Pages ignores it; the <meta> policy above still applies there.
writeFileSync('dist/pwa/_headers', `/*
  Content-Security-Policy: ${pwaCsp}; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
/sw.js
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
`);
writeFileSync('dist/pwa/.nojekyll', '');

// 3. claude.ai artifact: the host supplies the document shell and its own policy.
writeFileSync('dist/artifact.html', `<title>KS-LEARN</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>${css}</style><div id="app"><p class="boot">Loading KS-LEARN…</p></div><script>${jsFile}</script>`);
console.log(`built v${VERSION}: ${(Buffer.byteLength(jsFile) / 1024).toFixed(0)} KB script, cache ${CACHE}`);
