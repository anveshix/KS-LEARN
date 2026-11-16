// Answer parsing and checking (typed, tapped, Devanagari digits, fractions).
import { asciiDigits } from './i18n.js';

export const norm = s => asciiDigits(String(s)).trim().toLowerCase().replace(/[−–]/g, '-').replace(/\s+/g, ' ');
export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

export function parseNum(s) {
  if (String(s).length > 40) return null;
  s = norm(s).replace(/(\d),(?=\d)/g, '$1').replace(/^₹\s*/, '').replace(/\s*(%|°|cm|m|km|kg|rs\.?|rupees)$/, '');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}
export function parseFrac(s) {
  if (String(s).length > 40) return null;
  s = norm(s);
  let m;
  if ((m = s.match(/^(-?\d+)\s*\/\s*(\d+)$/))) return +m[2] ? { n: +m[1], d: +m[2] } : null;
  if ((m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/))) return +m[3] ? { n: +m[1] * +m[3] + +m[2], d: +m[3] } : null;
  if (/^-?\d+$/.test(s)) return { n: +s, d: 1 };
  return null;
}
export const fracEq = (a, b) => a.n * b.d === b.n * a.d;

// -> { valid, ok, trap }  valid=false means "not an answer" (never graded).
export function check(q, raw) {
  if (q.kind === 'mcq') {
    const i = typeof raw === 'number' ? raw : /^\d{1,2}$/.test(String(raw)) ? Number(raw) : NaN; // '' and ' ' are not option 0
    if (!Number.isInteger(i) || i < 0 || i >= q.options.length) return { valid: false };
    return { valid: true, ok: i === q.answer, trap: i === q.answer ? null : q.options[i].m || null };
  }
  if (q.kind === 'num') {
    const v = parseNum(raw);
    if (v === null) return { valid: false };
    const ok = Math.abs(v - q.answer) <= (q.tol || 1e-9);
    const t = ok ? null : (q.traps || []).find(x => Math.abs(x.v - v) <= 1e-9);
    return { valid: true, ok, trap: t ? t.m : null };
  }
  if (q.kind === 'frac') {
    const f = parseFrac(raw);
    if (!f) return { valid: false };
    const ok = fracEq(f, q.answer);
    const t = ok ? null : (q.traps || []).find(x => f.n === x.n && f.d === x.d);
    return { valid: true, ok, trap: t ? t.m : null };
  }
  const v = norm(raw);
  if (!v || v.length > 60) return { valid: false };
  return { valid: true, ok: [q.answer, ...(q.accept || [])].some(a => norm(a) === v), trap: null };
}
