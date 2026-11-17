// BKT + mastery model: weighted evidence, adaptation, retention, per-skill isolation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { posterior, transition, retention, decay, priority, zpd, adapt, paramsOf, fitParams, refit, BKT, clamp } from '../src/core/bkt.js';
import { newSkillState, update, guessRate, masteryReady, P } from '../src/core/mastery.js';
import { sanitize, freshState } from '../src/core/store.js';
import { SKILLS, BY_ID } from '../src/content/index.js';
import { rng } from '../src/core/rng.js';
import { ensureState, rankFrontier, dueReviews, gapDays } from '../src/core/planner.js';

const day = '2026-11-16';
const clone = s => JSON.parse(JSON.stringify(s));

test('posterior follows Bayes and respects the guess rate', () => {
  // p=0.2, correct on a 4-option MCQ: posterior = .2*.9 / (.2*.9 + .8*.25)
  assert.ok(Math.abs(posterior(0.2, true, { guess: 0.25 }) - 0.4737) < 1e-3);
  assert.ok(posterior(0.2, true, { guess: 0.25 }) < posterior(0.2, true, { guess: 0.1 }), 'more options is stronger evidence');
  assert.ok(posterior(0.8, false, { slip: 0.1 }) < 0.8 && posterior(0.8, false, { slip: 0.1 }) > 0.3);
  assert.equal(transition(0.5, 0.12), 0.56);
  assert.equal(transition(0.99, 0.5), 0.995, 'the estimate never reaches certainty');
});

test('evidence weight scales the update in log-odds; a silent answer cannot earn mastery', () => {
  const full = newSkillState(false), weak = newSkillState(false);
  update(full, true, 0.25, day, null, 4000);
  update(weak, true, 0.25, day, null, 4000, { weight: 0.4, silent: true });
  assert.ok(full.p > weak.p, 'one cold answer is stronger than one assisted answer');
  assert.ok(weak.p > P.init, 'help still teaches a little');
  assert.equal(weak.n, 0, 'assisted practice is not graded evidence');
  assert.equal(weak.scn, 1);
  assert.equal(weak.m, false);
  // Sustained assisted practice does move the estimate; it just never counts as a test.
  for (let i = 0; i < 40; i++) update(weak, true, 0.25, day, null, 4000, { weight: 0.6, silent: true });
  assert.ok(weak.p > 0.9, `estimate moved with help: ${weak.p}`);
  assert.equal(weak.m, false, 'mastery needs graded evidence');
  assert.equal(masteryReady(weak), false);
});

test('weight 0 is a no-op, weights are clamped, malformed state is safe', () => {
  const s = newSkillState(false);
  const before = s.p;
  update(s, true, 0.25, day, null, 1000, { weight: 0, silent: true });
  assert.equal(s.p, before);
  update(s, true, 0.25, day, null, 1000, { weight: 99, silent: true });
  assert.ok(s.p <= 0.995);
  assert.equal(paramsOf(null).learn, BKT.learn);
  assert.equal(paramsOf({ bp: { l: 'x' } }).slip, BKT.slip);
});

test('slip rises after repeated misses on a supposedly secure skill; learn follows success', () => {
  const good = newSkillState(false);
  for (let i = 0; i < 4; i++) update(good, true, 0.25, day, null, 3000);
  assert.ok(good.m);
  const secure = clone(good);
  for (let i = 0; i < 5; i++) update(secure, false, 0.25, day, null, 3000);
  assert.ok(paramsOf(secure).slip > P.slip, `slip adapted: ${paramsOf(secure).slip}`);
  assert.ok(paramsOf(secure).slip <= 0.25, 'bounded');
  const idle = newSkillState(false);
  for (let i = 0; i < 6; i++) update(idle, false, 0.25, day, null, 3000);
  assert.ok(paramsOf(idle).slip <= 0.1, 'a learner still learning does not get a high slip prior');
  assert.ok(paramsOf(good).learn >= 0.1 && paramsOf(good).learn <= 0.18);
  assert.deepEqual(Object.keys(adapt(newSkillState(false), true, 0.2)), ['slip', 'learn']);
});

