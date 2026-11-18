// Planner: which class the learner is in today, what is unlocked, what is due,
// and the day's mission. The class advances by itself every April (2026 -> 2030).
import { newSkillState } from './mastery.js';
import { priority, retention, paramsOf } from './bkt.js';

export const STRANDS = ['m', 'e', 'h', 's', 'l', 'c', 'g', 't'];
// Classes this release can honestly teach: published minima are met and enforced by
// tools/content-gate.mjs. Everything else is "content in progress", never a blank class.
export const SUPPORTED_CLASSES = [4, 5, 6, 7];
export const academicYear = d => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);
export const classNow = (profile, date) => Math.min(12, profile.cls + Math.max(0, academicYear(date) - profile.ay0));

export function ensureState(skills, st, profile, date) {
  const cls = classNow(profile, date);
  for (const sk of skills) if (!st[sk.id]) st[sk.id] = newSkillState(sk.grade <= cls - 2);
  return st;
}
export const unlocked = (sk, st) => sk.pre.every(id => st[id] && st[id].m);

// Unmastered skills the learner may work on now, easiest class first.
// Strictly at or below the current class: an older child's syllabus is never served silently.
// When that set is empty the caller must ask aheadFrontier() and label the work as ahead.
export function frontier(skills, st, strand, cls) {
  const open = skills.filter(sk => sk.strand === strand && st[sk.id] && !st[sk.id].m && unlocked(sk, st));
  return open.filter(sk => sk.grade <= cls)
    .sort((a, b) => a.grade - b.grade || skills.indexOf(a) - skills.indexOf(b));
}

// Explicit stretch content: only used when the current class has nothing left, and always
// returned separately so the UI can say "this is class N+1 work".
export function aheadFrontier(skills, st, strand, cls) {
  const open = skills.filter(sk => sk.strand === strand && st[sk.id] && !st[sk.id].m && unlocked(sk, st));
  return open.filter(sk => sk.grade > cls)
    .sort((a, b) => a.grade - b.grade || skills.indexOf(a) - skills.indexOf(b));
}
// Within the same class, practise the skill whose estimate is furthest from secure first.
// This is the zone of proximal development: a skill at p≈0.5 gains more from one question
// than a brand-new skill at p=0.2 or a nearly-known one at p=0.9.
export const rankFrontier = (skills, st, strand, cls) => frontier(skills, st, strand, cls)
  .slice().sort((a, b) => a.grade - b.grade
    || priority(st[b.id].p, paramsOf(st[b.id]).learn) - priority(st[a.id].p, paramsOf(st[a.id]).learn)
    || skills.indexOf(a) - skills.indexOf(b));

// Due reviews are ordered by predicted recall today, so the most forgotten skill comes first.
export const dueReviews = (skills, st, day, today = day) =>
  skills.filter(sk => st[sk.id] && st[sk.id].m && st[sk.id].due && st[sk.id].due <= day)
    .sort((a, b) => {
      const ra = retention(st[a.id].p, gapDays(st[a.id].last, today), paramsOf(st[a.id]));
      const rb = retention(st[b.id].p, gapDays(st[b.id].last, today), paramsOf(st[b.id]));
      return ra - rb || (st[a.id].due < st[b.id].due ? -1 : 1);
    });

export const gapDays = (a, b) => {
  if (!a || !b) return 0;
  const t = d => Date.UTC(...d.split('-').map((x, i) => (i === 1 ? x - 1 : +x)));
  return Math.max(0, Math.round((t(b) - t(a)) / 864e5));
};

const dayIndex = day => Math.floor(Date.UTC(...day.split('-').map((x, i) => (i === 1 ? x - 1 : +x))) / 864e5);

// Mission = [{ kind:'review', skill } | { kind:'learn', strand }], one entry per question.
export function buildMission(skills, st, profile, date, day) {
  const cls = classNow(profile, date);
  const on = s => !(profile.off || []).includes(s);
  const has = s => on(s) && (frontier(skills, st, s, cls).length > 0 || aheadFrontier(skills, st, s, cls).length > 0);
  // Inside the class: a dynamic learn step. Nothing at this level: one named ahead skill,
  // repeated, flagged so every screen can label it honestly.
  const stepFor = s => {
    if (frontier(skills, st, s, cls).length) return { kind: 'learn', strand: s };
    const sk = aheadFrontier(skills, st, s, cls)[0];
    return sk ? { kind: 'skill', skill: sk.id, ahead: true } : null;
  };
  const total = profile.dailyQ || 18;
  const di = dayIndex(day);
  // Mixed revision: when nothing is new or due (a strong learner has finished the available skills),
  // practise already-mastered skills, oldest first, so there is always a mission and the streak is real.
  const mixed = () => skills.filter(sk => on(sk.strand) && st[sk.id]?.m).sort((a, b) => (st[a.id].last || '').localeCompare(st[b.id].last || '') || a.id.localeCompare(b.id))
    .slice(0, Math.max(4, Math.round(total / 3))).flatMap((sk, k, a) => Array.from({ length: Math.ceil(total / a.length) }, () => ({ kind: 'review', skill: sk.id, mixed: true }))).slice(0, total);
  const lang = ['e', 'h'].filter(has);
  const rot = ['l', 's', 'c', 'g', 't'].filter(has);
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
    const step = stepFor(s);
    if (step) for (let k = 0; k < Math.min(n, left); k++) plan.push({ ...step });
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

// Which enabled strands have no content at or below the learner's class. Used by the home
// screen to say "content in progress" instead of quietly jumping a class ahead.
export function contentGaps(skills, profile, date) {
  const cls = classNow(profile, date);
  return STRANDS.filter(s => !(profile.off || []).includes(s))
    .filter(s => !skills.some(sk => sk.strand === s && sk.grade <= cls));
}
