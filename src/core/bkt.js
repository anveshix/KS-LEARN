// Bayesian Knowledge Tracing, with the two changes a real classroom needs:
//
//   1. Evidence is weighted. A correct answer after a hint, a worked example or a
//      prerequisite warm-up is weaker evidence of mastery than a cold first attempt.
//      The update is done in log-odds, so a weight of 0.6 is exactly 60% of the
//      evidence, and a weight of 0 adds none.
//   2. The learner's slip and learning rate adapt. Slip is estimated from errors on
//      items the model already thought were secure; the learn rate follows the
//      learner's own success rate. Both are shrunk towards the classroom prior, so
//      one lucky or unlucky answer cannot swing the model.
//
// The four classic parameters are all here: L0 (prior), T (learn), G (guess),
// S (slip). Guess stays item-level (a 4-option MCQ really does give a 25% chance),
// while T and S are personal. Nothing is stored except probabilities and counts.
//
//   posterior: P(mastered | observed) ∝ P(observed | mastered) · P(mastered)
//   transition: p ← p + (1 − p)·T          (learning happens on every opportunity)
//   retention: p_decayed·(1−S) + (1−p_decayed)·G   (predicted chance today)
//
// The maths is deliberately plain, testable and free of dependencies: this runs on a
// phone with no server, and a parent should be able to read the numbers.

export const BKT = {
  prior: 0.2,          // L0 for a new skill in the current class
  fastPrior: 0.6,      // L0 for a foundation skill from an earlier class
  learn: 0.12,         // T: probability of learning on one opportunity
  slip: 0.1,           // S: knows it, still answers wrong
  guess: 0.2,          // G: does not know it, still answers right
  thr: 0.95,           // mastery probability
  forgetPerDay: 0.02,  // only used to predict retention, never to rewrite the state
};

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round3 = x => Math.round(x * 1000) / 1000;

export const logit = p => {
  const q = clamp(typeof p === 'number' && Number.isFinite(p) ? p : BKT.prior, 1e-4, 1 - 1e-4);
  return Math.log(q / (1 - q));
};
export const expit = z => 1 / (1 + Math.exp(-clamp(Number.isFinite(z) ? z : 0, -20, 20)));

// One observation, weighted. `ok` true = correct answer.
export function posterior(p, ok, { slip = BKT.slip, guess = BKT.guess, weight = 1 } = {}) {
  const s = clamp(slip, 0.005, 0.6), g = clamp(guess, 0.005, 0.9);
  const w = clamp(weight, 0, 1);
  if (w === 0) return clamp(p, 0.01, 0.995);
  const lr = ok ? Math.log((1 - s) / g) : Math.log(s / (1 - g));
  return clamp(expit(logit(p) + w * lr), 0.001, 0.999);
}
export function transition(p, learn = BKT.learn) {
  const t = clamp(learn, 0, 0.6);
  return clamp(p + (1 - p) * t, 0.01, 0.995);
}
// Predicted chance of answering correctly after `days` without practice.
// This is an estimate for planning and for the parent view; the stored probability is
// only ever moved by real answers, so a holiday does not erase what was learned.
export function decay(p, days, forgetPerDay = BKT.forgetPerDay) {
  if (!(days > 0)) return clamp(p, 0.001, 0.999);
  return clamp(p * Math.pow(1 - clamp(forgetPerDay, 0, 0.5), days), 0.001, 0.999);
}
export function retention(p, days = 0, { slip = BKT.slip, guess = BKT.guess } = {}) {
  const d = decay(p, days);
  return d * (1 - slip) + (1 - d) * guess;
}

// How much a learner is likely to gain from practising this skill now: highest when the
// estimate is uncertain (zone of proximal development), near zero when it is already known.
export const zpd = (p, target = 0.55, width = 0.3) => Math.exp(-(((p - target) / width) ** 2));
export function priority(p, learn = BKT.learn) {
  return zpd(p) * (0.6 + clamp(learn, 0, 0.4) * 2);
}

// Slip and learn for this learner: prior-mean shrinkage, bounded so a strange run of
// answers cannot produce a slip of 0.9 or a learn rate of 0.5.
const SLIP_PRIOR_A = 1.2, SLIP_PRIOR_B = 13.8;   // mean 0.08
// Pure: counts in, personal parameters out. Bounded so no short run of answers can
// produce an absurd slip or learn rate.
export function fitParams({ hn = 0, he = 0, n = 0, c = 0 } = {}) {
  const slip = clamp((he + SLIP_PRIOR_A) / (hn + SLIP_PRIOR_A + SLIP_PRIOR_B), 0.03, 0.25);
  const success = n > 0 ? c / n : 0;
  const learnMean = clamp(0.06 + 0.14 * success, 0.06, 0.2);
  const learn = clamp(0.65 * BKT.learn + 0.35 * learnMean, 0.06, 0.18);
  return { slip: round3(slip), learn: round3(learn) };
}
export function adapt(s, ok, pBefore) {
  if (!s || typeof s !== 'object') return null;
  const high = pBefore >= 0.85, low = pBefore <= 0.45;
  if (high) { s.hn = Math.min(1e6, (s.hn || 0) + 1); if (!ok) s.he = Math.min(1e6, (s.he || 0) + 1); }
  if (low) { s.ln = Math.min(1e6, (s.ln || 0) + 1); if (ok) s.lc = Math.min(1e6, (s.lc || 0) + 1); }
  const fit = fitParams(s);
  s.bp = { l: fit.learn, s: fit.slip };
  return { slip: fit.slip, learn: fit.learn };
}

// Re-derive the adaptation counters from the answer log. Rows now carry the estimate they
// were answered at (`p0`), so the log alone can explain the personal parameters — useful
// after a restore, and a check that the stored counters match the evidence.
// Older rows without p0 are skipped (graded counts still come from the state, not the log).
export function refit(states, log, { onlyMissing = false } = {}) {
  if (!states || !Array.isArray(log)) return 0;
  const acc = new Map();
  for (const r of log) {
    if (!r || typeof r.s !== 'string' || typeof r.p0 !== 'number') continue;
    if (!states[r.s]) continue;
    const a = acc.get(r.s) || { hn: 0, he: 0, ln: 0, lc: 0 };
    if (r.p0 >= 0.85) { a.hn++; if (!r.ok) a.he++; }
    else if (r.p0 <= 0.45) { a.ln++; if (r.ok) a.lc++; }
    acc.set(r.s, a);
  }
  let fitted = 0;
  for (const [id, a] of acc) {
    const s = states[id];
    if (onlyMissing && s.bp) continue;
    s.hn = a.hn; s.he = a.he; s.ln = a.ln; s.lc = a.lc;
    const fit = fitParams({ ...a, n: s.n, c: s.c });
    s.bp = { l: fit.learn, s: fit.slip };
    fitted++;
  }
  return fitted;
}
export function paramsOf(s) {
  const bp = s && s.bp;
  return {
    learn: bp && Number.isFinite(bp.l) ? clamp(bp.l, 0.03, 0.3) : BKT.learn,
    slip: bp && Number.isFinite(bp.s) ? clamp(bp.s, 0.01, 0.4) : BKT.slip,
  };
}
