// Content packs: JSON files that add new chapters (for example Class 9) without
// changing code. A pack is accepted only if every question passes the audit.
import { L } from './i18n.js';
import { rng } from './rng.js';
import { auditQuestion } from './audit.js';

const STRANDS = new Set(['m', 'e', 'h', 's', 'l', 'c', 'g']);
const lt = v => (v && typeof v === 'object' ? L(String(v.en || ''), String(v.hi || '')) : L(String(v || ''), String(v || '')));

function mcqFrom(r, it) {
  const opts = r.shuffle([{ t: lt(it.a), ok: true }, ...it.w.map(w => ({ t: lt(w) }))]);
  return { kind: 'mcq', prompt: lt(it.q), options: opts.map(o => ({ t: o.t })), answer: opts.findIndex(o => o.ok), explain: lt(it.x) };
}

// pack: { id, title:{en,hi}, skills:[{ id, strand, grade, title:{en,hi}, pre:[], tip:{en,hi}, items:[{ q, a, w:[...], x }] }] }
export function packToSkills(pack) {
  return (pack.skills || []).map(s => {
    const items = s.items || [];
    return {
      id: String(s.id), strand: String(s.strand), grade: Number(s.grade), title: lt(s.title), pre: (s.pre || []).map(String), tip: lt(s.tip),
      size: items.length, pack: pack.id,
      gen: r => { const k = Math.floor(r() * items.length); return { ...mcqFrom(r, items[k]), key: String(k) }; },
    };
  });
}

export function validatePack(pack, existing, MISC = {}) {
  const errs = [];
  if (!pack || typeof pack !== 'object' || typeof pack.id !== 'string' || !/^[a-z0-9_-]{1,40}$/i.test(pack.id) || !Array.isArray(pack.skills) || !pack.skills.length) return ['Not a KS-LEARN content pack.'];
  if (pack.skills.length > 300) return ['A pack may hold at most 300 skills.'];
  const tooLong = v => [v && v.en, v && v.hi, typeof v === 'string' ? v : ''].some(x => typeof x === 'string' && x.length > 1200);
  const ids = new Set(existing.map(s => s.id));
  const mine = new Set();
  for (const s of pack.skills) {
    const where = `skill ${s && s.id}`;
    if (!s || typeof s !== 'object' || typeof s.id !== 'string' || !/^[a-z]\.[a-z0-9_]{1,40}$/.test(s.id)) { errs.push(`${where}: id must look like s.cells9`); continue; }
    if (ids.has(s.id) || mine.has(s.id)) errs.push(`${where}: id already exists`);
    mine.add(s.id);
    if (!STRANDS.has(s.strand) || s.id[0] !== s.strand) errs.push(`${where}: strand must be one of m e h s l c g and match the id`);
    if (!(Number.isInteger(s.grade) && s.grade >= 1 && s.grade <= 12)) errs.push(`${where}: grade must be 1 to 12`);
    if (s.pre !== undefined && !Array.isArray(s.pre)) { errs.push(`${where}: pre must be a list`); continue; }
    for (const p of s.pre || []) if (!ids.has(p) && !pack.skills.some(x => x.id === p)) errs.push(`${where}: unknown prerequisite ${p}`);
    if (!s.title?.en || !s.title?.hi || !s.tip?.en || !s.tip?.hi) errs.push(`${where}: title and tip need both en and hi`);
    if (!Array.isArray(s.items) || s.items.length < 4 || s.items.length > 500) { errs.push(`${where}: needs 4 to 500 items`); continue; }
    s.items.forEach((it, i) => {
      if (!it || !it.q || !it.a || !Array.isArray(it.w) || it.w.length < 2 || it.w.length > 5 || !it.x) { errs.push(`${where} item ${i + 1}: needs q, a, w (2+ wrong answers) and x`); return; }
      if ([it.q, it.a, it.x, ...it.w].some(tooLong)) { errs.push(`${where} item ${i + 1}: text is too long`); return; }
      const q = mcqFrom(rng(i + 1), it);
      for (const o of q.options) if (!o.t.en || !o.t.hi) errs.push(`${where} item ${i + 1}: every option needs en and hi`);
      for (const e of auditQuestion(s, q, MISC)) errs.push(`${where} item ${i + 1}: ${e}`);
    });
  }
  const by = Object.fromEntries(pack.skills.filter(s => s && typeof s === 'object').map(s => [s.id, s])), seen = {};
  const visit = id => { if (seen[id] === 1) { errs.push(`skill ${id}: prerequisites form a loop`); return; } if (seen[id] || !by[id]) return; seen[id] = 1; (Array.isArray(by[id].pre) ? by[id].pre : []).forEach(visit); seen[id] = 2; };
  Object.keys(by).forEach(visit);
  return errs.slice(0, 30);
}