test('a high personal slip slows evidence but never makes mastery unreachable', () => {
  const s = newSkillState(false);
  s.bp = { l: 0.12, s: 0.25 };
  let ev = [];
  for (let i = 0; i < 5 && !s.m; i++) ev = update(s, true, 0.25, day, null, 3000);
  assert.ok(ev.includes('mastered'), `mastered despite a high slip: p=${s.p}`);
  assert.equal(s.m, true);
});

test('retention decays for planning but never rewrites the stored estimate', () => {
  assert.ok(retention(0.95, 0) > retention(0.95, 10));
  assert.ok(retention(0.95, 30) < 0.9);
  assert.ok(decay(0.9, 365) < 0.9 * 0.05);
  assert.equal(decay(0.9, -5), 0.9);
  const s = newSkillState(false);
  for (let i = 0; i < 4; i++) update(s, true, 0.25, day, null, 2000);
  const pinned = s.p;
  retention(s.p, 90);
  assert.equal(s.p, pinned, 'time alone does not lower the stored probability');
});

test('per-skill isolation: one skill learning does not touch another', () => {
  const a = newSkillState(false), b = newSkillState(false);
  for (let i = 0; i < 4; i++) update(a, true, 0.25, day, null, 2000);
  assert.ok(a.m);
  assert.equal(b.p, P.init); assert.equal(b.n, 0); assert.equal(b.bp, null);
});

test('priority favours the zone of proximal development', () => {
  assert.ok(priority(0.5) > priority(0.2));
  assert.ok(priority(0.5) > priority(0.95));
  assert.ok(Math.abs(zpd(0.55) - 1) < 1e-9);
  assert.ok(clamp(5, 0, 1) === 1);
});

test('review spacing survives the model change; a cold guess still cannot master a skill', () => {
  const s = newSkillState(false);
  let ev = [];
  for (let i = 0; i < 3; i++) ev = update(s, true, 0.25, day, null, 2000);
  assert.equal(s.m, false);
  ev = update(s, true, 0.25, day, null, 2000);
  assert.ok(ev.includes('mastered'));
  assert.equal(s.due, '2026-11-18');
  const g5 = newSkillState(false);
  for (let i = 0; i < 3; i++) update(g5, true, 0.5, day, null, 2000);
  assert.equal(g5.m, false, 'a 2-option guess is weak evidence');
});

test('adaptation can be re-derived from the answer log, and is idempotent', () => {
  const states = { 'm.add3': { ...newSkillState(false), p: 0.5, n: 6, c: 4, bp: null }, 'm.sub3': { ...newSkillState(false), p: 0.3, n: 2, c: 2, bp: { l: 0.11, s: 0.07 } } };
  const log = [
    { d: day, s: 'm.add3', ok: 1, p0: 0.9 }, { d: day, s: 'm.add3', ok: 0, p0: 0.9 },
    { d: day, s: 'm.add3', ok: 0, p0: 0.9 }, { d: day, s: 'm.sub3', ok: 1, p0: 0.2 },
    { d: day, s: 'm.sub3', ok: 1, p0: 0.2 }, { d: day, s: 'unknown', ok: 1, p0: 0.2 },
    { d: day, s: 'm.add3', ok: 1 }, // an older row without p0 cannot be used
  ];
  assert.equal(refit(states, log), 2);
  assert.equal(states['m.add3'].hn, 3);
  assert.equal(states['m.add3'].he, 2);
  assert.equal(states['m.sub3'].ln, 2);
  assert.equal(states['m.sub3'].lc, 2);
  const fit = fitParams({ hn: 3, he: 2, n: 6, c: 4 });
  assert.deepEqual(states['m.add3'].bp, { l: fit.learn, s: fit.slip });
  assert.equal(states['m.add3'].bp.s, 0.178, 'slip estimate is bounded and rounded');
  // A skill that already has personal parameters is left alone when the caller asks for that.
  const keep = JSON.parse(JSON.stringify(states['m.sub3'].bp));
  refit(states, log, { onlyMissing: true });
  assert.deepEqual(states['m.sub3'].bp, keep);
  assert.equal(refit(null, log), 0);
  assert.equal(refit(states, null), 0);
});

