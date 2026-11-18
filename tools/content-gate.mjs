// Content coverage gate.
//
// The app may only claim a class it can actually teach. This gate publishes the minimum a
// class must meet before it is offered, checks the real curriculum against it, and fails the
// build when the two disagree. Growing content is fine; silently shipping an empty class is not.
import { SKILLS } from '../src/content/index.js';
import { SUPPORTED_CLASSES } from '../src/core/planner.js';

// Published in docs/CONTENT.md. Changing these numbers is a product decision, not a test fix.
export const MINIMA = {
  total: 8,        // at least eight skills at this class level
  maths: 3,        // of which at least three are maths
  language: 1,     // and at least one is language (English or Hindi)
  strands: 3,      // spread over at least three strands
};

export function matrix(skills = SKILLS) {
  const out = {};
  for (const sk of skills) {
    const row = out[sk.grade] || (out[sk.grade] = { total: 0, strands: {}, maths: 0, language: 0 });
    row.total++;
    row.strands[sk.strand] = (row.strands[sk.strand] || 0) + 1;
    if (sk.strand === 'm') row.maths++;
    if (sk.strand === 'e' || sk.strand === 'h') row.language++;
  }
  return out;
}

export function meets(row) {
  if (!row) return false;
  return row.total >= MINIMA.total && row.maths >= MINIMA.maths
    && row.language >= MINIMA.language && Object.keys(row.strands).length >= MINIMA.strands;
}

export const supportedClasses = (skills = SKILLS) => {
  const m = matrix(skills);
  return Object.keys(m).map(Number).filter(g => g >= 3 && g <= 9 && meets(m[g])).sort((a, b) => a - b);
};

// The set of classes this release is allowed to advertise. It lives in the app, and this
// gate proves the measurement agrees with it.
export const DECLARED_SUPPORTED = SUPPORTED_CLASSES;

export function gate(skills = SKILLS) {
  const m = matrix(skills), supported = supportedClasses(skills), errors = [];
  for (const g of DECLARED_SUPPORTED) {
    if (!m[g]) errors.push(`Class ${g} is declared supported but has no content.`);
    else if (!meets(m[g])) errors.push(`Class ${g} no longer meets the published minimum.`);
  }
  for (const g of supported) {
    if (!DECLARED_SUPPORTED.includes(g)) errors.push(`Class ${g} meets the minimum but is not declared in DECLARED_SUPPORTED.`);
  }
  for (const g of Object.keys(m).map(Number)) {
    if (g > 9 && m[g].total) errors.push(`Class ${g} has content but is outside the supported range 3–9.`);
  }
  return { errors, supported, matrix: m };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { errors, supported, matrix: m } = gate();
  console.log(`content gate: minima ${JSON.stringify(MINIMA)}`);
  for (const g of Object.keys(m).map(Number).sort((a, b) => a - b)) {
    const r = m[g];
    console.log(`  class ${g}: ${r.total} skills, strands ${Object.keys(r.strands).length}, maths ${r.maths}, language ${r.language}${meets(r) ? '' : '  (below minimum)'}`);
  }
  console.log(`  supported: ${supported.join(', ')}`);
  for (const e of errors) console.error(`  FAIL ${e}`);
  if (errors.length) process.exit(1);
  console.log('content gate ok');
}
