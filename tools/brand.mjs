// KS-LEARN brand source. Pure strings, no dependencies: the app, the icons and the
// marketing files are all generated from the geometry below, so the mark can never
// drift between surfaces.
//
// Concept: "seed + sprout". One almond seed (small beginning) carrying a three-leaf
// sprout (lasting growth). Drawn flat, in two families — warm seed, cool green growth —
// so it survives being reduced to 16 px, printed in one ink, or embroidered.
//
//   node tools/make-assets.mjs      writes the PNG/SVG files listed in docs/BRAND.md

// ---------- palette ----------
export const PALETTE = {
  midnight: '#0B1430', // deepest tile colour
  navy: '#16295C', // icon gradient middle
  blue: '#24437F', // icon gradient start
  indigo: '#2B55E6', // product action colour (unchanged app accent)
  ink: '#162033', // text
  muted: '#59637A',
  sprout: '#31B981',
  sproutDeep: '#1C9769',
  sproutInk: '#0A5C40',
  seed: '#EFB463',
  seedDeep: '#C2812F',
  seedLight: '#F9D7A4',
  sand: '#F3E7D3',
  cream: '#FBF7EF',
  paper: '#FFFFFF',
};

// ---------- geometry helpers ----------
const P = (x, y) => ({ x, y });
const add = (a, b) => P(a.x + b.x, a.y + b.y);
const sub = (a, b) => P(a.x - b.x, a.y - b.y);
const mul = (a, k) => P(a.x * k, a.y * k);
const lerp = (a, b, t) => P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
const nrm = (a, b) => { const d = sub(b, a), L = Math.hypot(d.x, d.y) || 1; return P(-d.y / L, d.x / L); };
const f = n => Math.round(n * 100) / 100;
const rad = d => (d * Math.PI) / 180;

// Seed outline: a lens with a sharp tip (top) and a rounded base, like a date pit.
function almond(L, W, steps = 36) {
  const right = [], left = [];
  for (let i = 1; i < steps; i++) {
    const s = i / steps;
    // A sharp point at the tip, a full round base: two exponents meet at the equator.
    const k = s < 0.45 ? 1.3 : 0.88;
    const w = W * Math.pow(Math.sin(Math.PI * s), k);
    right.push(P(w, -L / 2 + L * s));
    left.push(P(-w, -L / 2 + L * s));
  }
  const pts = [P(0, -L / 2), ...right, P(0, L / 2), ...left.reverse()];
  return pts.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join('') + 'Z';
}

// A tapered stem: filled band along a cubic, half-width w0 -> w1.
function stem(p0, c1, c2, p1, w0, w1, steps = 18) {
  const pt = t => { const m = 1 - t; return P(
    m * m * m * p0.x + 3 * m * m * t * c1.x + 3 * m * t * t * c2.x + t * t * t * p1.x,
    m * m * m * p0.y + 3 * m * m * t * c1.y + 3 * m * t * t * c2.y + t * t * t * p1.y); };
  const tg = t => { const m = 1 - t; return P(
    3 * m * m * (c1.x - p0.x) + 6 * m * t * (c2.x - c1.x) + 3 * t * t * (p1.x - c2.x),
    3 * m * m * (c1.y - p0.y) + 6 * m * t * (c2.y - c1.y) + 3 * t * t * (p1.y - c2.y)); };
  const L = [], R = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, p = pt(t), d = tg(t), len = Math.hypot(d.x, d.y) || 1, n = P(-d.y / len, d.x / len);
    const w = w0 + (w1 - w0) * Math.pow(t, 0.85);
    L.push(add(p, mul(n, w))); R.push(add(p, mul(n, -w)));
  }
  const walk = (pts, first) => pts.map((p, i) => `${i === 0 && first ? 'M' : 'L'}${f(p.x)} ${f(p.y)}`).join('');
  return walk(L, true) + walk(R.reverse(), false) + 'Z';
}