test('store: adaptive counters and assist log rows survive a save/load round trip', () => {
  const raw = freshState();
  raw.profile = { name: 'A', pin: 'p:1234', cls: 4, ay0: 2026, lang: 'bi', dailyQ: 18, off: [] };
  raw.skills['m.add3'] = { ...newSkillState(false), p: 0.63, n: 5, c: 4, scn: 3, scl: 2, bp: { l: 0.15, s: 0.08 }, hn: 9, he: 2, ln: 4, lc: 3 };
  raw.log.push({ d: day, s: 'm.add3', ok: 0, ms: 5000, w: 1, lv: 0 }, { d: day, s: 'm.add3', ok: 1, ms: 2000, a: 1, w: 0.5, lv: 2 });
  raw.days[day] = { q: 1, c: 0, ms: 5000, mq: 1, done: false, h: 1 };
  const st = sanitize(raw);
  const s = st.skills['m.add3'];
  assert.deepEqual(s.bp, { l: 0.15, s: 0.08 });
  assert.equal(s.scn, 3); assert.equal(s.scl, 2); assert.equal(s.hn, 9); assert.equal(s.he, 2);
  assert.equal(st.log[0].w, 1); assert.equal(st.log[0].lv, 0); assert.equal(st.log[0].a, undefined, 'only real assisted rows carry the flag');
  assert.equal(st.log[1].a, 1); assert.equal(st.log[1].w, 0.5); assert.equal(st.log[1].lv, 2);
  assert.equal(st.days[day].h, 1);
  assert.equal(sanitize({ ...raw, log: [{ d: day, s: 'm.add3', ok: 1, a: 1, w: 99, lv: 99 }] }).log[0].w, 1);
});

test('planner: shakiest skill inside the class comes first, most forgotten review leads', () => {
  const date = new Date('2026-11-16T10:00:00');
  const profile = { name: 'T', cls: 4, ay0: 2026, lang: 'bi', dailyQ: 18, off: [], pin: 'p:1234' };
  const st = ensureState(SKILLS, {}, profile, date);
  const f = rankFrontier(SKILLS, st, 'm', 4);
  const mid = f.find(sk => st[sk.id].p < 0.5);
  st[mid.id].p = 0.55; st[mid.id].n = 2;
  const again = rankFrontier(SKILLS, st, 'm', 4);
  assert.equal(again.find(sk => sk.id === mid.id).id, mid.id);
  assert.ok(again.indexOf(mid) <= 1, 'shaky skill moves to the front of its class');
  const a = SKILLS.find(sk => sk.strand === 'm' && sk.grade <= 4), b = SKILLS.find(sk => sk.strand === 's' && sk.grade <= 4 && sk.id !== a.id);
  st[a.id] = { ...newSkillState(false), m: true, p: 0.9, due: '2026-11-10', last: '2026-10-01' };
  st[b.id] = { ...newSkillState(false), m: true, p: 0.9, due: '2026-11-10', last: '2026-11-15' };
  const due = dueReviews(SKILLS, st, day, day);
  assert.ok(due.indexOf(a) < due.indexOf(b), 'older practice is reviewed first');
  assert.equal(gapDays('2026-11-01', '2026-11-16'), 15);
  let mcq = null;
  for (let k = 1; k < 40 && !mcq; k++) { const q = BY_ID['s.plants'].gen(rng(k)); if (q.kind === 'mcq') mcq = q; }
  assert.equal(guessRate(mcq), 1 / mcq.options.length);
});
