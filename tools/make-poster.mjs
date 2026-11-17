// Campaign poster: the brand image plus the lockup and both taglines, typeset in SVG and rendered
// at 150 dpi. Needs the key visual (assets/brand/brand-hero.jpg) and @resvg/resvg-js.
//
//   node tools/make-poster.mjs
//   convert assets/brand/campaign-poster.png -strip -quality 90 assets/brand/campaign-poster.jpg
//   rm assets/brand/campaign-poster.png
//
// The renderer only writes PNG; the JPG is the file that ships (the PNG intermediate is ignored).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { lockupSvg, glyph, fit, PALETTE, TAGLINE, FONT } from './brand.mjs';

const HERO = 'assets/brand/brand-hero.jpg';
if (!existsSync(HERO)) {
  console.log('poster: no key visual yet (assets/brand/brand-hero.jpg) — skipped');
  process.exit(0);
}
let Resvg;
try { ({ Resvg } = await import('@resvg/resvg-js')); } catch {
  console.log('poster: @resvg/resvg-js is not installed — skipped');
  process.exit(0);
}

const W = 1240, H = 1754;          // A4 at 150 dpi
const PHOTO = 1010;                // image height, the rest is the type panel
const img = `data:image/jpeg;base64,${readFileSync(HERO).toString('base64')}`;
const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const Y = PHOTO; // top of the type panel
const col = (i, head, line) => `
  <text x="${96 + i * 356}" y="${Y + 400}" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="2.4" fill="${PALETTE.sproutInk}">${head}</text>
  <text x="${96 + i * 356}" y="${Y + 442}" font-family="${FONT}" font-size="25" font-weight="400" fill="${PALETTE.muted}">${line}</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PALETTE.midnight}" stop-opacity=".62"/>
      <stop offset=".34" stop-color="${PALETTE.midnight}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="foot" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PALETTE.midnight}" stop-opacity="0"/>
      <stop offset="1" stop-color="${PALETTE.midnight}" stop-opacity=".55"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${PALETTE.cream}"/>
  <image href="${img}" x="0" y="0" width="${W}" height="${PHOTO}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="0" y="0" width="${W}" height="${PHOTO}" fill="url(#scrim)"/>
  <rect x="0" y="${PHOTO - 420}" width="${W}" height="420" fill="url(#foot)"/>

  <!-- mark + wordmark on the photo, top left -->
  <g transform="${fit(104, 104, 112, 0)}">${glyph({ id: 'poster' })}</g>
  <text x="196" y="129" font-family="${FONT}" font-size="46" font-weight="800" letter-spacing="-.4" fill="#fff">KS<tspan fill="${PALETTE.sprout}">-</tspan>LEARN</text>

  <!-- taglines -->
  <text x="96" y="${PHOTO - 148}" font-family="${FONT}" font-size="63" font-weight="700" letter-spacing="-.8" fill="#fff">${xml(TAGLINE.en)}</text>
  <text x="98" y="${PHOTO - 84}" font-family="'Noto Sans Devanagari', ${FONT}" font-size="44" font-weight="500" word-spacing=".34em" fill="#8FE9C1">${xml(TAGLINE.hi)}</text>

  <!-- type panel -->
  <rect x="0" y="${Y}" width="${W}" height="${H - Y}" fill="${PALETTE.cream}"/>
  <rect x="96" y="${Y + 68}" width="96" height="6" fill="${PALETTE.sprout}"/>
  <text x="96" y="${Y + 168}" font-family="${FONT}" font-size="42" font-weight="800" letter-spacing="-.2" fill="${PALETTE.ink}">Personal mastery learning, class 3–9.</text>
  <text x="96" y="${Y + 226}" font-family="${FONT}" font-size="30" font-weight="400" fill="${PALETTE.muted}">One mission a day, about 15 minutes, in Hindi and English.</text>
  ${col(0, 'HABIT', 'Small, finishable, every day.')}
  ${col(1, 'MASTERY', 'Learned only when recalled.')}
  ${col(2, 'PRIVACY', 'Nothing leaves the device.')}
  <text x="96" y="${Y + 540}" font-family="${FONT}" font-size="26" font-weight="600" letter-spacing="2.6" fill="${PALETTE.sproutInk}">WORKS OFFLINE · ONE DEVICE · NO ACCOUNTS · NO ADS</text>
  <text x="96" y="${Y + 588}" font-family="${FONT}" font-size="26" font-weight="400" fill="${PALETTE.muted}">Progress is a backup file you keep, not a profile we hold.</text>

  <rect x="96" y="${H - 118}" width="${W - 192}" height="1" fill="${PALETTE.sand}"/>
  <text x="96" y="${H - 72}" font-family="${FONT}" font-size="23" font-weight="500" letter-spacing="1.4" fill="${PALETTE.muted}">KS-LEARN · SMALL BEGINNINGS. LASTING GROWTH.</text>
  <text x="${W - 96}" y="${H - 72}" text-anchor="end" font-family="${FONT}" font-size="23" font-weight="500" fill="${PALETTE.muted}">v2.1</text>
</svg>`;

// Fonts: Inter for the latin lines, Noto Sans Devanagari for the Hindi tagline.
const { readdirSync } = await import('node:fs');
const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.ttf') ? [`${d}/${e.name}`] : []);
const fontFiles = ['inter', 'noto-sans-devanagari']
  .map(p => `node_modules/@expo-google-fonts/${p}`)
  .filter(existsSync).flatMap(walk)
  .filter(f => !/_Italic|Thin|ExtraLight/.test(f));
const r = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { fontFiles, loadSystemFonts: true, defaultFontFamily: 'Inter' } });
writeFileSync('assets/brand/campaign-poster.png', r.render().asPng());
console.log('poster: assets/brand/campaign-poster.png');
