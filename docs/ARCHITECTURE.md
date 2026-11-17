# Architecture decisions (Super Grade phase 1)

The product brief for this upgrade named a modern stack: Tailwind, React Three Fiber,
Framer Motion, transformers.js. Some of those fit this repository and some fight its defining
property, so this note records what was chosen and why. Every later phase follows the same
rule: **the outcome is non-negotiable, the library is not.**

## What the repository already promises

1. `dist/ks-learn.html` is one file that opens from a USB stick with the network off.
2. Content-Security-Policy is `default-src 'none'` plus one hashed inline script and style —
   no CDN, no runtime fetch, no `unsafe-inline`.
3. `tools/verify-dist.mjs` fails the release if the script calls `fetch`, uses `eval` or
   `innerHTML`, loads an external host, or grows past 900 KB.
4. Zero runtime dependencies; one pinned build tool.

Any library that needs a network fetch, a worker/asset pipeline or a multi-megabyte payload
would delete promise 1 or 3. So the work is done in the existing vanilla module system
(`src/core`, `src/ui`) with the same CSP-safe DOM helper (`src/ui/dom.js`).

## Library by library

| Brief | Decision | Why, and what the learner gets |
|---|---|---|
| **Tailwind** | Design tokens instead: one `:root` scale for colour, spacing, radius, elevation and motion in `src/ui/style.css` | Tailwind is a compile-time tool, not a runtime capability. The bento grid, glass surfaces, dark mode, reduced-motion and reduced-transparency support are all delivered as tokens and small utilities. No build dependency, no purge step, identical result. |
| **Glassmorphism / bento** | Implemented (`--glass`, `backdrop-filter`, `.bento`, `.b-*`, responsive 4/2/1 columns) | Matches the brief and stays legible at 320 px and in dark mode. |
| **Framer Motion** | CSS keyframes with a shared `--ease`, plus `prefers-reduced-motion` opt-out | The dopamine micro-animations (star pop, confetti, rise, pulse) are already CSS. A React animation runtime would add ~40 KB and a renderer for no visual gain. |
| **React / React Three Fiber** | Not yet; Phase 4 | R3F needs React plus three.js (~600 KB minified), which alone exceeds the whole size budget. Phase 4 sandboxes will use a small hand-written WebGL/canvas renderer inside the same single file. If a fuller 3D experience is wanted, it ships as a separately hosted, lazily loaded sandbox — a deliberate, documented change to promise 1. |
| **transformers.js (voice)** | Phase 3, with an honest split | The library runs on WASM/WebGPU, but model weights are tens of megabytes and would have to be downloaded, defeating offline-first. Phase 3 therefore: (a) uses the browser's own speech engine where it is on-device, and (b) offers a downloadable voice pack for a separate build so transformers.js can run with **zero network at runtime** and no telemetry. Audio never leaves the device in either path. |
| **DPDP consent** | Fully implemented now (`src/core/consent.js`, `src/ui/consent-ui.js`) | See [DPDP.md](DPDP.md): purpose-by-purpose notice, guardian ceremony or issuer-signed token, digest-checked record, 12-month re-consent, withdrawal, erasure, grievance route. |
| **BKT / adaptive logic** | Phase 2 | The existing mastery model (evidence thresholds, spaced review, trap-driven remediation) is the seam BKT plugs into; no UI rewrite needed. |

## Rules for later phases

- A dependency is allowed only if it keeps the single-file, offline, CSP-hashed build under
  the size gate, or if it is confined to an explicitly optional build.
- No behavioural tracking, ever. Any feature that needs it is redesigned.
- Anything that touches a child's data gets a purpose in `POLICY` and a line in DPDP.md
  before it ships.
- Every phase ends with `npm run check` green: content audit, unit tests, build, dist verify.
