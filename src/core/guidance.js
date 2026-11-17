// Recursive Guidance Loop (no DOM): Hint -> Scaffold -> Retry -> Reward.
// A miss never shows a red "wrong" screen. The learner gets a hint, then an easier question
// (from a prerequisite skill, or the same skill made smaller with a worked example), then
// retries the original. The scaffold can itself be missed, which opens one more level (MAX_DEPTH).
import { rng } from './rng.js';
import { L } from './i18n.js';

export const MAX_DEPTH = 2;
export const COMEBACK_STARS = 2;

// What the learner is told before any help: the misconception fix if the wrong choice revealed one, else the skill's tip.
export function hintFor(sk, misc, trap) {
  return trap && misc[trap] ? { kind: 'misconception', text: misc[trap] } : { kind: 'tip', text: sk.tip };
}

// Multiple choice: keep the right answer and ONE wrong option. Other kinds are returned unchanged.
export function narrow(q, r) {
  if (q.kind !== 'mcq' || q.options.length <= 2) return q;
  const wrongs = q.options.map((o, i) => i).filter(i => i !== q.answer);
  const keep = [q.answer, r.pick(wrongs)].sort((a, b) => a - b);
  return { ...q, options: keep.map(i => q.options[i]), answer: keep.indexOf(q.answer) };
}

const itemKey = i => (typeof i === 'object' ? i.en : String(i));
const promptKey = q => (typeof q.prompt === 'object' ? q.prompt.en : String(q.prompt)) + [...(q.items || []), ...(q.left || [])].map(itemKey).sort().join('|');

// -> { skill, q, worked: L|null, mode: 'prereq' | 'worked' }
// prereq: a question from a skill this one is built on (easier by construction).
// worked: a fresh, smaller question from the same skill, shown with the explanation of the missed one.
export function scaffoldFor(byId, sk, missed, seed) {
  const pres = (sk.pre || []).map(id => byId[id]).filter(Boolean);
  const r0 = rng(seed);
  if (pres.length) {
    const p = pres[Math.floor(r0() * pres.length)];
    return { skill: p, q: { ...p.gen(rng(seed + 1), 1), skill: p.id }, worked: null, mode: 'prereq' };
  }
  let q = null;
  for (let k = 0; k < 8; k++) { q = narrow(sk.gen(rng(seed + 31 * (k + 1)), 1), rng(seed + k)); if (promptKey(q) !== promptKey(missed)) break; }
  return { skill: sk, q: { ...q, skill: sk.id }, worked: missed.explain || null, mode: 'worked' };
}

export const MSG = {
  oops: L('Oops! No worries. Let\'s look at a hint.', 'कोई बात नहीं! चलो एक संकेत देखते हैं।'),
  easier: L('Try an easier one', 'एक आसान प्रश्न करो'),
  worked: L('Worked example', 'हल किया हुआ उदाहरण'),
  prereqNote: L('A warm-up from the basics', 'बुनियादी बातों से एक वार्म-अप'),
  tryOrig: L('Now try the first question again', 'अब पहला प्रश्न फिर से करो'),
  scaffoldOk: L('Yes! That is the key idea.', 'हाँ! यही मुख्य बात है।'),
  scaffoldNo: L('Almost! Here is how it works:', 'लगभग! ऐसे होता है:'),
  retry: L('Second try. You can do this!', 'दूसरा प्रयास। तुम कर सकते हो!'),
  tryAgain: L('Try it again', 'फिर से कोशिश करो'),
  comeback: L('Comeback! Mistakes help the brain grow.', 'शानदार वापसी! गलतियाँ दिमाग़ को बढ़ाती हैं।'),
  notYet: L('Not yet, and that is okay. Here is the answer:', 'अभी नहीं, और यह ठीक है। उत्तर यह है:'),
  hintLbl: L('Hint', 'संकेत'),
};
