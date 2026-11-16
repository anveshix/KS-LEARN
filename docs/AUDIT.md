# Audit, v2.0 → v2.1 (ऑडिट)

## Security
| # | Flaw found | Fix |
|---|---|---|
| 1 | No Content-Security-Policy; inline script unrestricted | Hash-based CSP, `default-src 'none'`, no `unsafe-inline`; style attributes set through CSSOM |
| 2 | Google Fonts loaded on every start (third-party request from a child's device; "offline" claim untrue on first paint) | Removed; system fonts with Devanagari fallbacks; zero external requests, enforced by a build gate |
| 3 | Backups and storage trusted after a shallow check (bad types crash the app; packs inside a backup skipped validation) | Field-by-field `sanitize()`; packs re-validated on every load; 3 MB limit |
| 4 | PIN: unsalted single SHA-256, plain-text fallback `p:1234`, unlimited tries | Salted + stretched hash, attempt limiter, old formats upgraded on next unlock |
| 5 | Parent area stayed open after leaving it | Locks on leaving and after 5 idle minutes |
| 6 | Restore / erase replaced everything in one tap | Two-tap confirm + one undo copy |
| 7 | Corrupt storage silently replaced by an empty state | Copy kept under `.damaged`, parent is told |
| 8 | Service worker cached any GET incl. other origins; cache key only by version | Same-origin only, content-hashed cache |
| 9 | esbuild advisory (moderate), version range | Exact patched version, `npm audit` in CI |
| 10 | Test hook `window.KS_TODAY` shipped in production | Removed |

## Functional
| # | Flaw | Fix |
|---|---|---|
| 11 | "Stop" froze the screen when already on Home (session not cleared) | Session cleared before navigating |
| 12 | Lesson screens had no Stop button | Added |
| 13 | Mission marked done only on the finish screen; closing after the last answer lost the day and the streak | Counted per answer (`mq`) |
| 14 | Free practice reduced the mission, leaving "0 questions" with a Start button | Mission progress tracked separately |
| 15 | A stuck skill repeated for the whole session | Set aside for the session after 3 misses; parent flagged |
| 16 | Changing class in a later year double-advanced it | Class change re-anchors the session year; selector shows today's class |
| 17 | Keyboard shortcuts fired on Ctrl+C / Alt+B | Modifiers ignored |
| 18 | Blank answer could be read as option A (`Number('') === 0`) | Strict parsing |
| 19 | Web manifest had only an SVG icon (Android will not offer install) | 192/512 PNG + maskable icons |
| 20 | Save failures (storage full) were silent | Warning with "save a backup now" |
| 21 | Two tabs overwrote each other | Tab reloads the newer copy |
| 22 | Any runtime error left a blank screen | Error screen with Reload; progress already saved |
| 23 | `validate-pack` script pointed at a missing file | Added |
| 24 | Setup label fixed to "2026–27" | Generic |

## Architecture / process
- Untrusted-input boundary is now explicit: `store.sanitize`, `packs.validatePack`, `check.check`.
- Pure core (`src/core`, no DOM) with 24 unit tests; browser test `tools/e2e.mjs` (12 flows incl. offline PWA); release gate `npm run check`; CI + Pages workflows.
- **Not changed:** `src/ui/app.js` is still one ~590-line module with module-level state. It is covered by the browser test; splitting it into views is the next refactor, not a release blocker.

## Still open
- Content is AI-written; facts are not checked against NCERT books. Two items corrected in this pass.
- Voice not heard on a real phone. No real-device install test (Chromium only).
- GitHub Actions are pinned by major tag, not commit SHA.
