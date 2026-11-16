// Mastery model: Bayesian Knowledge Tracing per skill + spaced review.
// A skill is mastered only when the estimate is high, enough answers exist and
// the latest answers were right, so one lucky guess never counts.
export const P = {
  init: 0.2, fast: 0.6,          // prior; "fast" for skills from earlier classes (quick foundation check)
  learn: 0.12, slip: 0.1, thr: 0.95,
  minN: 4, minNFast: 2, stuck: 3,
  gaps: [2, 5, 12, 30, 75, 180],  // days between reviews once mastered
};

export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return iso(new Date(y, m - 1, d + n));
}
export const newSkillState = fast => ({ p: fast ? P.fast : P.init, n: 0, c: 0, run: 0, bad: 0, m: false, due: null, st: 0, fast: !!fast, help: false, seen: false, msc: {}, ms: 0, last: null });

export function posterior(p, ok, guess) {
  return ok ? p * (1 - P.slip) / (p * (1 - P.slip) + (1 - p) * guess)
            : p * P.slip / (p * P.slip + (1 - p) * (1 - guess));
}

// Mutates s. Returns the events this answer caused.
export function update(s, ok, guess, day, trap, ms) {
  const post = posterior(s.p, ok, guess);
  s.p = Math.min(0.995, Math.max(0.01, post + (1 - post) * P.learn));
  s.n++; s.c += ok ? 1 : 0; s.last = day;
  if (ms > 0) s.ms = s.ms ? Math.round(s.ms * 0.7 + ms * 0.3) : Math.round(ms);
  const ev = [];
  if (ok) { s.run++; s.bad = 0; } else { s.run = 0; s.bad++; if (trap) s.msc[trap] = (s.msc[trap] || 0) + 1; }
  if (s.m) {
    if (ok) { if (!s.due || s.due <= day) { s.st = Math.min(s.st + 1, P.gaps.length - 1); s.due = addDays(day, P.gaps[s.st]); } ev.push('review_ok'); } // early practice never stretches the spacing
    else { s.m = false; s.due = null; s.st = 0; s.fast = false; s.p = Math.min(s.p, 0.5); ev.push('relearn'); }
  } else if (ok && s.p >= P.thr && s.n >= (s.fast ? P.minNFast : P.minN) && s.run >= 2) {
    s.m = true; s.st = 0; s.due = addDays(day, P.gaps[0]); s.help = false; s.mst = day; ev.push('mastered');
  }
  if (!ok && s.bad >= P.stuck) { s.help = true; s.bad = 0; s.seen = false; ev.push('stuck'); }
  return ev;
}
export const guessRate = q => (q.kind === 'mcq' ? 1 / q.options.length : 0.02);
