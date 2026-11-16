// Checks a content pack file before giving it to the app:  node tools/validate-pack.mjs my-pack.json
import { readFileSync } from 'node:fs';
import { SKILLS, MISC } from '../src/content/index.js';
import { validatePack } from '../src/core/packs.js';

const file = process.argv[2];
if (!file) { console.error('usage: node tools/validate-pack.mjs <pack.json>'); process.exit(2); }
let pack;
try { pack = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error('Cannot read pack:', e.message); process.exit(1); }
const errs = validatePack(pack, SKILLS, MISC);
for (const e of errs) console.error('PROBLEM', e);
console.log(errs.length ? `${errs.length} problem(s)` : `ok: ${pack.skills.length} skill(s)`);
process.exitCode = errs.length ? 1 : 0;
