# The AI-era coach: a local-first pedagogical agent

**Status:** design blueprint for Phase 6C. Not yet implemented. This document defines what
“dedicated personalised coach” should mean in KS-LEARN, what it must refuse to do, and how to
build and evaluate it without turning a child's learning into a chatbot transcript.

---

## 1. The one-sentence definition

> A coach is a **deterministic, local pedagogical agent** that helps one child choose a goal,
> plan a small action, notice what helped, and carry the learning into a new situation — using
> evidence the app already has, never inventing facts, and never pretending to be a person.

It is **not**:

- a general-purpose chatbot;
- an “AI tutor” that explains any topic (it can only explain content that exists locally);
- a therapist, counsellor, or safeguarding decision-maker;
- a replacement for a teacher or parent;
- a source of grades, ranks, predictions, or diagnoses;
- a diary of a child's feelings or free text.

The first version needs **no language model at all**. That is a feature: it runs on a ₹8,000
Android phone, offline, in under 1 MB, with no new permission.

---

## 2. Why a coach at all?

The current app already has an adaptive engine, but it answers *what to practise next*. It does
not help the child answer:

- “What am I trying to get better at this week?”
- “What will I do when this gets hard?”
- “Which strategy actually helped?”
- “Where else could I use this?”
- “When should I stop and ask a person?”

Those are **self-regulated learning** skills, and they are the strongest predictor of whether
practice becomes independence. They are also what NEP 2020 calls self-assessment, critical
thinking and life skills, and what the OECD calls student agency.

The coach's job is to make the existing evidence **legible to the child** and turn it into one
small, chosen action. It should feel like a calm weekly conversation with a good mentor, not a
dashboard.

---

## 3. Evidence base

| Principle | Source | Design consequence |
|---|---|---|
| Self-regulated learning: forethought → performance → self-reflection | Zimmerman | The weekly cycle has exactly these three phases; no endless chat. |
| Goal setting and implementation intentions | Locke & Latham; Gollwitzer | The child chooses one of three goals and writes a “when–then” plan in their own words (kept in memory only). |
| Feedback that moves learning forward | Hattie & Timperley | Every coach turn answers: where am I going, how am I going, where to next. One strength, one goal, one action. |
| Metacognition and elaborative interrogation | Dunlosky et al. | Prompts are “why”, “how did you know”, “what would change your answer”, not “try harder”. |
| Desirable difficulties, spacing, retrieval | Bjork; Roediger & Karpicke | Coach schedules delayed checks and mixed practice; it never celebrates massed repetition as mastery. |
| Student agency and co-agency | OECD Learning Compass 2030 | Three goal options, child chooses; coach can be disagreed with. |
| Human-centred AI and ethics | UNESCO AI Competency Framework for Students (2024) | AI literacy includes ethics, data, evaluation, and human oversight, not only tool use. |
| Child rights and safeguarding | UNCRC; DPDP Act 2023 | No open-ended chat, no free-text storage, no anthropomorphic dependency, clear escalation to a trusted adult. |

---

## 4. The five-minute weekly cycle

The coach opens once a week (and briefly after a long absence). It is a **state machine**, not a
free chat. Every screen has a “not now” exit and the child can stop at any point.

```
greet → notice → choose goal → plan action → commit → (week passes) → check-in → reflect → close
```

### 4.1 `greet` (15 s)

- Welcome back without shame: “Good to see you. It has been 4 days; we can start small.”
- Never: “You broke your streak”, “You are behind”, “Your friend finished”.
- Show one local fact: “You have 3 reviews waiting, and your last story was about a purse.”

### 4.2 `notice` (45 s)

The coach reads local evidence and offers **one strength + one opportunity**, both evidence-based
and non-comparative:

> “You are getting faster at equivalent fractions — three in a row without help. The place where
> a hint still helps is word problems. Which feels truer: ‘fractions are getting easier’ or
> ‘word problems still feel slippery’?”

The child can disagree. Disagreement is data for the child, not a correction to win.

### 4.3 `choose goal` (45 s)

Exactly three options, generated from the planner, each with a reason and a size:

