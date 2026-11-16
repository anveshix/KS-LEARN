# Security and privacy (सुरक्षा और निजता)

## What the app protects
| Asset | Threat | Control |
|---|---|---|
| Child's data (nickname, answers, progress) | Leaving the device | The app makes **no network requests**. Policy: `default-src 'none'`, no `connect-src` in the single file. Checked on every build by `tools/verify-dist.mjs` and in the browser test. No accounts, analytics, fonts or CDNs. |
| Page integrity | Script injection (XSS) | No `innerHTML`, `eval` or dynamic code anywhere; all text reaches the page as text nodes. Content-Security-Policy allows only the one inline script and style, by SHA-256 hash; no `unsafe-inline`. |
| Saved progress | Damaged or hand-edited backup / storage | `sanitize()` rebuilds state field by field with type, range and size limits; unknown keys (including `__proto__`) are dropped. Unreadable storage is copied to `kslearn.v2.damaged`, never overwritten. Restore takes two taps and keeps one undo copy. Files over 3 MB are refused. |
| Skill content | Hostile content pack | Every pack is validated (shape, sizes, ids, prerequisites, loops, bilingual text, answer key) when added **and again on every load**, including packs that arrive inside a backup. |
| Parent area | Child opening reports/settings | 4-digit PIN stored as a salted, 4000-round SHA-256 hash; 5 wrong tries lock it for 1 minute, doubling to 15; locks when left or idle 5 minutes. |
| Installed PWA | Stale or poisoned cache | Service worker serves same-origin GET only, cache name carries a content hash, old caches are deleted on update. |
| Supply chain | Malicious dependency | Zero runtime dependencies. One build tool (esbuild, exact version, lockfile, `npm ci --ignore-scripts`, `npm audit` in CI). CI token is read-only. |

## What it does not protect (be clear about this)
- **The PIN is a child lock, not a password.** Anyone who can open the browser's developer tools or clear site data can read or erase local data. Do not reuse a bank or phone PIN.
- **Local data is not encrypted.** Protect the device with its own screen lock.
- **Backup files** contain the nickname, progress and the PIN hash. Keep them private.
- **Device clock:** streaks and review dates follow the device date.
- The one outside link (PhET simulations, shown after a skill is mastered) opens in a new tab with no referrer. Remove `EXPLORE` in `src/content/index.js` to drop it.
- `frame-ancestors`, HSTS and similar need response headers: `dist/pwa/_headers` sets them on Cloudflare Pages / Netlify. GitHub Pages cannot set headers; the in-page policy still applies there.

## Reporting
Open a private issue with the repository owner. Do not post a child's data in an issue.
