// Curiosity Labs: validation, selection, question checking and progress.
// Pure logic, no DOM and no WebGL, so the content and the progress rules are testable on
// their own even on a machine with no graphics.
import { LABS, LAB_SCENES } from '../content/labs.js';
export { LABS, LAB_SCENES };

export const LAB_ID = /^labs\.[a-z0-9_]{1,30}$/;
export const LAB_STARS = 3;          // first completion only
export const MAX_LAB_TRIES = 999;

export const labById = id => LABS.find(l => l.id === id) || null;

// A lab is usable only if a screen reader could read every line and every answer is in range.
export function validateLabs(labs, byId) {
  const issues = [], seen = new Set();
  if (!Array.isArray(labs) || !labs.length) return ['no labs'];
  labs.forEach((lab, i) => {
    const at = lab && lab.id ? lab.id : `lab[${i}]`;
    if (!lab || typeof lab !== 'object' || Array.isArray(lab)) { issues.push(`${at}: not an object`); return; }
    if (!LAB_ID.test(lab.id || '')) issues.push(`${at}: id must look like labs.<name>`);
    if (seen.has(lab.id)) issues.push(`${at}: duplicate id`);
    seen.add(lab.id);
    if (!LAB_SCENES.includes(lab.scene)) issues.push(`${at}: unknown scene ${lab.scene}`);
    if (!Number.isInteger(lab.grade) || lab.grade < 3 || lab.grade > 9) issues.push(`${at}: grade must be 3..9`);
    if (lab.skill && !(byId && byId[lab.skill])) issues.push(`${at}: unknown skill ${lab.skill}`);
    for (const k of ['title', 'blurb', 'notice', 'alt', 'control']) {
      if (!lab[k] || typeof lab[k].en !== 'string' || typeof lab[k].hi !== 'string' || !lab[k].en) issues.push(`${at}: ${k} must be bilingual text`);
    }
    if (!Array.isArray(lab.steps) || lab.steps.length < 2 || lab.steps.length > 5) { issues.push(`${at}: needs 2..5 steps`); return; }
    lab.steps.forEach((st, j) => {
      if (!st.q || !st.q.en || !st.q.hi) issues.push(`${at}#${j}: question must be bilingual`);
      if (!st.hint || !st.hint.en || !st.hint.hi) issues.push(`${at}#${j}: hint must be bilingual`);
      if (!st.why || !st.why.en || !st.why.hi) issues.push(`${at}#${j}: explanation must be bilingual`);
      if (!Array.isArray(st.options) || st.options.length < 2 || st.options.length > 4) issues.push(`${at}#${j}: needs 2..4 options`);
      else {
        if (st.options.some(o => !o || !o.en || !o.hi)) issues.push(`${at}#${j}: options must be bilingual`);
        if (!Number.isInteger(st.answer) || st.answer < 0 || st.answer >= st.options.length) issues.push(`${at}#${j}: answer index out of range`);
        if (new Set(st.options.map(o => o.en)).size !== st.options.length) issues.push(`${at}#${j}: duplicate options`);
      }
    });
  });
  return issues;
}

// Class 4 sees class 4 and the next class as a peek ahead; nothing above that.
export function labsFor(cls, labs = LABS) {
  return labs.filter(l => l.grade <= cls + 1).sort((a, b) => a.grade - b.grade || a.id.localeCompare(b.id));
}

// raw is what the UI passes: an option index, possibly as a string.
export function checkLabStep(lab, index, raw) {
  const step = lab && lab.steps && lab.steps[index];
  if (!step) return { valid: false };
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && /^[0-9]$/.test(raw) ? +raw : NaN;
  if (!Number.isInteger(n) || n < 0 || n >= step.options.length) return { valid: false };
  return { valid: true, ok: n === step.answer, hint: step.hint, why: step.why };
}

const record = r => (r && typeof r === 'object' && !Array.isArray(r) ? r : null);

export function markSeen(state, id, day) {
  if (!state || !LAB_ID.test(id)) return null;
  const labs = state.labs || (state.labs = {});
  const r = record(labs[id]) || (labs[id] = { seen: null, done: null, tries: 0 });
  if (!r.seen) r.seen = day;
  return r;
}
export function markDone(state, id, day) {
  const r = markSeen(state, id, day);
  if (!r) return false;
  const first = !r.done;
  if (!r.done) r.done = day;
  return first;
}
export function noteLabTry(state, id) {
  const r = markSeen(state, id, new Date().toISOString().slice(0, 10));
  if (r) r.tries = Math.min(MAX_LAB_TRIES, (r.tries || 0) + 1);
  return r ? r.tries : 0;
}

export function labProgress(state, id) {
  const r = state && state.labs && record(state.labs[id]);
  return { seen: (r && r.seen) || null, done: (r && r.done) || null, tries: (r && r.tries) || 0 };
}
export function labSummary(state, labs = LABS) {
  const seen = labs.filter(l => labProgress(state, l.id).seen).length;
  const done = labs.filter(l => labProgress(state, l.id).done).length;
  return { total: labs.length, seen, done };
}