1. **Repair a foundation** — one prerequisite that is blocking three skills.
2. **Deepen a strength** — a transfer or explanation task in something already secure.
3. **Explore** — one lab, story or AI-literacy quest, if the week has been drill-heavy.

The child picks. No option is “the right answer”. The coach explains the trade-off in one line.

### 4.4 `plan action` (60 s)

The child chooses a **when–then** plan from templates:

- “When I sit down after dinner, then I will do 8 questions before the story.”
- “When I get stuck on a word problem, then I will draw the quantities before choosing an
  operation.”
- “When I finish, then I will explain one answer to Amma.”

The plan is stored as a **template id + day + time bucket**, never as free text.

### 4.5 `commit` (15 s)

One sentence, read aloud if the child wants: “This week I am working on ______. I will know it
worked when ______.” The coach repeats it back exactly, without adding a promise or a reward.

### 4.6 `check-in` (2 min, later)

- “Did the plan happen? Yes / partly / not yet.” No penalty.
- If partly: “What got in the way?” → choices: time, confusion, phone, mood, someone needed me,
  other. No free text.
- “What helped?” → choices: hint, drawing, asking someone, trying again, a break, nothing yet.
- The coach adjusts the next plan; it does not lecture.

### 4.7 `reflect` (1 min)

One metacognitive question, chosen by rule:

- after success: “What did you do that you want to repeat?”
- after struggle: “What would you tell a friend who got stuck here?”
- after a long gap: “What made it easy to come back today?”
- after a transfer task: “Where else could this idea work?”

The child picks from 3–4 options or says “I don't know” (valid). No free text.

### 4.8 `close` (15 s)

One sentence, no confetti: “You chose a goal, made a plan, and noticed what helped. That is the
part that makes practice work.” Optionally one star, capped at one per week.

---

## 5. Engine design

### 5.1 Shape

```js
// src/core/coach.js — pure, no DOM, no network, no Date.now inside decisions
export function coachWeek(state, day, now = new Date()) -> {
  phase: 'invite' | 'notice' | 'goal' | 'plan' | 'commit' | 'checkin' | 'reflect' | 'done',
  evidence: { strength, opportunity, dueCount, gapDays, load, flags },
  goals: [ { id, kind, title, why, size, skillId? } ],   // exactly 3
  actionTemplates: [ { id, when, then, minutes } ],      // 3-4
  reflection: { id, q, options: [{ id, label }] },
  safety: { escalate: false, reason: null },
}
export function applyCoachChoice(state, { goalId, templateId, reflectionId, checkin }) -> events
```

Rules:

- **Pure functions** for planning, so the entire coach can be unit-tested without a DOM.
- **Deterministic** for a given state/day: the same child on the same day sees the same three
  goals. Randomness only in optional wording, seeded by day.
- **No generated facts.** Every claim in `notice` must come from a named field (`skills[id].p`,
  `days[day].q`, `wellbeing.activeMs`, `stories[id].done`) and be traceable in a debug view.
- **No free text.** All child input is a choice; the one exception is the when–then plan, which
  is assembled from templates.
- **No persistence of the conversation.** Persist only the chosen goal id, template id,
  check-in category and reflection option id.

### 5.2 Evidence selectors

| Selector | Source | Use |
|---|---|---|
| `strength` | highest `p` with `n ≥ 3` and recent success | “you are getting steadier at …” |
| `opportunity` | lowest `p` among unlocked skills with due review or `bad ≥ 2` | “the place a hint still helps is …” |
| `load` | `dueReviews + frontier`, capped | choose goal size, avoid overload |
| `gapDays` | last `days[*].done` | return-after-absence tone |
| `helpRate` | `assisted / (assisted + graded)` | if high, coach teaches help-seeking, not independence slogans |
| `wellbeing` | `activeMs`, `breaksToday` | if due, offer a break before the plan |
| `quest` | chosen quest, progress | align goal with the child's own quest |
| `stories` | done/reflections count | offer a story goal after drill-heavy weeks |
| `traps` | `msc` counts | choose a transfer task targeting the misconception |

### 5.3 Goal generation

