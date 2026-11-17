// Recursive Scaffolding ladder: Hint -> Scaffold -> Retry, with fading.
//
// A miss opens a small, ordered ladder of easier questions instead of a red error screen:
//
//   hint      the misconception fix (or the skill tip) — always shown
//   rung 1    a prerequisite warm-up, or the same skill with a worked example
//   rung 2    the other of those two (if any), or a narrowed version of the same question
//   reveal    the answer, plainly, with the explanation — never scored
//   retry     the original question again
//
// Support fades as the estimate rises: a learner near mastery gets the hint and a retry,
// a learner who is struggling gets the full ladder. Every scaffold answer carries a
// weight below 1, so practice with help moves the BKT estimate but can never earn
// mastery by itself, and the parent view can report how much help was needed.
import { scaffoldFor, narrow, hintFor, MAX_DEPTH } from './guidance.js';
import { rng } from './rng.js';
import { L } from './i18n.js';

export const MAX_RUNGS = MAX_DEPTH;             // scaffold questions before the reveal
export const FADE = { high: 0.85, low: 0.5 };   // mastery bands that change how much support opens
export const EVIDENCE = { prereq: 0.5, worked: 0.5, simple: 0.45, retry: 0.75 };

export const LABEL = {
  prereq: L('Warm-up from the basics', 'बुनियाद से वार्म-अप'),
  worked: L('Worked example', 'हल किया हुआ उदाहरण'),
  simple: L('Smaller step', 'छोटा कदम'),
  fadeFull: L('Let us build it up step by step.', 'चलो इसे कदम-दर-कदम बनाएँ।'),
  fadeSingle: L('One small step, then try again.', 'एक छोटा कदम, फिर दोबारा कोशिश।'),
  fadeRetry: L('You know this one. Take a breath and try again.', 'यह तुम्हें आता है। साँस लो और फिर कोशिश करो।'),
};

export const evidenceFor = kind => (EVIDENCE[kind] == null ? 0.5 : EVIDENCE[kind]);

const promptKey = q => (typeof q.prompt === 'object' ? q.prompt.en : String(q.prompt))
  + [...(q.items || []), ...(q.left || [])].map(i => (typeof i === 'object' ? i.en : String(i))).sort().join('|');

// A fresh question from the same skill, narrowed when the format allows it.
export function simplerQuestion(sk, missed, seed) {
  for (let k = 0; k < 10; k++) {
    const r = rng(seed + 53 * (k + 1));
    const q = narrow(sk.gen(r, 1), r);
    if (promptKey(q) !== promptKey(missed)) return { ...q, skill: sk.id };
  }
  return { ...sk.gen(rng(seed + 991), 1), skill: sk.id };
}

// -> { skill, p, fade, hint:{kind,text}, steps:[{level,kind,skill,q,worked,note,evidence}] }
// The steps are questions only; hint and reveal are rendered by the UI around them.
export function buildLadder({ byId, skill: sk, missed, seed = 1, mastery = 0.2, misc = {}, states = null, trap = null }) {
  const p = Math.min(0.999, Math.max(0.001, Number.isFinite(mastery) ? mastery : 0.2));
  const fade = p >= FADE.high ? 'retry' : p >= FADE.low ? 'single' : 'full';
  const hint = hintFor(sk, misc, trap || (missed && missed.trap));
  const steps = [];
  if (fade === 'retry') return { skill: sk.id, p, fade, hint, steps };

  const pres = (sk.pre || []).map(id => byId[id]).filter(Boolean);
  // Order by what the learner needs: a shaky prerequisite opens first, a secure one comes
  // after the worked example. Fading then keeps only the first rung.
  const preP = id => (states && states[id] && Number.isFinite(states[id].p) ? states[id].p : 0.2);
  let order = pres.length ? (preP(pres[0].id) < 0.5 ? ['prereq', 'worked'] : ['worked', 'prereq']) : ['worked'];
  if (fade === 'single') order = order.slice(0, 1);

  for (const kind of order) {
    if (steps.length >= MAX_RUNGS) break;
    if (kind === 'prereq') {
      const sc = scaffoldFor(byId, sk, missed, seed + 7);
      if (sc.mode !== 'prereq' || !sc.skill || sc.skill.id === sk.id) continue;
      steps.push({
        level: steps.length + 1, kind: 'prereq', skill: sc.skill, q: sc.q, worked: null,
        note: LABEL.prereq, evidence: evidenceFor('prereq'),
      });
    } else {
      const q = simplerQuestion(sk, missed, seed + 101);
      steps.push({
        level: steps.length + 1, kind: 'worked', skill: sk, q,
        worked: (missed && missed.explain) || null,
        note: LABEL.worked, evidence: evidenceFor('worked'),
      });
    }
  }
  // A narrower version of the same skill is the last resort before the reveal.
  if (fade === 'full' && steps.length < MAX_RUNGS && sk.gen) {
    const q = simplerQuestion(sk, missed, seed + 307);
    if (!steps.some(st => promptKey(st.q) === promptKey(q))) {
      steps.push({
        level: steps.length + 1, kind: 'simple', skill: sk, q, worked: (missed && missed.explain) || null,
        note: LABEL.simple, evidence: evidenceFor('simple'),
      });
    }
  }
  return { skill: sk.id, p, fade, hint, steps };
}
