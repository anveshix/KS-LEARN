// Content audit: runs every generator over many seeds and checks each question.
// Used by the tests and by `node tools/audit.mjs` before every release.
import { SKILLS, MISC, validateGraph } from '../src/content/index.js';
import { rng } from '../src/core/rng.js';
import { auditQuestion } from '../src/core/audit.js';

export function auditAll(seeds = 300) {
  const problems = [...validateGraph().map(e => ({ skill: '-', err: e }))];
  for (const sk of SKILLS) {
    if (!sk.title?.en || !sk.tip?.en || !sk.tip?.hi) problems.push({ skill: sk.id, err: 'missing title/tip' });
    for (let s = 1; s <= seeds; s++) {
      let q; try { q = sk.gen(rng(s * 7919 + 13)); } catch (e) { problems.push({ skill: sk.id, err: 'throws: ' + e.message }); break; }
      const errs = auditQuestion(sk, q, MISC);
      if (errs.length) { problems.push({ skill: sk.id, err: errs.join('; '), seed: s }); break; }
    }
  }
  return problems;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const p = auditAll(+process.argv[2] || 500);
  const counts = {}; for (const s of SKILLS) counts[s.strand] = (counts[s.strand] || 0) + 1;
  console.log(`${SKILLS.length} skills`, counts);
  for (const x of p) console.log('PROBLEM', x.skill, x.err, x.seed ?? '');
  console.log(p.length ? `${p.length} problem(s)` : 'all generators clean');
  process.exitCode = p.length ? 1 : 0;
}