// Leaf from a blunt base at `a`, pointing at `deg` (0 = right, 90 = up).
function leaf(a, deg, len, w, curve = 0) {
  const t = P(a.x + Math.cos(rad(deg)) * len, a.y - Math.sin(rad(deg)) * len);
  const n = nrm(a, t), A = lerp(a, t, 0.28), B = lerp(a, t, 0.74);
  const c1 = add(A, mul(n, w + curve)), c2 = add(B, mul(n, w * 0.9 + curve));
  const c3 = add(B, mul(n, -w * 0.9 + curve)), c4 = add(A, mul(n, -w + curve));
  const b1 = add(a, mul(n, w * 0.34)), b2 = add(a, mul(n, -w * 0.34));
  return `M${f(b1.x)} ${f(b1.y)}C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(t.x)} ${f(t.y)}` +
    `C${f(c3.x)} ${f(c3.y)} ${f(c4.x)} ${f(c4.y)} ${f(b2.x)} ${f(b2.y)}Z`;
}

// ---------- the mark ----------
const SEED = { L: 122, W: 27.5, y: 60 };
const LEAVES = [
  { a: P(0, -12), deg: 149, len: 72, w: 21, deep: true, curve: 2 },
  { a: P(1, -30), deg: 34, len: 78, w: 21, deep: false, curve: -2 },
  { a: P(2, -52), deg: 90, len: 76, w: 22, deep: false, curve: 0 },
];
// Tight bounds of the glyph, used to place it consistently on every surface.
export const BOUNDS = { x0: -66, x1: 72, y0: -134, y1: 122 };

/**
 * The glyph as SVG markup. `mono` paints it in a single colour (stamps, one-colour print).
 */
export function glyph({ mono = null, id = 'ks' } = {}) {
  const g = mono || PALETTE.sprout;
  const d = mono || PALETTE.sproutDeep;
  const seedFill = mono || PALETTE.seed;
  const out = [];
  for (const l of LEAVES) out.push(`<path d="${leaf(l.a, l.deg, l.len, l.w, l.curve)}" fill="${l.deep ? d : g}"/>`);
  out.push(`<path d="${stem(P(0, 34), P(1, -8), P(1, -36), P(2, -64), 6.2, 2.4)}" fill="${g}"/>`);
  const sd = almond(SEED.L, SEED.W);
  out.push(`<clipPath id="${id}-seed"><path d="${sd}"/></clipPath>`);
  out.push(`<g transform="translate(0 ${SEED.y})">`);
  out.push(`<path d="${sd}" fill="${seedFill}"/>`);
  if (!mono) {
    // One soft seam down the seed, like the crease on the real thing. No gradients:
    // the mark has to survive one-ink print and embroidery.
    out.push(`<g clip-path="url(#${id}-seed)" fill="none" stroke="${PALETTE.seedDeep}" stroke-opacity=".34" stroke-width="3.2" stroke-linecap="round">`);
    out.push(`<path d="M${f(-SEED.W * 0.26)} ${f(-SEED.L * 0.42)}C${f(-SEED.W * 0.42)} ${f(-SEED.L * 0.1)} ${f(-SEED.W * 0.4)} ${f(SEED.L * 0.18)} ${f(-SEED.W * 0.22)} ${f(SEED.L * 0.42)}"/>`);
    out.push(`<path d="M${f(SEED.W * 0.3)} ${f(-SEED.L * 0.34)}C${f(SEED.W * 0.46)} ${f(-SEED.L * 0.05)} ${f(SEED.W * 0.42)} ${f(SEED.L * 0.2)} ${f(SEED.W * 0.16)} ${f(SEED.L * 0.44)}"/>`);
    out.push('</g>');
  }
  out.push('</g>');
  return out.join('');
}

/** Place the glyph so it is centred in `box` and `h` tall. */
export function fit(h, cx, cy, rotate = -4) {
  const s = h / (BOUNDS.y1 - BOUNDS.y0);
  const mx = (BOUNDS.x0 + BOUNDS.x1) / 2, my = (BOUNDS.y0 + BOUNDS.y1) / 2;
  return `translate(${cx} ${cy}) rotate(${rotate}) scale(${f(s)}) translate(${f(-mx)} ${f(-my)})`;
}

const TILE_DEFS = `<linearGradient id="ks-tile" x1="0" y1="0" x2="0.85" y2="1">
    <stop offset="0" stop-color="${PALETTE.blue}"/><stop offset="0.5" stop-color="${PALETTE.navy}"/><stop offset="1" stop-color="${PALETTE.midnight}"/></linearGradient>
  <radialGradient id="ks-warm" cx="0.22" cy="0" r="0.95">
    <stop offset="0" stop-color="#FFE3BA" stop-opacity=".26"/><stop offset="1" stop-color="#FFE3BA" stop-opacity="0"/></radialGradient>`;

