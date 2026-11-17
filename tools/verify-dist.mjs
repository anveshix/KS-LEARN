// Release gate for the built files: policy present and matching, nothing external, size within budget.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const fail = []; const need = (ok, msg) => { if (!ok) fail.push(msg); };
const b64 = s => createHash('sha256').update(s).digest('base64');
for (const f of ['dist/ks-learn.html', 'dist/pwa/index.html']) {
  const html = readFileSync(f, 'utf8');
  const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
  const js = (html.match(/<script>([\s\S]*)<\/script>/) || [])[1] || '', css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
  need(csp.includes("default-src 'none'"), `${f}: no default-src 'none'`);
  need(!/unsafe-inline|unsafe-eval|\*/.test(csp), `${f}: policy has unsafe or wildcard sources`);
  need(csp.includes(`'sha256-${b64(js)}'`), `${f}: script hash does not match`);
  need(csp.includes(`'sha256-${b64(css)}'`), `${f}: style hash does not match`);
  need((html.match(/<script/g) || []).length === 1, `${f}: expected exactly one script`);
  need(!/<(script|link|img|iframe)[^>]+(src|href)="https?:/i.test(html), `${f}: loads an external resource`);
  need(!/\beval\(|new Function\(|\.innerHTML\s*=|document\.write\(|insertAdjacentHTML/.test(js), `${f}: dynamic code or HTML injection found`);
  need(!/fetch\(|XMLHttpRequest|WebSocket\(|sendBeacon|EventSource\(/.test(js), `${f}: network call found`);
  const hosts = new Set((html.match(/https?:\/\/[a-z0-9.-]+/gi) || []).map(u => u.replace(/^https?:\/\//, '')));
  for (const h of hosts) need(['phet.colorado.edu', 'www.w3.org'].includes(h), `${f}: unexpected host ${h}`);
  need(statSync(f).size < 900 * 1024, `${f}: larger than 900 KB`);
}
for (const f of ['manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'og-image.png', '_headers']) need(existsSync(`dist/pwa/${f}`), `dist/pwa/${f} missing`);
const man = JSON.parse(readFileSync('dist/pwa/manifest.webmanifest', 'utf8'));
need(man.icons.some(i => i.sizes === '192x192' && i.type === 'image/png') && man.icons.some(i => i.sizes === '512x512'), 'manifest needs 192 and 512 PNG icons');
const sw = readFileSync('dist/pwa/sw.js', 'utf8');
need(/url\.origin !== self\.location\.origin/.test(sw), 'service worker must ignore other origins');
for (const m of fail) console.error('FAIL', m);
console.log(fail.length ? `${fail.length} problem(s)` : 'dist verified');
process.exitCode = fail.length ? 1 : 0;
