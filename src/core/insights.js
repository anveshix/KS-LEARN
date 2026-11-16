// Parent insights from the answer log: weekly summary, mistakes, roadmap and pace.
import { addDays, P } from './mastery.js';
import { classNow, academicYear } from './planner.js';

export function weekSummary(state, today) {
  const from = addDays(today, -6);
  const rows = state.log.filter(r => r.d >= from && r.d <= today);
  const days = new Set(rows.map(r => r.d)).size;
  const n = rows.length, c = rows.filter(r => r.ok).length, ms = rows.reduce((a, r) => a + (r.ms || 0), 0);
  return { days, n, acc: n ? c / n : 0, avgSec: n ? ms / n / 1000 : 0 };
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

export const skillStatus = (sk, st, today, unlockedFn) => {
  const s = st[sk.id];
  if (!s) return 'notStarted';
  if (s.m) return s.due && s.due <= today ? 'dueNow' : 'mastered';
  if (!unlockedFn(sk, st)) return 'locked';
  return s.n > 0 ? 'learning' : 'notStarted';
};
export { P };