/**
 * App icon. `maskable` fills the square (Android crops it to any shape) and keeps the glyph
 * inside the 40 % safe circle; `bleed` fills the square without the smaller safe-zone glyph,
 * which is what iOS wants (it applies its own squircle mask, so the file must not pre-round).
 */
export function iconSvg({ maskable = false, bleed = false, size = 512 } = {}) {
  const square = maskable || bleed;
  const inset = square ? 0 : 112;
  const h = maskable ? 272 : bleed ? 300 : 318;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}"><defs>${TILE_DEFS}</defs>` +
    `<rect width="512" height="512" rx="${inset}" fill="url(#ks-tile)"/>` +
    `<rect width="512" height="512" rx="${inset}" fill="url(#ks-warm)"/>` +
    `<g transform="${fit(h, 256, maskable ? 276 : 272)}">${glyph()}</g></svg>`;
}

/** The mark on its own, transparent or on a light plate. */
export function markSvg({ bg = null, h = 420, size = 512 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">` +
    (bg ? `<rect width="512" height="512" fill="${bg}"/>` : '') +
    `<g transform="${fit(h, 256, 256, 0)}">${glyph()}</g></svg>`;
}

/** One-colour mark for stamps, embroidery and single-ink print. */
export function monoMarkSvg(color = PALETTE.midnight, { size = 512 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">` +
    `<g transform="${fit(420, 256, 256, 0)}">${glyph({ mono: color })}</g></svg>`;
}

// ---------- type ----------
export const FONT = `Inter, 'Segoe UI', system-ui, -apple-system, Roboto, 'Noto Sans', 'Noto Sans Devanagari', 'Nirmala UI', sans-serif`;
export const NAME = 'KS-LEARN';
export const TAGLINE = { en: 'Small beginnings. Lasting growth.', hi: 'छोटी शुरुआत, पक्की सीख' };

/** Escape for XML text nodes. */
const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Logo lockup: mark + wordmark, optional tagline.
 * theme: 'light' (ink on cream) | 'cream' (ink on sand) | 'dark' (paper on midnight)
 * Grid: mark box on the left, text block flush to a shared baseline grid.
 */
export function lockupSvg({ stacked = false, theme = 'light', tagline = false, size = 1200 } = {}) {
  const dark = theme === 'dark';
  const ink = dark ? PALETTE.paper : PALETTE.ink;
  const sub = dark ? 'rgba(255,255,255,.66)' : PALETTE.muted;
  const bg = theme === 'light' ? PALETTE.cream : theme === 'cream' ? PALETTE.sand : PALETTE.midnight;
  const word = `<text x="0" y="0" font-family="${FONT}" font-weight="800" letter-spacing="-.5" fill="${ink}">KS<tspan fill="${PALETTE.sprout}">-</tspan>LEARN</text>`;
  const hi = txt => `<text x="0" y="0" font-family="'Noto Sans Devanagari', ${FONT}" font-weight="500" word-spacing=".34em" fill="${PALETTE.sproutDeep}">${xml(txt)}</text>`;

  if (stacked) {
    const W = 640, H = tagline ? 700 : 560;
    const g = tagline ? 250 : 280;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round((size * H) / W)}">` +
      `<rect width="${W}" height="${H}" fill="${bg}"/>` +
      `<g transform="${fit(g, W / 2, tagline ? 230 : 250, 0)}">${glyph({ id: 'kslS' })}</g>` +
      (tagline
        ? `<g transform="translate(${W / 2} 458)" text-anchor="middle" font-size="72">${word}</g>` +
          `<g transform="translate(${W / 2} 520)" text-anchor="middle" font-size="29">${`<text x="0" y="0" font-family="${FONT}" font-weight="500" fill="${sub}">${xml(TAGLINE.en)}</text>`}</g>` +
          `<g transform="translate(${W / 2} 572)" text-anchor="middle" font-size="26">${hi(TAGLINE.hi)}</g>`
        : `<g transform="translate(${W / 2} 488)" text-anchor="middle" font-size="72">${word}</g>` +
          `<g transform="translate(${W / 2} 556)" text-anchor="middle" font-size="23">${`<text x="0" y="0" font-family="${FONT}" font-weight="500" letter-spacing="3" fill="${sub}">PERSONAL LEARNING TOOLS · CLASS 3–9</text>`}</g>`) +
      '</svg>';
  }

  const H = tagline ? 330 : 224;
  const W = tagline ? 1032 : 940;
  const mk = tagline ? 190 : 152;
  const mkW = Math.round((mk * (BOUNDS.x1 - BOUNDS.x0)) / (BOUNDS.y1 - BOUNDS.y0));
  const tx = 96 + mkW + 58;
  const wordSize = tagline ? 78 : 70;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round((size * H) / W)}">` +
    `<rect width="${W}" height="${H}" fill="${bg}"/>` +
    `<g transform="${fit(mk, 96 + mkW / 2, H / 2, 0)}">${glyph({ id: 'kslH' })}</g>` +
    (tagline
      ? `<g transform="translate(${tx} 146)" font-size="${wordSize}">${word}</g>` +
        `<g transform="translate(${tx + 2} 210)" font-size="28">${`<text x="0" y="0" font-family="${FONT}" font-weight="500" letter-spacing=".2" fill="${sub}">${xml(TAGLINE.en)}</text>`}</g>` +
        `<g transform="translate(${tx + 2} 256)" font-size="26">${hi(TAGLINE.hi)}</g>`
      : `<g transform="translate(${tx} 122)" font-size="${wordSize}">${word}</g>` +
        `<g transform="translate(${tx + 2} 164)" font-size="20">${`<text x="0" y="0" font-family="${FONT}" font-weight="500" letter-spacing="2.6" fill="${sub}">PERSONAL LEARNING TOOLS · CLASS 3–9</text>`}</g>`) +
    '</svg>';
}

