// Mastery model: Bayesian Knowledge Tracing per skill + spaced review.
// A skill is mastered only when the BKT estimate is high, enough graded answers exist,
// the last two were right, and the predicted retention today is strong — so one lucky
// guess never counts, and a single bad day does not erase weeks of work.
//
// The maths lives in bkt.js. This file owns the stored shape, the mastery gate, the
// review schedule and the events the UI reacts to.
import { BKT, posterior as bktPosterior, transition, paramsOf, adapt, clamp, retention } from './bkt.js';

export const P = {
  init: BKT.prior, fast: BKT.fastPrior,   // prior; "fast" for skills from earlier classes
  learn: BKT.learn, slip: BKT.slip, thr: BKT.thr,
  minN: 4, minNFast: 2, stuck: 3,
  gaps: [2, 5, 12, 30, 75, 180],          // days between reviews once mastered
  keepRetention: 0.8,                     // mastery requires this predicted recall today
};

export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return iso(new Date(y, m - 1, d + n));
}
export const daysBetween = (a, b) => {
  const t = d => Date.UTC(...d.split('-').map((x, i) => (i === 1 ? x - 1 : +x)));
  return Math.max(0, Math.round((t(b) - t(a)) / 864e5));
};

export const newSkillState = fast => ({
  p: fast ? P.fast : P.init, n: 0, c: 0, run: 0, bad: 0, m: false, due: null, st: 0,
  fast: !!fast, help: false, seen: false, msc: {}, ms: 0, last: null,
  bp: null,                       // personal {l: learn, s: slip}, filled as evidence arrives
  scn: 0, scl: 0,                 // scaffold-assisted answers and the deepest rung used
  hn: 0, he: 0, ln: 0, lc: 0,     // adaptation counters: high-mastery attempts/errors, low-mastery attempts/right
});

// The recall check uses the classroom slip/guess, not the personal ones: a child who had a
// shaky patch must still be able to earn mastery back. Personal slip affects how much each
// new answer moves the estimate, never whether mastery is reachable.
export const masteryReady = s => !!s && s.p >= P.thr
  && s.n >= (s.fast ? P.minNFast : P.minN) && s.run >= 2
  && retention(s.p, 0) >= P.keepRetention;

// Mutates s. Returns the events this answer caused.
// opts.weight  evidence weight 0..1 (scaffolded answers carry less)
// opts.silent  practice with support: moves the estimate, but never awards mastery,
//              never counts as graded evidence, and never triggers "stuck"
// opts.level   scaffold rung 1..4, stored for the parent view
export function update(s, ok, guess, day, trap, ms, opts = {}) {
  const weight = opts.weight == null ? 1 : clamp(Number(opts.weight), 0, 1);
  const silent = opts.silent === true;
  const pBefore = s.p;
  const { learn, slip } = paramsOf(s);
  // Weight 0 means "no evidence": the answer is recorded but the estimate must not move.
  if (weight > 0) s.p = clamp(transition(bktPosterior(pBefore, ok, { slip, guess, weight }), learn), 0.01, 0.995);
  s.last = day;
  if (ms > 0) s.ms = s.ms ? Math.round(s.ms * 0.7 + ms * 0.3) : Math.round(ms);
  const ev = [];
  if (!ok && trap) s.msc[trap] = (s.msc[trap] || 0) + 1; // common mistakes are tracked either way

  if (silent) {
    s.scn = Math.min(1e6, (s.scn || 0) + 1);
    s.scl = Math.max(s.scl || 0, clamp(Math.round(opts.level || 1), 1, 4));
    return ev;
  }

  s.n++; s.c += ok ? 1 : 0;
  adapt(s, ok, pBefore);
  if (ok) { s.run++; s.bad = 0; } else { s.run = 0; s.bad++; }

  if (s.m) {
    if (ok) {
      if (!s.due || s.due <= day) { // early practice never stretches the spacing
        s.st = Math.min(s.st + 1, P.gaps.length - 1);
        s.due = addDays(day, P.gaps[s.st]);
      }
      ev.push('review_ok');
    } else {
      s.m = false; s.due = null; s.st = 0; s.fast = false;
      s.p = Math.min(s.p, 0.5);
      ev.push('relearn');
    }
  } else if (ok && masteryReady(s)) {
    s.m = true; s.st = 0; s.due = addDays(day, P.gaps[0]); s.help = false; s.mst = day;
    ev.push('mastered');
  }
  if (!ok && s.bad >= P.stuck) { s.help = true; s.bad = 0; s.seen = false; ev.push('stuck'); } // the UI moves on and tells the parent
  return ev;
}

const fact = n => (n <= 1 ? 1 : n * fact(n - 1));
export const guessRate = q => (q.kind === 'mcq' ? 1 / q.options.length : q.kind === 'order' || q.kind === 'match' ? Math.max(0.02, 1 / fact(q.answer.length)) : 0.02);
export { retention };
