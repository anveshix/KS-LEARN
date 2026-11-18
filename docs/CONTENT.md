# Content coverage: what this release can honestly teach

KS-LEARN's marketing says “class 3–9”. The curriculum does not yet support that sentence
evenly, so the app now makes a narrower, enforced claim and names the gap instead of papering
over it.

## The gate

`tools/content-gate.mjs` runs in `npm run check` and in CI. It:

1. publishes the minimum a class must meet before the app may offer it;
2. measures the real curriculum against that minimum;
3. fails the build if a declared class stops meeting it, or if an undeclared class starts
   meeting it (which means the declaration is stale).

| Minimum per class | Value |
|---|---|
| Skills | 8 |
| Maths skills | 3 |
| Language skills (English or Hindi) | 1 |
| Distinct strands represented | 3 |

Why these numbers: eight skills is roughly two short missions with variety; three maths skills
keep the daily mixed mission numerically meaningful; one language skill stops a “bilingual”
class from being maths-only; three strands preserve the multidisciplinary intent of NEP 2020.

## Measured coverage (this release)

| Class | Skills | Strands | Maths | Language | Supported |
|---|---:|---:|---:|---:|---|
| 3 | 4 | 1 | 4 | 0 | **No** — maths only |
| 4 | 28 | 8 | 6 | 12 | Yes |
| 5 | 54 | 8 | 20 | 16 | Yes |
| 6 | 29 | 8 | 11 | 3 | Yes |
| 7 | 13 | 5 | 6 | 1 | Yes |
| 8 | 3 | 2 | 2 | 0 | **No** |
| 9–12 | 0 | 0 | 0 | 0 | **No** |

`SUPPORTED_CLASSES = [4, 5, 6, 7]` in `src/core/planner.js` is the single source of truth.
The setup form, the parent settings and the gate all read it. The class list no longer offers
9–12, which never had content.

## What a child in another class sees

- **Class 3:** not offered in this release, because it has only four maths skills and no
  language content. Those four skills remain in the graph as prerequisites for class 4. An
  existing class-3 profile (or a child who advances into an empty class) sees the
  “content in progress” card, which names the missing strands and points to content packs;
  nothing above the class is served silently.
- **Class 8+:** the profile can advance into class 8 after a school year, so the same
  “content in progress” card appears and the mission builder uses only what exists.
- **Above-class work** is never selected invisibly. When a class is exhausted, the planner may
  return an explicit `ahead` step, and every question card labels it “one class ahead”.

## Adding content

Two routes:

1. **In the repository** — add skills to `src/content/`, run `npm run check`, then update the
   constants in `tools/content-gate.mjs` (`MINIMA`) and `SUPPORTED_CLASSES` only when the
   curriculum genuinely meets them. The gate will fail until both agree.
2. **By pack** — a parent or teacher imports a validated pack (`src/core/packs.js`). Packs are
   checked item by item, are capped at 300 skills, and never override an existing id.

## What still needs authoring

In priority order for NEP 2020:

1. **Class 3 language and EVS** (foundational literacy and numeracy is the NEP priority; the
   class currently has four maths skills and nothing else, so it cannot be offered at all).
2. **Class 8** — one full set across maths, science, language and social science.
3. **Class 7 English and world** — currently one Hindi skill and no English.
4. **Class 9** — nothing exists; do not advertise it.
5. **Item formats** — speaking, listening, drawing and performance tasks, not only MCQ,
   numeric, fraction, ordering and matching.

Until then the honest sentence is: **“Class 4–7, with class 3 and 8 in progress.”**
