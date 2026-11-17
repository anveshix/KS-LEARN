# Architecture decisions (Super Grade)

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
| **Registration / login** | Device-local guardian account (PBKDF2 via WebCrypto + JS fallback), recovery code, 15-minute guardian session | A server-side email/password flow would break offline-first and create a children's database to protect, breach-notify and delete. The brief's privacy intent is met with a credential that never leaves the device; no OAuth, no email, no SMS. |
| **DPDP consent** | Fully implemented now (`src/core/consent.js`, `src/ui/consent-ui.js`) | See [DPDP.md](DPDP.md): purpose-by-purpose notice, guardian ceremony or issuer-signed token, digest-checked record, 12-month re-consent, withdrawal, erasure, grievance route. |
| **BKT / adaptive logic** | Implemented in Phase 2 (`src/core/bkt.js`, `mastery.js`, `scaffold.js`) | Per-skill Bayesian estimate with weighted evidence, per-learner slip/learn adaptation, retention for review ordering, and a fading Hint → Scaffold → Retry ladder. No dependency and no server; see [LEARNING.md](LEARNING.md). |

## Phase 2: the learning model

BKT runs in plain JavaScript, per skill, entirely on the device:

- a weighted log-odds posterior plus a learning transition (`p ← p + (1−p)·T`);
- `T` and `S` fitted per skill from this child's answers, with prior-mean shrinkage;
- item-level guess rate, so a four-option MCQ is not treated like a typed number;
- retention decay for scheduling reviews and checking mastery, never for rewriting state;
- a scaffolding ladder (prerequisite warm-up → worked/narrowed example → reveal → retry) whose
  depth fades as the estimate rises.

The answer log now carries the evidence weight, the ladder rung and the estimate each answer
was given at, which makes the model auditable and lets `refit()` rebuild adaptation from the
log after a restore. Full formulas, bounds and UI behaviour: [LEARNING.md](LEARNING.md).

## Rules for later phases

- A dependency is allowed only if it keeps the single-file, offline, CSP-hashed build under
  the size gate, or if it is confined to an explicitly optional build.
- No behavioural tracking, ever. Any feature that needs it is redesigned.
- Anything that touches a child's data gets a purpose in `POLICY` and a line in DPDP.md
  before it ships.
- Every phase ends with `npm run check` green: content audit, unit tests, build, dist verify.
