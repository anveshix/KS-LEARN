// Renders the PNG app icons from the SVG mark. Run once when the icon changes (needs Playwright):
//   node tools/make-icons.mjs
// The PNGs are committed, so the normal build has no browser dependency.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ICON } from './icon.mjs';
const { chromium } = createRequire(process.env.PLAYWRIGHT_FROM || import.meta.url)('playwright');
const b = await chromium.launch(), p = await b.newPage();
for (const [name, size, pad] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<body style="margin:0;background:${pad ? '#2b55e6' : 'transparent'}">${ICON(pad)}</body>`);
  writeFileSync(`assets/${name}`, await p.screenshot({ omitBackground: !pad }));
}
await b.close();
