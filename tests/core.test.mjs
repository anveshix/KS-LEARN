import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, BY_ID, MISC, validateGraph } from '../src/content/index.js';
import { auditAll } from '../tools/audit.mjs';
import { rng } from '../src/core/rng.js';
import { check, parseFrac } from '../src/core/check.js';
import { annotate, tx, L, B } from '../src/core/i18n.js';
import { update, newSkillState, addDays, P } from '../src/core/mastery.js';
import { ensureState, buildMission, classNow, frontier } from '../src/core/planner.js';
import { createSession, streak } from '../src/core/session.js';
import { freshState, exportText, importText, load, save, STORE_KEY } from '../src/core/store.js';
import { validatePack, packToSkills } from '../src/core/packs.js';
import { roadmap, weekSummary, topMistakes } from '../src/core/insights.js';

test('skill graph is valid and every generator passes the audit', () => {
  assert.deepEqual(validateGraph(), []);
  assert.deepEqual(auditAll(250), []);
  assert.ok(SKILLS.length >= 100);
});

test('same seed gives the same question; different seeds vary', () => {
  const sk = BY_ID['m.frac_unlike'];
  assert.deepEqual(sk.gen(rng(42)), sk.gen(rng(42)));
  const prompts = new Set(Array.from({ length: 30 }, (_, i) => sk.gen(rng(i + 1)).prompt.en));
  assert.ok(prompts.size > 15);
});

test('answer checking accepts real-world input and refuses non-answers', () => {
  const num = { kind: 'num', answer: 1250, traps: [{ v: 125, m: 'pct_100' }] };
  assert.equal(check(num, '1,250').ok, true);
  assert.equal(check(num, '१२५०').ok, true);
  assert.equal(check(num, '₹ 1250').ok, true);
  assert.equal(check(num, '125').trap, 'pct_100');
  assert.equal(check(num, 'twelve').valid, false);
  const fr = { kind: 'frac', answer: { n: 3, d: 4 } };
  assert.equal(check(fr, '6/8').ok, true);
  assert.equal(check(fr, '3 / 4').ok, true);
  assert.equal(check(fr, '1/0').valid, false);
  assert.deepEqual(parseFrac('1 1/2'), { n: 3, d: 2 });
  assert.equal(check({ kind: 'text', answer: 'went' }, '  Went ').ok, true);
  assert.equal(check({ kind: 'mcq', options: [{ t: 'a' }, { t: 'b', m: 'carry' }], answer: 0 }, 1).trap, 'carry');
  assert.equal(check({ kind: 'mcq', options: [{ t: 'a' }, { t: 'b' }], answer: 0 }, 7).valid, false);
});

test('bilingual: Hindi term beside the English term, once', () => {
  assert.equal(annotate('Find the LCM. The LCM is small.'), 'Find the LCM (लघुत्तम समापवर्त्य). The LCM is small.');
  assert.equal(tx(L('Area of a rectangle', 'आयत का क्षेत्रफल'), 'bi'), 'Area (क्षेत्रफल) of a rectangle (आयत)');
  assert.equal(tx(L('x', 'य'), 'hi'), 'य');
  assert.equal(tx(B('Heart', 'हृदय'), 'bi'), 'Heart (हृदय)');
});

test('mastery needs enough evidence and a later day, then schedules spaced reviews', () => {
  const s = newSkillState(false);
  let ev = [];
  for (let i = 0; i < 3; i++) ev = update(s, true, 0.25, '2026-11-15', null, 5000);
  assert.equal(s.m, false, 'three answers are not enough');
  for (let i = 0; i < 4 && !ev.includes('nearly'); i++) ev = update(s, true, 0.25, '2026-11-15', null, 5000);
  assert.ok(ev.includes('nearly'));
  assert.equal(s.m, false, 'four answers in one sitting do not master a skill');
  const day2 = addDays('2026-11-15', 1);
  ev = update(s, true, 0.25, day2, null, 5000);
  assert.ok(ev.includes('mastered')); assert.equal(s.m, true);
  assert.equal(s.due, addDays(day2, P.gaps[0]));
  const pBefore = s.p, dueBefore = s.due;
  ev = update(s, true, 0.25, dueBefore, null, 4000);
  assert.ok(ev.includes('review_ok')); assert.equal(s.st, 1);
  const missDay = s.due;
  ev = update(s, false, 0.25, missDay, 'carry', 4000);
  assert.ok(ev.includes('relearn'));
  assert.equal(s.m, true, 'one missed review is not a demotion');
  assert.equal(s.due, addDays(missDay, 1), 'it comes back tomorrow');
  assert.equal(s.relearn, missDay);
  assert.ok(s.p > 0.5 && s.p < pBefore, 'the estimate moved, it was not erased');
  assert.equal(s.msc.carry, 1);
});

