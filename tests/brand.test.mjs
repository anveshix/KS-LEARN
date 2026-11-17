// Brand assets: the mark must stay self-contained, single-source and CSP-safe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { iconSvg, markSvg, monoMarkSvg, lockupSvg, socialCardSvg, glyph, PALETTE, TAGLINE, MARK_DATA_URI } from '../tools/brand.mjs';

test('icons carry no external reference and no script', () => {
  for (const svg of [iconSvg(), iconSvg({ maskable: true }), iconSvg({ bleed: true }), markSvg({ h: 400 }), socialCardSvg()]) {
    assert.match(svg, /^<svg /);
    // The only allowed URL is the SVG namespace itself: nothing is fetched or linked.
    assert.doesNotMatch(svg.replace(/xmlns(:\w+)?="http:\/\/www\.w3\.org\/2000\/svg"/g, ''), /https?:\/\//i,
      'brand artwork must not reference a URL');
    assert.doesNotMatch(svg, /(href|src)="(http|\/\/)/i);
    assert.doesNotMatch(svg, /<script|xlink:href|@import/i);
  }
});

test('icon variants differ where the platform expects it', () => {
  assert.match(iconSvg({ maskable: true }), /<rect width="512" height="512" rx="0"/);
  assert.match(iconSvg({ bleed: true }), /<rect width="512" height="512" rx="0"/, 'iOS masks the icon itself');
  assert.match(iconSvg(), /<rect width="512" height="512" rx="112"/);
});

test('the one-colour mark uses exactly one ink', () => {
  const svg = monoMarkSvg(PALETTE.midnight);
  const fills = new Set([...svg.matchAll(/fill="([^"]+)"/g)].map(m => m[1]));
  assert.deepEqual([...fills], [PALETTE.midnight]);
});

test('the colour mark uses only palette colours', () => {
  const allowed = new Set(Object.values(PALETTE).map(c => c.toLowerCase()));
  const fills = [...glyph().matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map(m => m[1].toLowerCase());
  assert.ok(fills.length >= 3);
  for (const c of fills) assert.ok(allowed.has(c), `${c} is not in the palette`);
});

test('lockups carry the name and both taglines', () => {
  const svg = lockupSvg({ tagline: true });
  assert.match(svg, /KS<tspan[^>]*>-<\/tspan>LEARN/);
  assert.ok(svg.includes(TAGLINE.en), 'English tagline missing');
  assert.ok(svg.includes(TAGLINE.hi), 'Hindi tagline missing');
});

test('the in-app mark is a decodable data URI, not a request', () => {
  assert.ok(MARK_DATA_URI.startsWith('data:image/svg+xml,'));
  const svg = decodeURIComponent(MARK_DATA_URI.slice('data:image/svg+xml,'.length));
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.ok(svg.includes('<path'), 'mark has no geometry');
  // Nothing that a strict Content-Security-Policy would refuse (img-src data: only).
  assert.doesNotMatch(svg, /<image|<use|href=|url\((?!#)/i);
});

test('the generated module in src/ui matches the geometry', () => {
  const mod = readFileSync('src/ui/mark.js', 'utf8');
  assert.ok(mod.includes(MARK_DATA_URI), 'run node tools/make-assets.mjs: src/ui/mark.js is stale');
});

test('committed PNGs exist and stay small enough to ship', () => {
  for (const f of ['assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png',
    'assets/apple-touch-icon.png', 'assets/favicon.svg', 'assets/brand/logo-mark.svg',
    'assets/brand/logo-lockup.svg', 'assets/brand/social-card.png']) {
    assert.ok(existsSync(f), `${f} is missing`);
  }
  assert.ok(statSync('assets/icon-512.png').size < 160 * 1024);
});
