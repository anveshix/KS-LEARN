// Planner: which class the learner is in today, what is unlocked, what is due,
// and the day's mission. The class advances by itself every April (2026 -> 2030).
import { newSkillState } from './mastery.js';

export const STRANDS = ['m', 'e', 'h', 's', 'l', 'c', 'g'];
export const academicYear = d => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);
export const classNow = (profile, date) => Math.min(12, profile.cls + Math.max(0, academicYear(date) - profile.ay0));

export function ensureState(skills, st, profile, date) {
  const cls = classNow(profile, date);
  for (const sk of skills) if (!st[sk.id]) st[sk.id] = newSkillState(sk.grade <= cls - 2);
  return st;
}
export const unlocked = (sk, st) => sk.pre.every(id => st[id] && st[id].m);

// Unmastered skills the learner may work on now, easiest class first.
// Nothing above the current class is offered until the current class is done;
// after that there is no ceiling.
export function frontier(skills, st, strand, cls) {
  const open = skills.filter(sk => sk.strand === strand && st[sk.id] && !st[sk.id].m && unlocked(sk, st));
  const within = open.filter(sk => sk.grade <= cls);
  const list = within.length ? within : open;
  return list.slice().sort((a, b) => a.grade - b.grade || skills.indexOf(a) - skills.indexOf(b));
}
export const dueReviews = (skills, st, day) =>
  skills.filter(sk => st[sk.id] && st[sk.id].m && st[sk.id].due && st[sk.id].due <= day).sort((a, b) => (st[a.id].due < st[b.id].due ? -1 : 1));

const dayIndex = day => Math.floor(Date.UTC(...day.split('-').map((x, i) => (i === 1 ? x - 1 : +x))) / 864e5);

// Mission = [{ kind:'review', skill } | { kind:'learn', strand }], one entry per question.
export function buildMission(skills, st, profile, date, day) {
  const cls = classNow(profile, date);
  const on = s => !(profile.off || []).includes(s);
  const has = s => on(s) && frontier(skills, st, s, cls).length > 0;
  const total = profile.dailyQ || 18;
  const di = dayIndex(day);
  // Mixed revision: when nothing is new or due (a strong learner has finished the available skills),
  // practise already-mastered skills, oldest first, so there is always a mission and the streak is real.
  const mixed = () => skills.filter(sk => on(sk.strand) && st[sk.id]?.m).sort((a, b) => (st[a.id].last || '').localeCompare(st[b.id].last || '') || a.id.localeCompare(b.id))
    .slice(0, Math.max(4, Math.round(total / 3))).flatMap((sk, k, a) => Array.from({ length: Math.ceil(total / a.length) }, () => ({ kind: 'review', skill: sk.id, mixed: true }))).slice(0, total);
  const lang = ['e', 'h'].filter(has);
  const rot = ['l', 's', 'c', 'g'].filter(has);
  const picks = [];
  if (has('m')) picks.push('m');
  if (lang.length) picks.push(lang[di % lang.length]);
  if (rot.length) picks.push(rot[di % rot.length]);
  if (rot.length > 1 && total >= 24) picks.push(rot[(di + 1) % rot.length]);
  const due = dueReviews(skills, st, day).filter(sk => on(sk.strand));
  const nReview = Math.min(due.length, Math.max(2, Math.round(total * 0.25)));
  const plan = due.slice(0, nReview).map(sk => ({ kind: 'review', skill: sk.id }));
  let left = total - plan.length;
  if (!picks.length) { const p = plan.concat(due.slice(nReview, nReview + left).map(sk => ({ kind: 'review', skill: sk.id }))); return p.length ? p : mixed(); }
  const weights = picks.map((s, i) => (s === 'm' ? 1.4 : 1));
  const wsum = weights.reduce((a, b) => a + b, 0);
  picks.forEach((s, i) => {
    const n = i === picks.length - 1 ? left : Math.max(2, Math.round((total - nReview) * weights[i] / wsum));
    for (let k = 0; k < Math.min(n, left); k++) plan.push({ kind: 'learn', strand: s });
    left -= Math.min(n, left);
  });
  return plan;
}

export function strandProgress(skills, st, strand, cls) {
  const all = skills.filter(sk => sk.strand === strand);
  const upto = all.filter(sk => sk.grade <= cls);
  return {
    total: all.length, mastered: all.filter(sk => st[sk.id]?.m).length,
    classTotal: upto.length, classMastered: upto.filter(sk => st[sk.id]?.m).length,
    ahead: all.filter(sk => sk.grade > cls && st[sk.id]?.m).length,
  };
}
