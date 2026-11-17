// Builds brand/index.html: the one-page brand board, with every logo inlined so the page is a
// single self-contained file (no requests, works from a USB stick or a chat attachment).
//   node tools/make-brand-page.mjs
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import {
  glyph, fit, iconSvg, markSvg, monoMarkSvg, lockupSvg, socialCardSvg, PALETTE, TAGLINE, BOUNDS, FONT,
} from './brand.mjs';

const P = PALETTE;
const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Clear-space diagram: the mark, plus X on every side.
const clearSpace = () => {
  const h = 190, w = (h * (BOUNDS.x1 - BOUNDS.x0)) / (BOUNDS.y1 - BOUNDS.y0);
  const X = Math.round(w * 0.42);
  const pad = 26, cw = Math.round(w + X * 2 + pad * 2), ch = Math.round(h + X * 2 + pad * 2);
  const x0 = pad, x1 = cw - pad, y0 = pad, y1 = ch - pad;
  return `<svg viewBox="0 0 ${cw} ${ch}" width="100%" style="max-width:${cw}px" role="img" aria-label="Clear space: the width of the seed on every side">
    <rect width="${cw}" height="${ch}" fill="${P.cream}"/>
    <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="${P.sprout}" stroke-width="1.5" stroke-dasharray="6 5" opacity=".8"/>
    <rect x="${x0 + X}" y="${y0 + X}" width="${x1 - x0 - X * 2}" height="${y1 - y0 - X * 2}" fill="none" stroke="${P.seed}" stroke-width="1.5" stroke-dasharray="3 4"/>
    <text x="${x0 + X / 2}" y="${(y0 + y1) / 2 + 6}" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="700" fill="${P.sproutDeep}">X</text>
    <text x="${(x0 + x1) / 2}" y="${y0 + X / 2 + 6}" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="700" fill="${P.sproutDeep}">X</text>
    <text x="${(x0 + x1) / 2}" y="${y1 - X / 2 + 6}" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="700" fill="${P.sproutDeep}">X</text>
    <text x="${x1 - X / 2}" y="${(y0 + y1) / 2 + 6}" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="700" fill="${P.sproutDeep}">X</text>
    <g transform="translate(${cw / 2} ${ch / 2}) ${fit(h, 0, 0, 0)}">${glyph({ id: 'cs' })}</g>
  </svg>`;
};

// The same icon at the sizes that matter, to prove it holds up.
const sizes = () => [16, 24, 32, 48, 64, 96].map(s =>
  `<figure><div class="sized" style="width:${s}px;height:${s}px">${iconSvg({ size: s })}</div><figcaption>${s} px</figcaption></figure>`).join('');

const swatch = (name, hex, role, dark) => `<div class="sw">
  <div class="chip" style="background:${hex}${dark ? ';box-shadow:inset 0 0 0 1px rgb(0 0 0 / .12)' : ''}"></div>
  <b>${name}</b><code>${hex}</code><span>${role}</span></div>`;

const row = (label, inner, note = '') => `<div class="asset"><div class="asset-head"><h4>${label}</h4>${note ? `<p>${note}</p>` : ''}</div><div class="asset-body">${inner}</div></div>`;

