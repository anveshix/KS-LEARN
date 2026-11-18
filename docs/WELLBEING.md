# Wellbeing, daily quests and moral stories (Phase 5)

Phase 5 adds three screens that are deliberately **not** lessons, and one timer that is
deliberately **not** a lock:

1. **Panchakosha** — five kinds of pause, drawn as a five-petal wheel.
2. **Daily quest** — one goal the child chooses from three, with visible progress and a claim.
3. **Story paths** — moral dilemmas where choices branch, every ending has a lesson and a
   reflection, and nothing is marked.

All of it is bilingual, offline, and stored in the same single `localStorage` document as the
rest of the app. Nothing here changes mastery, gives marks or compares children.

## 1. Why these three belong in a learning app

A child who can notice a feeling, choose a goal, and imagine what a choice does to someone
else is in a better position to learn. The design borrows two old ideas and one modern one:

| Idea | How it is used | What it is **not** |
|---|---|---|
| **Panchakosha** (five sheaths) | Five ways to pause: body, breath, mind, understanding, joy | Not a ladder, not a score, not a religion test |
| **Self-determination theory** | Autonomy: the child picks one of three quests. Competence: a visible, reachable ring. Relatedness: stories about other people | Not a leaderboard, not a streak of obligation |
| **Moral dilemmas** | Small graphs where a choice has a consequence, and the ending asks one question | Not a quiz; no option is marked correct |

The other rule is negative and absolute: **no punishment for resting**. There is no streak to
break, no loss of stars, no locked lesson, and no record of how many days a child skipped.

## 2. The five layers

`src/core/wellbeing.js` holds the content and the timer. Each layer has a bilingual name, a
Sanskrit name, a one-line explanation, a prompt and its own interactive practice.

| id | Layer | Practice | Interaction | Counts as a full pause? |
|---|---|---|---|---|
| `anna` | Body | Move, stretch, drink water | Three steps ticked one by one; the button unlocks when all three are done | Yes — resets the timer |
| `prana` | Breath | 4 in, 2 hold, 6 out, three rounds | Animated circle, live phase word and countdown, three round dots | Yes — resets the timer |
| `mano` | Mind | Name a feeling | Five feeling chips, each with a specific reply | No — a moment, counted on the layer |
| `vijnana` | Wisdom | Look at a choice from outside | Four reflective options, no correct one | No |
| `ananda` | Joy | Notice one good thing | Six sparks and a reply that still counts on a hard day | No |

The wheel is CSS only: a conic-gradient for the five petals, repeating radial rings, five
buttons positioned by angle, and a centre hub. It needs no canvas, no SVG and no library, so it
works in the text-only fallback as well. Tapping a node replaces the panel below it; the panel
is the only thing that changes, so the wheel never jumps.

Every layer is **optional**. The screen never says "you must visit all five".

## 3. The screen-time rhythm

The timer measures **active use in seconds**, not wall-clock time:

- the app calls `wellbeing.tick()` about once a second;
- a gap of up to 60 s is credited, capped at 30 s per tick, so a sleeping tab cannot add an hour;
- a gap longer than 60 s is treated as rest and credits nothing;
- total active time per day is capped at 6 hours;
- a full pause (`noteBreak`) sets today's active time back to zero — the timer starts again,
  it never goes backwards as a penalty;
- a new calendar day resets today's clock and pause count but keeps the lifetime count, the
  chosen limit and the layer counts.

The default limit is **20 minutes**, chosen by the guardian from 15 / 20 / 30 in the parent
area (behind the PIN, like every other setting there). The child cannot change it.

When the limit is reached the app offers a pause sheet: **breathe**, **move**, or **a little
later**. "A little later" closes the sheet and asks again after two minutes. Learning is never
blocked. This is a nudge with an off-switch, which is the only version of a screen-time rule a
child can actually learn from.

The bar on the wellbeing screen updates every second while it is open; the rest of the app
only needs the heartbeat. The counter is persisted every 15 seconds so a reload does not lose
it, without writing to storage every second.

### The breathing animation

One clock drives everything, so the circle cannot drift away from the words or the reward:

- phases 4 s in / 2 s hold / 6 s out, three cycles = **36 s**;
- the circle scales 0.6 → 1.0 on the in-breath, holds, and 1.0 → 0.6 on the out-breath;
- the phase word and the remaining seconds come from the same elapsed time;
- `prefers-reduced-motion` removes the scaling and keeps the numbers;
- "Stop for now" cancels the loop and gives no reward, because a half-done pause is still a
  choice the child is allowed to make.

After a pause the sheet asks one question — *lighter / about the same / still heavy* — and
answers each honestly. The "still heavy" reply names a trusted adult; the app does not try to
counsel a child itself.

## 4. Daily quests

`src/core/quests.js` defines five quests, each tied to something the rest of the app already
records:

| Quest | Metric | Goal | Stars |
|---|---|---|---|
| Twelve true tries | questions answered today | 12 | 3 |
| Make one skill yours | skills mastered today (cold answers) | 1 | 5 |
| Turn a model | Curiosity Labs finished today | 1 | 3 |
| Walk through a choice | stories finished today | 1 | 3 |
| One calm round | pauses taken today | 1 | 2 |