Three goals, always one from each family, in a stable order:

1. **Repair** — a prerequisite of a blocked skill; size “one 8-question set”.
2. **Deepen** — a mastered skill; size “explain one answer / one mixed set”.
3. **Explore** — lab, story, or AI-literacy task; size “one 10-minute session”.

If a family has no candidate, substitute a different concrete goal and say why. Never show
“practise more” as a goal.

### 5.4 Tone rules (machine-enforced)

A lint test runs every coach string through a banned-phrase list:

- no “behind”, “slow”, “weak”, “fail”, “lazy”, “smart”, “gifted”, “streak”, “don't break”;
- no comparison with another child, class, or “most children”;
- no future prediction (“you will…”, “you won't…”);
- no diagnosis (“you have…”, “this means you are…”);
- no overpromise (“mastered forever”, “you know this now”);
- no anthropomorphism (“I missed you”, “I am proud of you”, “I will always be here”);
- no reward threat (“you will lose…”).

Every coach turn must contain at most **one question**, and the child must always have a
visible “I don't know / not now” option.

### 5.5 Safety branch

If the child selects “someone needed me”, “I felt unsafe”, “I was sad”, or “I was scared” in a
check-in, the coach does **not** counsel. It shows a calm card:

> “Thank you for telling me. This is bigger than practice. Please show this screen to a grown-up
> you trust — a parent, a teacher, or the adult who looks after you. You do not have to handle it
> alone.”

It offers a “show my parent” button that opens the parent area and flags “child asked for a
grown-up” (no content). In a school build, the same flag goes to the designated safeguarding
lead, never to a public dashboard.

The coach never asks for details, never stores a disclosure, and never claims confidentiality.

---

## 6. Data model (minimal)

```js
coach: {
  week: '2026-11-16',          // ISO week start
  goalId: 'repair:m.frac_eq',  // chosen goal
  templateId: 'after-dinner-8',
  checkin: 'partly',           // yes | partly | not_yet
  blocker: 'time',             // time | confusion | phone | mood | someone | other
  helper: 'drawing',           // hint | drawing | person | retry | break | nothing
  reflectionId: 'repeat',
  lastAt: '2026-11-17',        // day only
  doneWeeks: 4,
}
```

Not stored: the child's words, feelings, family details, safeguarding disclosure, chat history,
the coach's generated sentences. `sanitize()` whitelists the fields above and clamps counts.
`coach` is included in the DPDP notice as `teach`/`memory` and in exports only if the guardian
chooses “full backup”.

**Why so little?** Because the most sensitive thing in a child's edtech app is not their maths
score; it is their self-description. The coach can be effective without keeping it.

---

## 7. Bilingual script examples

All strings use `L(en, hi)`; the default follows the guardian's language choice, not `bi`.

**Greet (return after 4 days)**
> EN: “Good to see you. Four days is fine — we start with one small thing.”
> HI: “तुम्हें देखकर अच्छा लगा। चार दिन ठीक हैं — हम एक छोटी चीज़ से शुरू करते हैं।”

**Notice (strength + opportunity)**
> EN: “You answered three equivalent-fraction questions without help. Word problems still open
> a hint. Which feels truer?”
> HI: “तुमने तुल्य भिन्न के तीन प्रश्न बिना मदद के किए। इबारती प्रश्नों में अभी संकेत खुलता है।
> कौन-सी बात सही लगती है?”

**Goal choice**
> “Repair the fraction idea that word problems need” / “Explain one fraction answer to someone”
> / “Try the balance lab and see what changes”

**Plan**
> “When I sit down after dinner, then I will do 8 questions before the story.”

**Check-in**
> “Did the plan happen?” → Yes / Partly / Not yet.
> “What got in the way?” → Time / I got confused / Phone / Mood / Someone needed me / Other.

**Reflect**
> “What would you tell a friend who got stuck here?” → “Draw it” / “Ask for one hint, not the
> answer” / “Take a break, then try” / “I don't know yet.”

**Close**
> “You chose a goal and made a plan. That is the part that makes practice work.”

The Hindi is not a literal translation; it is written for a child, reviewed by a Hindi-medium
teacher. No machine translation ships without review.

---

## 8. AI-era skills: a progression, not two MCQs

The coach is the delivery mechanism for a new **AI-literacy strand** (`a.`), separate from
coding (`c.`), because AI literacy is not only programming.

### Classes 3–5: noticing and safety

- A machine follows instructions; it does not “know” things.
- Data are examples; more/better examples change what a model does.
- AI can be wrong and can sound confident.
- Private information is not for any app or chatbot.
- Ask a trusted adult before using a new tool.
- Pattern, sequence, sorting, “what would happen if…”.
- Classroom project: “teach a partner a rule using only examples” (unplugged).

### Classes 6–8: how it works and when to trust it

- Training data, labels, features; a model learns correlations, not truth.
- Bias: who is in the data, who is missing, what goes wrong.
- Probability and uncertainty; a confident answer is not evidence.
- Prompting as **specifying a task** (goal, context, constraints, check).
- Verification: primary source, second source, ask an expert.
- Copyright, deepfakes, impersonation, privacy.
- Human-in-the-loop: decisions that must not be automated.
- Project: build a small rule/classifier on paper or in code; test it on held-out examples;
  document failures.

### Classes 9–12: systems, evaluation, responsibility

- Datasets, sampling, missing data, measurement error.
- Evaluation: accuracy, false positives/negatives, base rates; why one number is not enough.
- Model lifecycle: data → training → deployment → monitoring → retirement.
- Accountability, audit, redress; AI in hiring, policing, health, education.
- AI and labour; creation and authorship; environmental cost.
- Project: an AI policy brief for the school, with evidence and dissent.

Each level needs: 3–5 skills, one unplugged activity, one digital activity, one project, one
assessment rubric, and teacher notes. That is the minimum for a credible strand.

### The child's “AI use” policy (one card)

1. I use AI for a first draft or a question, not for a final answer I cannot explain.
2. I check facts in a source I trust.
3. I never paste a name, photo, address, phone number, or someone else's words.
4. I say when I used a tool.
5. If it feels wrong or scary, I stop and tell an adult.

---

## 9. Optional on-device language model (later, not now)

If the product later wants open-ended explanation, the constraints are non-negotiable:

- **Separate pack**, not the main bundle; 300–800 MB quantised model; explicit guardian opt-in;
  hash-verified; no network at runtime.
- **Retrieval-grounded**: answers only from the local curriculum and coach scripts; retrieval
  cites the skill id; refuse when no source.
- **No open-ended chat**: the model rewrites/expands a bounded coach move, it does not converse
  freely.
- **No memory of free text**: input is discarded after the turn; no child profile is built.
- **Evaluation**: 500 adversarial prompts for safety, hallucination, bias, and age-appropriateness;
  refusal rate; latency on a low-end device; battery/thermal impact; fallback to deterministic
  script.
- **Kill switch**: guardian can disable; app must be fully functional without it.
- **No anthropomorphism**: no name, no “I”, no emotional claims; label “a helper program”.

Given the devices in government schools, the deterministic coach is the product. The LLM is a
research add-on, not the foundation.

---

## 10. Teacher and parent layer

### Parent “coach card” (one page, printable/offline)

- This week's goal, in the child's words (template label).
- One strength with evidence (not a percentage alone).
- One next step and a 10-minute home activity.
- One question to ask: “Can you explain how you knew?”
- A “not a grade” note and no comparison.

### Teacher “coach brief” (school build)

- Group by goal family (repair/deepen/explore), not by rank.
- Error-pattern groups from `msc`, with a 10-minute mini-lesson for each.
- Students who asked for help or flagged a grown-up (safeguarding route, not public).
- Suggested pairings for peer explanation.
- No individual rank, no projected score, no “weak” list.

---

## 11. Implementation plan for this repository

### 11.1 New modules

| File | Responsibility |
|---|---|
| `src/core/coach.js` | evidence selectors, goal generation, tone lint, safety branch, pure state machine |
| `src/content/coach.js` | bilingual scripts, templates, reflection prompts (versioned) |
| `src/ui/coach-ui.js` | five screens, focus management, no free-text fields |
| `tests/coach.test.mjs` | determinism, exactly 3 goals, no banned phrases, safety branch, sanitisation, no free-text storage |
| `docs/COACH.md` | this document |

### 11.2 Integration points

- `src/core/store.js`: `coach` state + whitelist; schema 3.
- `src/ui/app.js`: route `coach`, home card, one weekly invite; no modal takeover.
- `src/core/planner.js`: export the goal candidates instead of duplicating selection logic.
- `src/core/rewards.js`: at most one coach star per week; no streak.
- `src/core/consent.js`: purpose text updated if coach stores anything new (it should not).
- `src/ui/labels.js`: route labels.

### 11.3 Acceptance criteria

1. The coach works with **no network** and with no LLM.
2. It always offers exactly three goals and a “not now” exit.
3. It never stores free text, a disclosure, or a chat transcript.
4. Every claim in `notice` is traceable to a state field; a debug view can show the field.
5. Every string passes the tone lint in EN and HI.
6. The safety branch appears for any distress choice and never counsels.
7. It is deterministic for the same state/day.
8. It works at 320 px, keyboard-only, screen reader, reduced motion.
9. It does not reduce the main bundle beyond budget; no new permission.
10. It is tested with a 12-week pilot, not just unit tests.

### 11.4 Suggested build order

1. **Coach core + tests** (no UI): pure functions, scripts, lint, safety.
2. **Parent card** (read-only): proves the evidence is legible before asking the child to use it.
3. **Child five-screen flow** behind a feature flag; 20 children in one school.
4. **Teacher brief** if school pilot continues.
5. **AI-literacy strand** (content) alongside, not after, the coach.
6. **Optional LLM** only after the deterministic coach shows learning gains.

---

## 12. Evaluation: how we will know it works

Do not measure “engagement”. Measure learning and independence:

| Outcome | Instrument | When |
|---|---|---|
| Durable retention | delayed mixed quiz on mastered skills | 30 days |
| Transfer | novel problem / explanation task | pre/post |
| Self-regulation | 8-item child self-report (planning, monitoring, help-seeking) | pre/post |
| Goal attainment | chosen goal achieved? (binary + evidence) | weekly |
| Help-seeking quality | hint before answer, ask for explanation not answer | log categories |
| Equity | gains by gender, language, device, class | analysis |
| Wellbeing | no increase in anxiety; break use; sleep/eye comfort self-report | pre/post |
| Safety | disclosures handled correctly; zero unsupported advice | audit |
| Cost | works on 2 GB RAM Android, < 1 s interaction latency offline | device test |

Design: a 12-week within-school quasi-experiment with two matched groups (coach + practice vs
practice only), pre-registered outcomes, parent consent, and an independent reviewer. If that
is not possible, at minimum a single-group pre/post with delayed retention and a qualitative
teacher review — and say so honestly.

---

## 13. What not to build

- A chat box on the home screen.
- A “mentor persona” with a name, feelings, or a promise to remember.
- AI-generated facts, explanations, or curriculum without local sources.
- A coach that compares, ranks, predicts, diagnoses, or shames.
- A coach that stores a child's feelings “to personalise better”.
- A streak or loss mechanic around coaching.
- A cloud sync that creates a children's database.
- An LLM in the main bundle.

The child should leave the coach thinking: **“I chose that, I did it, and I know what helped.”**
Not: **“The app knows me.”**

---

## 14. One-page summary for the product owner

- **Build the deterministic coach first.** It is cheap, offline, testable, and pedagogically
  defensible.
- **Fix the curriculum spine before the coach.** A coach cannot coach a missing Class 8 science
  syllabus.
- **Make mastery honest.** Delayed checks, no one-miss demotion, no “mastered” after four
  same-day answers.
- **Add the teacher layer.** NEP adoption is a teacher decision, not a parent decision.
- **Earn the AI claim.** A strand with data, evaluation, ethics and projects; not two MCQs.
- **Keep the privacy architecture.** It is the product's best differentiator; do not trade it
  for analytics or a chatbot.
