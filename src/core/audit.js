// Checks one generated question: bilingual completeness, numbers match across languages,
// answer key valid and checkable, distractors distinct, misconceptions known.
import { numbersIn } from './i18n.js';
import { check } from './check.js';

const DEV = /[ऀ-ॿ]/;
export function auditQuestion(sk, q, MISC) {
  const errs = [], P = typeof q.prompt === 'string' ? { en: q.prompt, hi: q.prompt } : q.prompt;
  const bi = (v, where) => {
    if (!v || typeof v !== 'object') return;
    if (!v.en || !v.hi) errs.push(`${where}: missing language`);
    if (DEV.test(v.en) && !/^[eh]\./.test(sk.id)) errs.push(`${where}: Devanagari in English text`);
  };
  bi(P, 'prompt'); bi(q.explain, 'explain');
  if (!sk.id.startsWith('e.') && !sk.id.startsWith('h.') && P.en !== P.hi && !DEV.test(P.hi)) errs.push('prompt: Hindi text has no Devanagari');
  if (q.explain && q.explain.en !== q.explain.hi && !DEV.test(q.explain.hi)) errs.push('explain: Hindi text has no Devanagari');
  if (numbersIn(P.en) !== numbersIn(P.hi)) errs.push(`prompt numbers differ: ${P.en} | ${P.hi}`);
  if (q.explain && numbersIn(q.explain.en) !== numbersIn(q.explain.hi)) errs.push(`explain numbers differ: ${q.explain.en} | ${q.explain.hi}`);
  if (/undefined|NaN|\[object/.test(JSON.stringify(q))) errs.push('undefined/NaN in question');
  if (q.kind === 'mcq') {
    if (q.options.length < 2 || q.answer < 0 || q.answer >= q.options.length) errs.push('bad mcq key');
    const keys = q.options.map(o => (typeof o.t === 'object' ? o.t.en : o.t).trim().toLowerCase());
    if (new Set(keys).size !== keys.length) errs.push('duplicate options');
    for (const o of q.options) if (o.m && !MISC[o.m]) errs.push(`unknown misconception ${o.m}`);
    if (!check(q, q.answer).ok) errs.push('key does not check');
  } else if (q.kind === 'order' || q.kind === 'match') {
    const side = q.kind === 'order' ? q.items : q.right, n = q.answer.length, key = v => (typeof v === 'object' ? v.en : String(v)).trim().toLowerCase();
    if (!Array.isArray(side) || side.length !== n || n < 2 || (q.kind === 'match' && (!Array.isArray(q.left) || q.left.length !== n))) errs.push('bad ' + q.kind + ' shape');
    else {
      if (new Set(q.answer).size !== n || q.answer.some(v => !Number.isInteger(v) || v < 0 || v >= n)) errs.push('answer is not a permutation');
      if (new Set(side.map(key)).size !== n) errs.push('duplicate items');
      if (q.kind === 'match' && new Set(q.left.map(key)).size !== n) errs.push('duplicate left items');
      if (q.answer.every((v, i) => v === i)) errs.push('already in order');
      if (!check(q, q.answer).ok) errs.push('key does not check');
      [...side, ...(q.left || [])].forEach(v => bi(v, 'item'));
    }
  } else if (q.kind === 'num') {
    if (!Number.isFinite(q.answer)) errs.push('answer not a number');
    if (!check(q, String(q.answer)).ok) errs.push(`key does not check: ${q.answer}`);
    for (const t of q.traps || []) { if (Math.abs(t.v - q.answer) < 1e-9) errs.push('trap equals answer'); if (t.m && !MISC[t.m]) errs.push(`unknown misconception ${t.m}`); }
  } else if (q.kind === 'frac') {
    if (!check(q, `${q.answer.n}/${q.answer.d}`).ok) errs.push('fraction key does not check');
  } else if (q.kind === 'text') {
    if (!check(q, q.answer).ok) errs.push('text key does not check');
  } else errs.push(`unknown kind ${q.kind}`);
  return errs;
}