/** Sharing card (Open Graph / Twitter), 1200 × 630. */
export function socialCardSvg({ size = 1200 } = {}) {
  const W = 1200, H = 630;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round((size * H) / W)}"><defs>
    <linearGradient id="og-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1E3A72"/><stop offset="0.55" stop-color="#132652"/><stop offset="1" stop-color="#0B1430"/></linearGradient>
    <radialGradient id="og-warm" cx="0.12" cy="0" r="0.9"><stop offset="0" stop-color="#FFD9A6" stop-opacity=".30"/><stop offset="1" stop-color="#FFD9A6" stop-opacity="0"/></radialGradient>
    <radialGradient id="og-glow" cx="0.78" cy="0.85" r="0.6"><stop offset="0" stop-color="#31B981" stop-opacity=".22"/><stop offset="1" stop-color="#31B981" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#og-bg)"/><rect width="${W}" height="${H}" fill="url(#og-warm)"/><rect width="${W}" height="${H}" fill="url(#og-glow)"/>
  <g transform="${fit(300, 952, 330, -3)}">${glyph({ id: 'og' })}</g>
  <text x="96" y="252" font-family="${FONT}" font-size="104" font-weight="800" letter-spacing="1" fill="#FFFFFF">KS<tspan fill="${PALETTE.sprout}">-</tspan>LEARN</text>
  <text x="100" y="330" font-family="${FONT}" font-size="42" font-weight="600" fill="#F4E7D4">${xml(TAGLINE.en)}</text>
  <text x="100" y="386" font-family="'Noto Sans Devanagari', ${FONT}" font-size="32" font-weight="500" word-spacing=".34em" fill="${PALETTE.sprout}">${xml(TAGLINE.hi)}</text>
  <text x="100" y="500" font-family="${FONT}" font-size="24" font-weight="600" letter-spacing="2.4" fill="rgba(255,255,255,.62)">CLASS 3–9 · HINDI / ENGLISH · OFFLINE</text>
  <text x="100" y="548" font-family="${FONT}" font-size="25" font-weight="400" fill="rgba(255,255,255,.45)">No accounts · No ads · Nothing leaves the device</text>
  </svg>`;
}

/** The in-app mark as a data URI, for CSS backgrounds (CSP-safe: img-src data:). */
export const MARK_DATA_URI = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${`<g transform="${fit(430, 256, 256, 0)}">${glyph({ id: 'ui' })}</g>`}</svg>`,
)}`;
