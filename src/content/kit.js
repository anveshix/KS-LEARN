// Building blocks for skills and questions.
import { L } from '../core/i18n.js';

// A skill: id "<strand>.<name>", the class it belongs to, prerequisites, a one-line
// teaching tip and a generator that turns a seeded RNG into a fresh question.
export const S = (id, grade, title, pre, tip, gen, o = {}) => ({ id, strand: id.split('.')[0], grade, title, pre, tip, gen, ...o });

export const fmt = n => (Number.isInteger(n) ? n.toLocaleString('en-IN') : String(+n.toFixed(4)));
export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
export const lcm = (a, b) => a / gcd(a, b) * b;
export const neg = n => (n < 0 ? `(−${-n})` : String(n));          // (−7) in running maths
export const sgn = n => (n < 0 ? `− ${-n}` : `+ ${n}`);

export const num = (prompt, answer, explain, o = {}) => ({ kind: 'num', prompt, answer, explain, ...o, ...(o.traps ? { traps: o.traps.filter(t => Math.abs(t.v - answer) > 1e-9) } : {}) });
export const frac = (prompt, n, d, explain, o = {}) => { const g = gcd(n, d) || 1; return { kind: 'frac', prompt, answer: { n: n / g, d: d / g }, explain, ...o }; };
export const text = (prompt, answer, explain, o = {}) => ({ kind: 'text', prompt, answer, explain, ...o });

const keyOf = t => (typeof t === 'object' ? t.en : String(t));
// correct: text; wrongs: text or {t, m} where m names the misconception that option reveals.
export function mcq(r, prompt, correct, wrongs, explain, o = {}) {
  const want = o.n || 4;
  const seen = new Set([keyOf(correct)]);
  const opts = [{ t: correct, ok: true }];
  for (const w of wrongs) {
    const t = w && typeof w === 'object' && 't' in w ? w.t : w;
    if (seen.has(keyOf(t))) continue;
    seen.add(keyOf(t));
    opts.push({ t, m: w && w.m });
    if (opts.length === want) break;
  }
  if (opts.length < 2) throw new Error('mcq needs at least one distractor');
  const sh = o.fixed ? opts.slice().sort((a, b) => o.fixed.indexOf(keyOf(a.t)) - o.fixed.indexOf(keyOf(b.t))) : r.shuffle(opts);
  const { n, fixed, ...rest } = o;
  return { kind: 'mcq', prompt, options: sh.map(x => (x.m ? { t: x.t, m: x.m } : { t: x.t })), answer: sh.findIndex(x => x.ok), explain, ...rest };
}
// Numeric multiple choice: traps first, then near misses.
export function nmcq(r, prompt, correct, traps, explain, o = {}) {
  const wrongs = traps.filter(t => Number.isFinite(t.v) && t.v !== correct).map(t => ({ t: fmt(t.v), m: t.m }));
  for (const d of r.shuffle([1, -1, 2, -2, 10, -10, 5, -5, 3])) if (correct + d > 0 || correct < 0) wrongs.push({ t: fmt(correct + d) });
  return mcq(r, prompt, fmt(correct), wrongs, explain, o);
}
export const traps = (...list) => list.filter(t => t && Number.isFinite(t.v));

// Question built from a row of a fact table; `key` stops the same row repeating back to back.
export const keyed = (q, key) => ({ ...q, key: String(key) });
export const others = (r, list, not, n, same = () => false) => r.shuffle(list.filter(x => x !== not && !same(x, not))).slice(0, n);
export { L };

// Interactive kinds. order: put the items in the right sequence. match: pair each left item with its partner.
// `seq` / `pairs` are given in the CORRECT arrangement; the learner sees them shuffled.
const shuffled = (r, n) => { let idx; do idx = r.shuffle(Array.from({ length: n }, (_, i) => i)); while (n > 1 && idx.every((v, i) => v === i)); return idx; };
export function orderQ(r, prompt, seq, explain, o = {}) {
  const idx = shuffled(r, seq.length);
  return { kind: 'order', prompt, items: idx.map(i => seq[i]), answer: seq.map((_, i) => idx.indexOf(i)), explain, ...o };
}
export function matchQ(r, prompt, pairs, explain, o = {}) {
  const idx = shuffled(r, pairs.length);
  return { kind: 'match', prompt, left: pairs.map(p => p[0]), right: idx.map(i => pairs[i][1]), answer: pairs.map((_, i) => idx.indexOf(i)), explain, ...o };
}