test('three wrong answers in a row flags the skill and re-teaches it', () => {
  const s = newSkillState(false); s.seen = true;
  let ev = [];
  for (let i = 0; i < 3; i++) ev = update(s, false, 0.02, '2026-11-15', null, 9000);
  assert.ok(ev.includes('stuck')); assert.ok(s.help); assert.equal(s.seen, false);
});

const profile = (cls = 4) => ({ name: 'Test', cls, ay0: 2026, lang: 'bi', dailyQ: 18, off: [], pin: 'p:1234', autoRead: false, created: null });

test('class advances every April and caps content to the current class first', () => {
  const p = profile(4);
  assert.equal(classNow(p, new Date('2026-11-15')), 4);
  assert.equal(classNow(p, new Date('2027-03-31')), 4);
  assert.equal(classNow(p, new Date('2027-04-01')), 5);
  assert.equal(classNow(p, new Date('2030-06-01')), 8);
  const st = ensureState(SKILLS, {}, p, new Date('2026-11-15'));
  const f = frontier(SKILLS, st, 'm', 4);
  assert.ok(f.length && f.every(sk => sk.grade <= 4));
  assert.ok(st['m.tables'].fast === false && st['m.tables'].p === P.init); // class 3 is only one below: taught normally
});

test('daily mission mixes maths, a language, another subject and due reviews', () => {
  const p = profile(5), d = new Date('2026-11-15'), day = '2026-11-15';
  const st = ensureState(SKILLS, {}, p, d);
  for (const id of ['m.add3', 'm.sub3', 'e.plural']) { st[id].m = true; st[id].due = day; }
  const plan = buildMission(SKILLS, st, p, d, day);
  assert.equal(plan.length, 18);
  const strands = new Set(plan.filter(x => x.kind === 'learn').map(x => x.strand));
  assert.ok(strands.has('m') && (strands.has('e') || strands.has('h')) && strands.size >= 3);
  assert.ok(plan.filter(x => x.kind === 'review').length >= 2);
});

function simulate(accuracy, days, cls = 4, seed = 1) {
  const r = rng(seed);
  const state = freshState(); state.profile = profile(cls);
  let date = new Date('2026-11-16T10:00:00');
  const app = { skills: SKILLS, byId: BY_ID, misc: MISC, state, now: () => date, day: () => date.toISOString().slice(0, 10) };
  for (let k = 0; k < days; k++) {
    ensureState(SKILLS, state.skills, state.profile, date);
    const plan = buildMission(SKILLS, state.skills, state.profile, date, app.day());
    const s = createSession(app, plan, { mission: true, seed: k * 977 + seed });
    for (let cur = s.next(), guard = 0; cur.type !== 'done' && guard < 100; guard++) {
      if (cur.type === 'lesson') { cur = s.next(); continue; }
      const q = cur.q, ok = r() < accuracy;
      let raw;
      if (q.kind === 'order' || q.kind === 'match') { raw = q.answer.slice(); if (!ok) [raw[0], raw[1]] = [raw[1], raw[0]]; }
      else if (ok) raw = q.kind === 'mcq' ? q.answer : q.kind === 'frac' ? `${q.answer.n}/${q.answer.d}` : String(q.answer);
      else raw = q.kind === 'mcq' ? (q.answer + 1) % q.options.length : q.kind === 'frac' ? `${q.answer.n + 1}/${q.answer.d}` : q.kind === 'num' ? String(q.answer + 7) : 'zzz';
      const res = s.answer(raw); assert.ok(res.valid);
      cur = s.next();
    }
    s.finish();
    date = new Date(date.getTime() + 864e5);
  }
  return state;
}

test('simulated year: a strong learner masters the class and moves ahead; reviews keep it', () => {
  const st = simulate(0.92, 120, 4, 3);
  const cls4 = SKILLS.filter(sk => sk.grade <= 4);
  const m4 = cls4.filter(sk => st.skills[sk.id].m).length / cls4.length;
  assert.ok(m4 > 0.8, `mastered ${m4}`);
  assert.ok(SKILLS.some(sk => sk.grade >= 5 && st.skills[sk.id].m), 'moves beyond the class once it is done');
  assert.ok(Object.values(st.skills).some(s => s.st >= 2), 'spaced reviews advanced');
  assert.ok(streak(st.days, '2027-03-15', addDays) >= 100);
  const rm = roadmap(SKILLS, st.skills, st.profile, new Date('2027-03-15'), '2027-03-15');
  assert.equal(rm.rows[0].label, '2026–27'); assert.equal(rm.rows.at(-1).ay, 2030);
});