// The two photographic assets are embedded, so this page is one file that travels anywhere.
const img = (file, alt) => existsSync(file)
  ? `<img src="data:image/jpeg;base64,${readFileSync(file).toString('base64')}" alt="${alt}" loading="lazy">`
  : `<p style="padding:40px;color:#59637a">${alt}</p>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>KS-LEARN brand board</title>
<style>
  :root{
    --sprout:${P.sprout}; --sprout-deep:${P.sproutDeep}; --sprout-ink:${P.sproutInk};
    --seed:${P.seed}; --seed-deep:${P.seedDeep}; --midnight:${P.midnight}; --navy:${P.navy};
    --blue:${P.blue}; --ink:${P.ink}; --muted:${P.muted}; --cream:${P.cream}; --sand:${P.sand};
    --indigo:${P.indigo};
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--cream);color:var(--ink);font:17px/1.55 ${FONT};-webkit-font-smoothing:antialiased}
  .wrap{max-width:1080px;margin:0 auto;padding:0 28px 96px}
  h1,h2,h3,h4{line-height:1.15;margin:0;text-wrap:balance}
  code{font:500 13px/1 ui-monospace,Menlo,Consolas,monospace;color:var(--muted)}
  /* cover */
  .cover{background:radial-gradient(120% 100% at 12% 0%,#274681 0%,#16295c 42%,#0b1430 100%);color:#fff;padding:64px 0 72px;margin-bottom:8px}
  .cover .wrap{display:flex;gap:44px;align-items:center;flex-wrap:wrap;padding-bottom:0}
  .cover .mark{width:150px;height:150px;flex:none}
  .cover h1{font-size:clamp(2.4rem,6vw,3.6rem);font-weight:800;letter-spacing:-.02em}
  .cover h1 i{font-style:normal;color:var(--sprout)}
  .cover .tag{font-size:clamp(1.1rem,2.4vw,1.45rem);font-weight:600;color:#f4e7d4;margin:12px 0 0}
  .cover .tag-hi{color:var(--sprout);font-weight:500;margin:4px 0 0}
  .cover .kicker{font-size:.75rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgb(255 255 255 / .62);margin:0 0 14px}
  .cover .meta{margin:26px 0 0;font-size:.9rem;color:rgb(255 255 255 / .55)}
  section{padding-top:56px}
  .eyebrow{font-size:.75rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--sprout-deep);margin:0 0 10px}
  h2{font-size:1.85rem;font-weight:800;letter-spacing:-.01em}
  .lede{max-width:66ch;color:var(--muted);margin:12px 0 0}
  .grid{display:grid;gap:18px;margin-top:26px}
  .g2{grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}
  .g3{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
  .card{background:#fff;border:1px solid rgb(22 32 51 / .09);border-radius:18px;padding:22px;box-shadow:0 10px 30px rgb(28 45 90 / .07)}
  .card.tight{padding:0;overflow:hidden}
  .asset{border:1px solid rgb(22 32 51 / .09);border-radius:18px;overflow:hidden;background:#fff}
  .asset-head{padding:16px 20px 14px;border-bottom:1px solid rgb(22 32 51 / .07)}
  .asset-head h4{font-size:1rem;font-weight:700}
  .asset-head p{margin:2px 0 0;font-size:.85rem;color:var(--muted)}
  .asset-body{display:grid;place-items:center;min-height:120px;background:var(--cream)}
  .asset-body svg{display:block;width:100%;height:auto}
  .duo{display:grid;grid-template-columns:1fr 1fr;gap:0}
  .duo > .asset{border-radius:0;border:0;border-right:1px solid rgb(22 32 51 / .07)}
  .sizes-row{display:flex;gap:26px;align-items:flex-end;flex-wrap:wrap;margin-top:8px}
  .sizes-row figure{margin:0;text-align:center}
  .sized svg{display:block;width:100%;height:100%;border-radius:22%}
  .sizes-row figcaption{margin-top:8px;font-size:.78rem;color:var(--muted)}
  .sw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:16px;margin-top:24px}
  .sw{font-size:.86rem}
  .chip{height:76px;border-radius:14px;margin-bottom:10px}
  .sw b{display:block;font-size:.95rem}
  .sw span{display:block;color:var(--muted);font-size:.82rem;margin-top:2px}
  .type-row{display:flex;gap:22px;align-items:baseline;border-bottom:1px solid rgb(22 32 51 / .08);padding:16px 0}
  .type-row:last-child{border-bottom:0}
  .type-row span{width:150px;flex:none;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  table{width:100%;border-collapse:collapse;margin-top:20px;font-size:.95rem}
  th,td{text-align:left;padding:12px 10px;border-bottom:1px solid rgb(22 32 51 / .08);vertical-align:top}
  th{font-size:.75rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
  td.yes{color:var(--sprout-ink)}
  td.no{color:#b4392a}
  ul.files{columns:2;column-gap:34px;padding-left:18px;margin:18px 0 0;font-size:.92rem;color:var(--muted)}
  ul.files li{break-inside:avoid;margin-bottom:6px}
  .hero{background:#0b1430;border-radius:20px;overflow:hidden;margin-top:24px}
  .hero img{display:block;width:100%;height:auto}
  .hero figcaption{padding:14px 20px;color:rgb(255 255 255 / .6);font-size:.85rem}
  footer{margin-top:64px;padding-top:22px;border-top:1px solid rgb(22 32 51 / .1);color:var(--muted);font-size:.86rem}
  @media (max-width:720px){ .duo{grid-template-columns:1fr} .cover .mark{width:104px;height:104px} ul.files{columns:1} }
</style></head>
<body>

<header class="cover">
  <div class="wrap">
    <div class="mark">${markSvg({ h: 300, size: 150 })}</div>
    <div>
      <p class="kicker">Brand board · v1.0</p>
      <h1>KS<i>-</i>LEARN</h1>
      <p class="tag">${xml(TAGLINE.en)}</p>
      <p class="tag-hi">${xml(TAGLINE.hi)}</p>
      <p class="meta">Personal mastery learning · class 3–9 · Hindi &amp; English · offline, on one device</p>
    </div>
  </div>
</header>

<div class="wrap">

  <section>
    <p class="eyebrow">01 · The idea</p>
    <h2>A seed that already contains the tree.</h2>
    <p class="lede">Fifteen minutes a day is a small beginning. A skill that can still be recalled a
    week later is the lasting growth. The whole identity is built from that one thought: the seed, its
    shadow and the sprout that comes out of it. Everything else stays quiet so the child's work can
    be loud.</p>
    <div class="grid g3">
      <div class="card"><h4>Habit</h4><p class="lede" style="margin-top:6px;font-size:.95rem">One small, finishable mission a day. The streak is an invitation, never a debt.</p></div>
      <div class="card"><h4>Mastery</h4><p class="lede" style="margin-top:6px;font-size:.95rem">A skill counts as learned only when it survives review. Growth you can measure.</p></div>
      <div class="card"><h4>Privacy</h4><p class="lede" style="margin-top:6px;font-size:.95rem">No account, no ads, no network. Progress lives on the phone in the child's hand.</p></div>
    </div>
  </section>

  <section>
    <p class="eyebrow">02 · The mark</p>
    <h2>One seed. One sprout. Four degrees of tilt.</h2>
    <p class="lede">Flat shapes only — three greens and one warm amber. No gradient, no shadow, no outline:
    the mark has to survive a 16&nbsp;px favicon, one-ink print and embroidery without being redrawn.</p>
    <div class="grid g2">
      ${row('Mark · colour', markSvg({ h: 330 }), 'Transparent, on cream')}
      ${row('Mark · one colour', monoMarkSvg(P.midnight), 'Stamps, single-ink print, embroidery')}
    </div>
    <div class="grid g2">
      ${row('Clear space', clearSpace(), 'X = the width of the seed, on all four sides')}
      ${row('Minimum sizes', `<div class="card" style="box-shadow:none;border:0;background:transparent;width:100%"><div class="sizes-row" style="justify-content:center">${sizes()}</div></div>`, 'Mark from 24 px; horizontal lockup from 140 px')}
    </div>
  </section>

  <section>
    <p class="eyebrow">03 · Lockups</p>
    <h2>Wordmark set in the reader's own sans.</h2>
    <p class="lede">The app ships no webfonts, so the wordmark is set in the system sans at weight 800 with
    −1&nbsp;% tracking. The hyphen is always sprout green: the one coloured character, and the reason
    the name reads as a promise rather than a code.</p>
    <div class="grid">
      ${row('Horizontal · default', lockupSvg({ theme: 'light' }), 'Headers, letterheads, slides, welcome screen')}
      ${row('Horizontal · with tagline', lockupSvg({ theme: 'light', tagline: true }), 'Campaigns, sharing cards, print covers')}
      <div class="grid g2" style="margin-top:0">
        ${row('Stacked · with tagline', lockupSvg({ theme: 'cream', stacked: true, tagline: true }), 'Seals, stickers, certificate footers')}
        ${row('On midnight', lockupSvg({ theme: 'dark', tagline: true }), 'Dark UI, video end cards, dark print')}
      </div>
    </div>
  </section>

  <section>
    <p class="eyebrow">04 · Colour</p>
    <h2>Warm seed, cool growth, quiet night.</h2>
    <p class="lede">Sprout green is for growth and confirmation only — never for warnings. Amber never
    carries text. Indigo stays the app's action colour so buttons never compete with the mark.</p>
    <div class="sw-grid">
      ${swatch('Sprout', P.sprout, 'leaves, the hyphen, accents')}
      ${swatch('Sprout deep', P.sproutDeep, 'second leaf, Hindi tagline')}
      ${swatch('Sprout ink', P.sproutInk, 'green text on light · 7:1')}
      ${swatch('Seed amber', P.seed, 'the seed · earned moments')}
      ${swatch('Seed deep', P.seedDeep, 'seed crease, warm borders')}
      ${swatch('Midnight', P.midnight, 'app icon, dark lockups', true)}
      ${swatch('Navy', P.navy, 'icon middle, browser theme', true)}
      ${swatch('Blue', P.blue, 'icon gradient start', true)}
      ${swatch('Cream', P.cream, 'logo background, print')}
      ${swatch('Sand', P.sand, 'campaign backgrounds')}
      ${swatch('Ink', P.ink, 'bodytext')}
      ${swatch('Indigo', P.indigo, 'app buttons and links')}
    </div>
  </section>

  <section>
    <p class="eyebrow">05 · Type</p>
    <h2>System sans, Devanagari first-class.</h2>
    <div class="card" style="margin-top:24px">
      <div class="type-row"><span>Wordmark</span><b style="font-size:2rem;font-weight:800;letter-spacing:-.02em">KS<i style="font-style:normal;color:var(--sprout)">-</i>LEARN</b></div>
      <div class="type-row"><span>Display · 800</span><b style="font-size:1.7rem;font-weight:800;letter-spacing:-.01em">A skill a day keeps the gap away</b></div>
      <div class="type-row"><span>Body · 400</span><span style="width:auto;flex:1;text-transform:none;letter-spacing:0;color:var(--ink);font-size:1rem">One mission, about 15 minutes, in Hindi and English. Everything stays on this phone.</span></div>
      <div class="type-row"><span>Tagline · 600</span><b style="font-weight:600;letter-spacing:.005em">Small beginnings. Lasting growth.</b></div>
      <div class="type-row"><span>Devanagari</span><b style="font-size:1.5rem;font-weight:600">छोटी शुरुआत, पक्की सीख</b></div>
      <div class="type-row"><span>Eyebrow · 700</span><b style="font-size:.8rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)">Today's mission</b></div>
    </div>
    <p class="lede" style="margin-top:14px">Stack: <code>Inter, Segoe UI, system-ui, Roboto, Noto Sans,
    Noto Sans Devanagari, Nirmala UI, sans-serif</code>. Devanagari always gets a Devanagari face and
    5–8&nbsp;% extra line-height. Never letterspace it.</p>
  </section>

  <section>
    <p class="eyebrow">06 · Icon</p>
    <h2>The tile, at every size it will actually be seen.</h2>
    <p class="lede">Midnight gradient, 112&nbsp;px radius at 512&nbsp;px, glyph in the middle third. The
    maskable build keeps the glyph inside the 60&nbsp;% safe circle so Android can crop it to any shape.</p>
    <div class="card">
      <div class="sizes-row" style="justify-content:center">${sizes()}</div>
    </div>
    <div class="grid g2" style="margin-top:18px">
      ${row('App icon · 512', `<div style="width:180px;margin:22px">${iconSvg({ size: 180 })}</div>`, 'any purpose')}
      ${row('Maskable · 512', `<div style="width:180px;margin:22px">${iconSvg({ size: 180, maskable: true })}</div>`, 'full bleed, safe circle')}
    </div>
  </section>

  <section>
    <p class="eyebrow">07 · In the world</p>
    <h2>Sharing card and key visual.</h2>
    <p class="lede">One image does the whole introduction: what it is, who it is for, why it is safe.
    Both taglines travel together on anything India-facing.</p>
    <div class="card tight">
      ${socialCardSvg({ size: 1200 })}
    </div>
    <figure class="hero">
      ${img('assets/brand/brand-hero-640.jpg', 'KS-LEARN brand image: a single almond seed on warm sand, casting the shadow of a full tree')}
      <figcaption>Brand image — <code>assets/brand/brand-hero.jpg</code> (shown at 640 px). The key visual: the seed, and the tree it already contains. Use it at full bleed with type set over the lower third, never cropped through the seed.</figcaption>
    </figure>
    <div class="grid g2">
      <figure class="hero" style="margin-top:0">
        ${img('assets/brand/campaign-poster-760.jpg', 'KS-LEARN campaign poster')}
        <figcaption>Campaign poster, A4 — <code>assets/brand/campaign-poster.jpg</code></figcaption>
      </figure>
      <div class="card">
        <h4>Imagery rules</h4>
        <ul class="files" style="columns:1;margin-top:14px;color:var(--muted)">
          <li>Light comes from the left; shadows fall up and to the right.</li>
          <li>One seed, one shadow, one surface. Never two seeds, never a real tree in frame.</li>
          <li>Warm sand and cream only: no blue skies, no classroom stock photos.</li>
          <li>Type sits in the lower third over the darkened edge, left aligned.</li>
          <li>The seed is never cropped, covered or used as a background texture.</li>
          <li>Children appear in the product, not in the brand imagery.</li>
        </ul>
      </div>
    </div>
  </section>

  <section>
    <p class="eyebrow">08 · Voice</p>
    <h2>A parent talking to a parent.</h2>
    <table>
      <thead><tr><th>Say</th><th>Not</th></tr></thead>
      <tbody>
        <tr><td class="yes">15 minutes a day. One skill at a time.</td><td class="no">Revolutionary adaptive AI learning!</td></tr>
        <tr><td class="yes">Works in aeroplane mode.</td><td class="no">Cloud-synced everywhere.</td></tr>
        <tr><td class="yes">Your child's progress stays on this phone.</td><td class="no">We value your privacy.</td></tr>
        <tr><td class="yes">Class 3–9 · Hindi and English</td><td class="no">All classes, all boards.</td></tr>
        <tr><td class="yes">A seed is not a small tree. But it is the whole tree.</td><td class="no">Unlock your child's true potential.</td></tr>
      </tbody>
    </table>
  </section>

  <section>
    <p class="eyebrow">09 · Files</p>
    <h2>Everything is generated from one file.</h2>
    <p class="lede">Geometry lives in <code>tools/brand.mjs</code>; <code>node tools/make-assets.mjs</code>
    writes the files below, including <code>src/ui/mark.js</code> (the in-app mark, as a data URI, so the
    app still makes no network requests).</p>
    <ul class="files">
      <li>assets/favicon.svg</li>
      <li>assets/icon-192.png</li>
      <li>assets/icon-512.png</li>
      <li>assets/icon-maskable-512.png</li>
      <li>assets/apple-touch-icon.png</li>
      <li>assets/brand/logo-mark.svg</li>
      <li>assets/brand/logo-mark-mono.svg</li>
      <li>assets/brand/logo-mark.png</li>
      <li>assets/brand/logo-mark-transparent.png</li>
      <li>assets/brand/logo-lockup.svg · .png</li>
      <li>assets/brand/logo-lockup-tagline.svg · .png</li>
      <li>assets/brand/logo-lockup-stacked.svg · .png</li>
      <li>assets/brand/logo-lockup-dark.svg · .png</li>
      <li>assets/brand/logo-lockup-sand.svg</li>
      <li>assets/brand/app-icon-1024.png</li>
      <li>assets/brand/app-icon-maskable-512.png</li>
      <li>assets/brand/social-card.svg · .png</li>
      <li>assets/brand/brand-hero.jpg · brand-hero-640.jpg</li>
      <li>assets/brand/campaign-poster.jpg</li>
      <li>docs/BRAND.md</li>
    </ul>
  </section>

  <footer>KS-LEARN brand board v1.0 · prepared for the v2.1 build · tagline: “${xml(TAGLINE.en)}” / “${xml(TAGLINE.hi)}”</footer>
</div>
</body></html>`;

mkdirSync('brand', { recursive: true });
writeFileSync('brand/index.html', html);
console.log(`brand board: brand/index.html (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, self-contained)`);
