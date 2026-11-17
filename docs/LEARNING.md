# The learning model (Phase 2)

Two pieces, both on the device: a Bayesian Knowledge Tracing (BKT) estimate per skill, and a
recursive scaffolding ladder that decides how much help a missed question opens.

Nothing here is a grade, a rank or a prediction about the child. It is a model of *what to
practise next*, kept deliberately legible so a parent can read it.

## 1. BKT, per skill

Every skill has its own state (`src/core/mastery.js`) and its own estimate `p = P(known)`.
The maths is in `src/core/bkt.js`, with no dependencies.

Four parameters, all visible in one object:

| Parameter | Meaning | Starting value |
|---|---|---|
| `L0` | prior probability the skill is already known | 0.20 (0.60 for a foundation skill from an earlier class) |
| `T` | chance of learning from one practice opportunity | 0.12 |
| `G` | chance of a correct answer without knowing it (guessing) | from the item: 1/options, 1/orderings, 0.02 otherwise |
| `S` | chance of a wrong answer despite knowing it (slip) | 0.10 |

One answer is a weighted Bayesian update followed by a learning transition:

```
posterior = P(mastered | answer)              # Bayes, in log-odds
p'        = posterior + (1 − posterior) · T   # learning happens on every opportunity
```

### Evidence is weighted

A correct answer after help is weaker evidence than a cold first attempt. The weight scales
the update in log-odds, so it is exactly a fraction of the evidence:

| Where the answer came from | Weight |
|---|---|
| First attempt, no help | 1.00 |
| A retry after a hint | 0.75 |
| A prerequisite warm-up | 0.50 |
| A worked example or smaller version | 0.50 / 0.45 |

Assisted answers are recorded in the log with `a: 1`, their weight `w` and their rung `lv`.
They move `p` and are counted in the parent view, but they are **not** graded evidence: they
do not increment `n`/`c`, cannot trigger mastery, and earn no stars.

### The parameters adapt

`T` and `S` start at the classroom values and move with this child's answers, shrunk towards
the prior so a short run cannot swing them:

* **Slip** rises when the model thought a skill was secure (`p ≥ 0.85`) and the child still
  missed: `(errors + 1.2) / (attempts + 15)`, bounded 0.03–0.25.
* **Learn rate** follows the graded success rate: `0.65 · 0.12 + 0.35 · (0.06 + 0.14 ·
  success)`, bounded 0.06–0.18.
* Counters live on the skill (`hn`, `he`, `ln`, `lc`) and are sanitised on load.
* New log rows carry `p0`, the estimate the answer was given at. `refit(states, log)` can
  re-derive the counters from the log alone — used after a restore, where an older save has
  no counters. The app calls it with `onlyMissing`, so a skill that already has personal
  values is left untouched; called without that flag it is a full, idempotent re-fit.

Guess stays item-level, because a four-option question really does give a 25% chance and a
numeric answer does not. The model is honest about that difference.

### Mastery and review

A skill is mastered only when **all** of these hold:

1. `p ≥ 0.95`;
2. enough graded evidence: 4 answers (2 for a foundation check);
3. the last two graded answers were right;
4. predicted recall today is at least 0.8 (using the classroom slip, so a shaky patch can
   never make mastery permanently unreachable).

Then it is scheduled for spaced review at 2, 5, 12, 30, 75 and 180 days. A miss at review
returns it to learning (`p` capped at 0.5) and keeps the forgotten skill's prerequisite due.
Early practice of a mastered skill never stretches its next review date.

### Forgetting

`retention(p, days)` predicts the chance of a correct answer after a gap, using an exponential
decay of 2% per day and the personal slip/guess. It is used for two decisions — ordering due
reviews (most forgotten first) and the mastery gate — but it **never rewrites the stored
estimate**. Time away is not treated as forgetting: only answers move `p`.

### Choosing what to practise

Within the current class, `rankFrontier` orders open skills by the zone of proximal
development (`priority` peaks around `p ≈ 0.55`), so a partly-learned skill comes before a
brand-new one or one that is nearly secure. The session then stays with that skill until it
is mastered or set aside after three misses in a row. Due reviews are ordered by predicted
retention, not just by date.

## 2. Recursive scaffolding

`src/core/scaffold.js` builds a short ladder for each miss:

```
hint  →  rung 1  →  rung 2  →  reveal  →  retry the original question
```

* **Hint** — the misconception-specific fix when the wrong option reveals one, otherwise the
  skill's tip.
* **Rung 1** — a prerequisite warm-up (when the prerequisite is shaky, `p < 0.5`) or a worked
  example from the same skill.
* **Rung 2** — the other of those, or a narrowed version of the same question (MCQ options cut
  to two) where the format allows it.
* **Reveal** — the answer and explanation, plainly, unscored.
* **Retry** — the original question, once, with the comeback reward if it is right.

Depth is capped at two scaffold questions (`MAX_DEPTH = 2`), then the reveal. A missed scaffold
opens the next rung; it never loops back to the same question.

### Fading

Support fades as the estimate rises (`buildLadder`):

| `p` | Support opened |
|---|---|
| ≥ 0.85 | hint + retry first; the ladder is one tap away if the child asks |
| 0.50–0.85 | hint + one rung + retry |
| < 0.50 | hint + the full ladder + retry |

Wrong answers are never painted red. The styles are `feedback try` (a soft amber outline) and
`feedback note`; the word "wrong" is not used.

### What the parent sees

The parent area gains one card, "How the learning model sees it":
average estimate across practised skills, skills practised, share of answers given after help,
and how many skills need a re-teach. It also states how many skills have their own fitted
slip/learning rates. Strand-level averages are available from `learningModel()` for future
views. No ranking, no comparison with other children.

## Files

| File | Responsibility |
|---|---|
| `src/core/bkt.js` | priors, log-odds update, transition, retention, ZPD priority, parameter fitting, log refit |
| `src/core/mastery.js` | stored skill shape, mastery gate, review schedule, events |
| `src/core/scaffold.js` | ladder construction, fading, evidence weights |
| `src/core/session.js` | graded answers, assisted practice, focus, logging |
| `src/core/planner.js` | ZPD ordering, retention-ordered reviews |
| `src/core/insights.js` | `learningModel()` and the existing parent summaries |
| `src/ui/app.js` | ladder UI, fading choice, parent card |

Tests: `tests/bkt.test.mjs`, `tests/scaffold.test.mjs`, plus the existing mastery and session
tests (`npm run check`).

## Privacy

The model is arithmetic on the device. No answer, estimate or parameter is transmitted;
there is no analytics call anywhere in the build (`tools/verify-dist.mjs` enforces it). The
answer log is part of the same local document as the rest of the progress, is included only
when a parent exports a backup, and is deleted by the account-authorised erase. The DPDP
purpose is `teach` (essential), described in [DPDP.md](DPDP.md).