test('simulated struggling learner is flagged for help and does not race ahead', () => {
  const st = simulate(0.35, 30, 4, 5);
  assert.ok(Object.values(st.skills).some(s => s.help), 'help flags raised');
  assert.ok(!SKILLS.some(sk => sk.grade >= 6 && st.skills[sk.id].m));
  assert.ok(topMistakes(st, '2026-12-15').length > 0);
  assert.ok(weekSummary(st, '2026-12-15').n > 0);
});

test('backup round trip and refusal of foreign files', () => {
  const st = simulate(0.8, 3);
  const back = importText(exportText(st));
  assert.deepEqual(back.skills, st.skills);
  assert.throws(() => importText('{"hello":1}'), /not a KS-LEARN backup/);
  assert.throws(() => importText('nonsense'), /not a KS-LEARN backup/);
  const mem = {}; const stor = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  save(stor, st); assert.deepEqual(load(stor).state.skills, st.skills);
  mem[STORE_KEY] = '{broken';
  const res = load(stor);
  assert.equal(res.state.profile, null); assert.equal(res.recovered, true);
  assert.equal(mem[STORE_KEY + '.damaged'], '{broken', 'unreadable data is kept, not overwritten');
});

const goodPack = () => ({ id: 'sci9-motion', title: { en: 'Class 9: Motion', hi: 'कक्षा 9: गति' }, skills: [{
  id: 's.motion9', strand: 's', grade: 9, pre: ['s.force'], title: { en: 'Motion', hi: 'गति' }, tip: { en: 'Speed is distance per unit time.', hi: 'चाल प्रति इकाई समय तय की गई दूरी है।' },
  items: [
    { q: { en: 'The SI unit of speed is:', hi: 'चाल का SI मात्रक है:' }, a: { en: 'metre per second', hi: 'मीटर प्रति सेकंड' }, w: [{ en: 'newton', hi: 'न्यूटन' }, { en: 'joule', hi: 'जूल' }], x: { en: 'Speed = distance ÷ time, so m/s.', hi: 'चाल = दूरी ÷ समय, अतः m/s।' } },
    { q: { en: 'Uniform motion means:', hi: 'एकसमान गति का अर्थ है:' }, a: { en: 'equal distances in equal times', hi: 'समान समय में समान दूरी' }, w: [{ en: 'changing speed', hi: 'बदलती चाल' }, { en: 'no motion', hi: 'कोई गति नहीं' }], x: { en: 'The speed stays the same.', hi: 'चाल समान रहती है।' } },
    { q: { en: 'Acceleration is the rate of change of:', hi: 'त्वरण किसके परिवर्तन की दर है?' }, a: { en: 'velocity', hi: 'वेग' }, w: [{ en: 'mass', hi: 'द्रव्यमान' }, { en: 'distance only', hi: 'केवल दूरी' }], x: { en: 'a = change in velocity ÷ time.', hi: 'a = वेग में परिवर्तन ÷ समय।' } },
    { q: { en: 'A car covers 100 m in 5 s. Its speed is:', hi: 'एक कार 5 s में 100 m चलती है। उसकी चाल है:' }, a: { en: '20 m/s', hi: '20 m/s' }, w: [{ en: '500 m/s', hi: '500 m/s' }, { en: '5 m/s', hi: '5 m/s' }], x: { en: '100 ÷ 5 = 20 m/s.', hi: '100 ÷ 5 = 20 m/s।' } },
  ] }] });

test('content packs extend the graph only when every item passes', () => {
  assert.deepEqual(validatePack(goodPack(), SKILLS, MISC), []);
  const sk = packToSkills(goodPack())[0];
  const q = sk.gen(rng(3)); assert.equal(q.kind, 'mcq'); assert.ok(check(q, q.answer).ok);
  const bad = goodPack(); bad.skills[0].items[3].q.hi = 'एक कार 6 s में 100 m चलती है। उसकी चाल है:';
  assert.ok(validatePack(bad, SKILLS, MISC).some(e => /numbers differ/.test(e)));
  const dup = goodPack(); dup.skills[0].id = 'm.add3'; dup.skills[0].strand = 'm';
  assert.ok(validatePack(dup, SKILLS, MISC).some(e => /already exists/.test(e)));
  assert.deepEqual(validatePack({ nope: 1 }, SKILLS), ['Not a KS-LEARN content pack.']);
});
