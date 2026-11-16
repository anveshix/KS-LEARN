// The skill graph: every skill from every strand, plus strand metadata.
import { L } from '../core/i18n.js';
import { MATH } from './gen-math.js';
import { LOGIC, CODE } from './gen-logic.js';
import { ENGLISH, HINDI } from './bank-lang.js';
import { SCIENCE, GK, AI_LIT } from './bank-sci.js';
import { HINDI_MORE, SCIENCE_MORE, GK_MORE } from './bank-more.js';
import { SST, INTERACTIVE } from './bank-t.js';
import { MISC } from './misc.js';

export const STRAND_INFO = {
  m: { name: L('Maths', 'गणित'), color: 'm' },
  e: { name: L('English', 'अंग्रेज़ी'), color: 'e' },
  h: { name: L('Hindi', 'हिंदी'), color: 'h' },
  s: { name: L('Science', 'विज्ञान'), color: 's' },
  l: { name: L('Reasoning', 'तर्कशक्ति'), color: 'l' },
  c: { name: L('Coding', 'कोडिंग'), color: 'c' },
  g: { name: L('General knowledge', 'सामान्य ज्ञान'), color: 'g' },
  t: { name: L('Social Science', 'सामाजिक विज्ञान'), color: 't' },
};
// Free, open simulations (PhET, University of Colorado Boulder, CC-BY) to explore after mastering a skill. Online only.
const PHET = 'https://phet.colorado.edu/en/simulations/';
const EXPLORE = {
  'm.frac_like': 'fractions-intro', 'm.frac_eq': 'fraction-matcher', 'm.area': 'area-builder', 'm.perim': 'area-builder',
  'm.tables': 'arithmetic', 'm.int_add': 'number-line-integers', 'm.eq1': 'equality-explorer', 'm.ratio_div': 'ratio-and-proportion',
  's.matter': 'states-of-matter-basics', 's.space': 'gravity-and-orbits', 's.force': 'forces-and-motion-basics', 's.light': 'bending-light',
};
export const SKILLS = [...MATH, ...ENGLISH, ...HINDI, ...HINDI_MORE, ...SCIENCE, ...SCIENCE_MORE, ...LOGIC, ...CODE, ...AI_LIT, ...GK, ...GK_MORE, ...SST, ...INTERACTIVE]
  .map(s => (EXPLORE[s.id] ? { ...s, explore: PHET + EXPLORE[s.id] } : s));
export const BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));
export { MISC };

// Structural checks: unique ids, known prerequisites, no cycles, prerequisites not in a later class.
export function validateGraph(skills = SKILLS) {
  const ids = new Set(), errs = [];
  for (const s of skills) { if (ids.has(s.id)) errs.push(`duplicate id ${s.id}`); ids.add(s.id); }
  const by = Object.fromEntries(skills.map(s => [s.id, s]));
  for (const s of skills) for (const p of s.pre) {
    if (!by[p]) errs.push(`${s.id}: unknown prerequisite ${p}`);
    else if (by[p].grade > s.grade) errs.push(`${s.id}: prerequisite ${p} is from a later class`);
  }
  const seen = {}, visit = id => { if (seen[id] === 1) return errs.push(`cycle at ${id}`), 0; if (seen[id] === 2) return 0; seen[id] = 1; for (const p of by[id]?.pre || []) visit(p); seen[id] = 2; return 0; };
  skills.forEach(s => visit(s.id));
  return errs;
}