`offerFor(day)` turns the calendar day into a number and slides a three-wide window over the
five quests, so:

- the same day always gives the same three offers (no reload roulette);
- the three are always distinct;
- consecutive days always move the window, and every quest appears within five days.

The child picks one. Switching is allowed **only before any progress**, so a started quest is
never taken away. If the day ends mid-quest, nothing is lost: tomorrow simply has new offers
and the total of finished quests is kept. Claiming pays stars once and increments that total;
the badges `quest1` and `quest5` read the total, not a streak.

The ring is a conic-gradient with a CSS custom property `--p`, so progress is a single number
in one place. The card also states, in plain language, exactly what fills that particular ring.

## 5. Story paths

`src/content/stories.js` contains four graphs (`story.purse`, `story.paratha`,
`story.cricket`, `story.message`), 8–10 nodes each, with 4–6 endings. A node either:

- has 2–3 bilingual choices pointing at other nodes, or
- is an ending with `end: true`, a bilingual **lesson**, and a **reflection** question with
  2–4 bilingual options.

`src/core/stories.js` validates all of that, plus reachability and acyclicity, and the test
suite walks **every path** through every story to prove each one terminates at an ending and
each ending is reachable. The runner lives in memory only. A finished run is discarded when
the route changes.

The screen shows the situation, the choices as large lettered buttons, and then the
consequence in the same voice. An ending shows the lesson, then one reflection question with a
note that no answer is marked and the answer is not saved. Choosing any option, or "I will
think about it quietly", leads to a closing card with **walk it again**, **another story** and
**back home**. The point is that a child can try the other branch and see a different
consequence, not that they find the "right" one.

## 6. What is stored

Only what a parent needs to see progress, never what a child chose or felt:

```js
wellbeing: {
  day,            // local calendar day of the counters
  activeMs,       // active seconds today, 0..6h
  limitMin,       // 15 | 20 | 30
  breaks,         // lifetime count of full pauses
  breaksToday,
  lastBreak,      // day only
  lastTick,       // live heartbeat for gap detection; always written as 0
  layers: { anna, prana, mano, vijnana, ananda }  // counts of moments
}
quests: { day, id, done, total }
stories: {
  'story.purse': { seen: '2026-11-17', done: '2026-11-17', reflections: 1 }
}
```

Deliberately absent: which story option was chosen, which feeling was named, which wisdom
option or joy spark was picked, how long the child looked at a screen in wall-clock terms, and
any timestamp finer than a day. The one sub-day value the app needs — the heartbeat used to
tell continuous use from a gap — is kept in memory and written to storage and backups as `0`. A hostile backup cannot reintroduce them: `sanitize()` rebuilds
each record from a whitelist, drops unknown story ids and unknown layer keys, clamps counters,
and discards `path`, `choice` or `virtue` fields if a modified file contains them.

## 7. Rewards

Six badges join the existing eighteen:

| Badge | Fires when |
|---|---|
| Calm Mind | first full pause |
| Seven Breaths | seven full pauses |
| Story Traveller | first story finished |
| Three Lamps | three stories finished |
| Own Compass | first quest claimed |
| Five Roads | five quests claimed |

They flow through the existing `settle()` path, so a badge is announced once, in the same
sheet as every other reward. Stories also give **2 stars on the first finish**; replaying is
free and pays nothing, so the incentive is curiosity, not repetition.

## 8. Parent view

The parent area (already behind the PIN and a 15-minute session) gains a **Daily rhythm** card:

- active minutes today, pauses today, pauses altogether;
- the 15 / 20 / 30 minute choice;
- how many moments were spent with each layer;
- a clear statement that the timer is a nudge, not a lock, and that the child can always
  continue learning.

No story answers, no feelings and no choices are shown, because they are not stored.

## 9. Accessibility and tone

- Every string is bilingual; the layer names come from the same `L()` helper as the rest of
  the app, so "English with Hindi terms" mode works.
- All interactive elements are real `<button>`s with 44 px+ targets; the wheel is a labelled
  group, the break sheet is a labelled modal dialog, and live replies use `aria-live`.
- Motion is optional: the breath circle, the story transition and the prompt orb all respect
  `prefers-reduced-motion`.
- No red "failure" state exists on any of these screens. The only warning colours are the
  ordinary timer bar when a pause is due.
- Text avoids grades, ranks and comparison. A quest is described as a direction, not a test.

## 10. Verification

- `tests/wellbeing.test.mjs` — content shape, the 4-2-6 clock, gap/cap semantics, day roll,
  break counting, sanitising, calm badges, storage shape and the no-timestamp rule (9 tests).
- `tests/quests.test.mjs` — offer determinism and coverage, pick/switch rules, claim once,
  metrics, day roll, hostile saves, badges (8 tests).
- `tests/stories.test.mjs` — graph validation, every path terminating, every ending with a
  lesson and reflection, runner refusals, progress, path-stripping, badges (7 tests).
- A jsdom drive opens the wheel, ticks the body steps, takes a body pause, opens and stops the
  breathing overlay, uses the feeling/wisdom/joy layers, picks and claims a quest, and walks a
  story to an ending and through its reflection (48 assertions).
- `npm run check` covers the content audit, the full unit suite, the build and the dist
  verifier (no `innerHTML`, no `fetch`, size gate).
