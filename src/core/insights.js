// Parent insights from the answer log: weekly summary, mistakes, roadmap and pace.
import { addDays, P } from './mastery.js';
import { classNow, academicYear } from './planner.js';

export function weekSummary(state, today) {
  const from = addDays(today, -6);
  const rows = state.log.filter(r => r.d >= from && r.d <= today);
  const graded = rows.filter(r => !r.a);            // accuracy is about first attempts, not answers after help
  const days = new Set(rows.map(r => r.d)).size;
  const n = graded.length, c = graded.filter(r => r.ok).length, ms = rows.reduce((a, r) => a + (r.ms || 0), 0);
  return { days, n, acc: n ? c / n : 0, avgSec: rows.length ? ms / rows.length / 1000 : 0, assisted: rows.length - graded.length };
}

export function topMistakes(state, today, limit = 5) {
  const from = addDays(today, -30), counts = {};
  for (const r of state.log) if (r.d >= from && r.m) counts[r.m] = (counts[r.m] || 0) + 1;
  return Object.entries(counts).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export const needsHelp = (skills, st) => skills.filter(sk => st[sk.id] && st[sk.id].help && !st[sk.id].m);

// Skills newly mastered per week, averaged over the last 4 weeks.
export function pace(st, today) {
  const from = addDays(today, -27);
  return Object.values(st).filter(s => s.m && s.mst && s.mst >= from && s.mst <= today).length / 4;
}

// Roadmap: one row per academic year from the start year to 2030-31.
export function roadmap(skills, st, profile, date, today) {
  const rows = [];
  const cur = classNow(profile, date);
  for (let ay = profile.ay0; ay <= 2030; ay++) {
    const cls = Math.min(12, profile.cls + (ay - profile.ay0));
    const list = skills.filter(sk => sk.grade === cls);
    const done = list.filter(sk => st[sk.id] && st[sk.id].m).length;
    rows.push({ ay, label: `${ay}–${String(ay + 1).slice(2)}`, cls, total: list.length, done, current: cls === cur && ay === academicYear(date) });
  }
  // Remaining work for the current class and an estimate at the current pace.
  const left = skills.filter(sk => sk.grade <= cur && !(st[sk.id] && st[sk.id].m)).length;
  const perWeek = pace(st, today);
  return { rows, left, perWeek, weeksLeft: perWeek > 0 ? Math.ceil(left / perWeek) : null };
}

// The learning model, in the small handful of numbers a parent can actually use.
// Nothing here is a grade: it is the same BKT estimate the planner uses, made legible.
export function learningModel(skills, st) {
  const seen = skills.filter(sk => st[sk.id] && st[sk.id].n > 0);
  const graded = seen.reduce((a, sk) => a + st[sk.id].n, 0);
  const assisted = seen.reduce((a, sk) => a + (st[sk.id].scn || 0), 0);
  const p = seen.length ? seen.reduce((a, sk) => a + st[sk.id].p, 0) / seen.length : 0;
  const strands = {};
  for (const sk of seen) {
    const r = strands[sk.strand] || (strands[sk.strand] = { n: 0, p: 0, stuck: 0, mastered: 0 });
    r.n++; r.p += st[sk.id].p; r.stuck += st[sk.id].help ? 1 : 0; r.mastered += st[sk.id].m ? 1 : 0;
  }
  return {
    seen: seen.length, graded, assisted, p,
    helpRate: assisted + graded ? assisted / (assisted + graded) : 0,
    near: seen.filter(sk => !st[sk.id].m && st[sk.id].p >= 0.6).length,
    stuck: seen.filter(sk => st[sk.id].help).length,
    deepest: seen.reduce((a, sk) => Math.max(a, st[sk.id].scl || 0), 0),
    personal: seen.filter(sk => st[sk.id].bp).length,
    strands: Object.entries(strands).map(([strand, r]) => ({ strand, n: r.n, p: r.p / r.n, stuck: r.stuck, mastered: r.mastered })),
  };
}

export const skillStatus = (sk, st, today, unlockedFn) => {
  const s = st[sk.id];
  if (!s) return 'notStarted';
  if (s.m) return s.due && s.due <= today ? 'dueNow' : 'mastered';
  if (!unlockedFn(sk, st)) return 'locked';
  return s.n > 0 ? 'learning' : 'notStarted';
};
export { P };
