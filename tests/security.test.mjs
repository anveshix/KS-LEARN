// Hardening tests: untrusted input (backups, storage, packs, typed answers) and the parent lock.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { SKILLS, BY_ID, MISC } from '../src/content/index.js';
import { check, parseNum } from '../src/core/check.js';
import { sanitize, freshState, importText, exportText, keepUndo, readUndo, save, STORE_KEY, MAX_IMPORT_BYTES } from '../src/core/store.js';
import { sha256, hex, makePin, verifyPin, needsUpgrade, recordAttempt, lockedFor, LOCK_AFTER } from '../src/core/pin.js';
import { validatePack } from '../src/core/packs.js';
import { ensureState, buildMission } from '../src/core/planner.js';
import { createSession } from '../src/core/session.js';
import { newSkillState } from '../src/core/mastery.js';

const prof = () => ({ name: 'Test', cls: 4, ay0: 2026, lang: 'bi', dailyQ: 18, pin: makePin('1234', 'ab'.repeat(16)), off: [], created: '2026-11-16' });
const wrap = state => JSON.stringify({ app: 'ks-learn', state });

test('SHA-256 matches the reference implementation', () => {
  for (const s of ['', 'abc', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(119), 'x'.repeat(1000), 'हिंदी ₹ 😀']) assert.equal(hex(sha256(s)), createHash('sha256').update(s).digest('hex'));
});

test('PIN: salted, never stored in clear, old formats still open and are flagged for upgrade', () => {
  const a = makePin('1234'), b = makePin('1234');
  assert.notEqual(a.h, b.h, 'two devices with the same PIN store different hashes');
  assert.ok(!JSON.stringify(a).includes('1234'));
  assert.ok(verifyPin('1234', a)); assert.ok(!verifyPin('1235', a)); assert.ok(!verifyPin('', a));
  const legacy = createHash('sha256').update('ks-learn:4321').digest('hex');
  assert.ok(verifyPin('4321', legacy)); assert.ok(verifyPin('4321', 'p:4321')); assert.ok(needsUpgrade(legacy)); assert.ok(!needsUpgrade(a));
  assert.ok(!verifyPin('1234', null)); assert.ok(!verifyPin('1234', {}));
});

test('PIN attempts are limited with a growing wait', () => {
  let lock = { f: 0, until: 0 };
  for (let i = 0; i < LOCK_AFTER - 1; i++) lock = recordAttempt(lock, false, 1000);
  assert.equal(lockedFor(lock, 1000), 0);
  lock = recordAttempt(lock, false, 1000); assert.equal(lockedFor(lock, 1000), 60);
  lock = recordAttempt(lock, false, 1000); assert.equal(lockedFor(lock, 1000), 120);
  for (let i = 0; i < 20; i++) lock = recordAttempt(lock, false, 1000);
  assert.equal(lockedFor(lock, 1000), 900, 'capped at 15 minutes');
  assert.deepEqual(recordAttempt(lock, true, 5000), { f: 0, until: 0 });
});

test('sanitize rebuilds state field by field and drops everything unexpected', () => {
  const evil = JSON.parse(`{"v":2,"profile":{"name":"<img src=x onerror=alert(1)>\\u0000 and a very long name","cls":99,"ay0":"x","lang":"xx","dailyQ":1e9,"pin":"p:1234","off":["m","zz","e","h","s","l","c","g"],"admin":true},
    "skills":{"__proto__":{"m":true},"constructor":{"p":1},"m.add3":{"p":"NaN","n":-5,"c":99,"m":"yes","due":"tomorrow","st":44,"msc":{"__proto__":1,"carry":"3","bad key!":2},"recent":[1,2,3,4,5,6,7,8,9,10,11]},"m.ok":{"p":0.9,"n":4,"c":3,"m":true}},
    "log":[{"d":"2026-11-16","s":"m.add3","ok":1,"ms":1e12,"m":"<script>"},{"d":"bad","s":"m.add3"},"junk",null],
    "days":{"2026-11-16":{"q":5,"c":99,"done":"true"},"__proto__":{"q":1},"junk":{"q":1}},
    "stars":-4,"asks":[{"d":"2026-11-16","s":"m.add3","q":"${'q'.repeat(2000)}"},{"d":1}],"packs":"nope","lock":{"f":-1,"until":"x"},"extra":{"a":1}}`);
  const st = sanitize(evil);
  assert.equal(st.profile.name.length, 20); assert.ok(!/[\u0000-\u001f]/.test(st.profile.name));
  assert.equal(st.profile.cls, 12); assert.equal(st.profile.lang, 'bi'); assert.equal(st.profile.dailyQ, 60);
  assert.equal(st.profile.off.length, 7, 'at least one subject always stays on'); assert.equal(st.profile.admin, undefined);
  assert.deepEqual(Object.keys(st.skills).sort(), ['m.add3', 'm.ok']);
  assert.equal(Object.getPrototypeOf(st.skills), Object.prototype); assert.equal({}.m, undefined, 'no prototype pollution');
  const a = st.skills['m.add3'];
  assert.equal(a.p, 0.2); assert.equal(a.n, 0); assert.equal(a.c, 0); assert.equal(a.m, false); assert.equal(a.due, null); assert.equal(a.st, 5);
  assert.deepEqual(a.msc, { carry: 3 }); assert.equal(a.recent.length, 8);
  assert.equal(st.log.length, 1); assert.equal(st.log[0].ms, 180000); assert.equal(st.log[0].m, undefined);
  assert.deepEqual(Object.keys(st.days), ['2026-11-16']); assert.equal(st.days['2026-11-16'].c, 5); assert.equal(st.days['2026-11-16'].done, false);
  assert.equal(st.stars, 0); assert.equal(st.asks.length, 1); assert.equal(st.asks[0].q.length, 400);
  assert.deepEqual(st.packs, []); assert.deepEqual(st.lock, { f: 0, until: 0 }); assert.equal(st.extra, undefined);
  assert.equal(sanitize(null), null); assert.equal(sanitize([]), null); assert.equal(sanitize({ v: 4, skills: {} }), null);
  assert.equal(sanitize({ v: 2, skills: {}, profile: { name: 'A', pin: 'not-a-hash' } }).profile, null, 'a profile without a valid PIN record is refused');
});

test('a sanitized hostile state still runs a full session', () => {
  const st = sanitize({ v: 2, profile: prof(), skills: { 'm.add3': { p: 5, n: 1e9, m: true }, 'zz.ghost': {}, 'x.gone': { m: true, due: '2020-01-01' } }, days: {}, log: [] });
  const date = new Date('2026-11-16T10:00:00');
  const app = { skills: SKILLS, byId: BY_ID, misc: MISC, state: st, now: () => date, day: () => '2026-11-16' };
  ensureState(SKILLS, st.skills, st.profile, date);
  const s = createSession(app, buildMission(SKILLS, st.skills, st.profile, date, '2026-11-16'), { mission: true, seed: 5, goal: 18 });
  let n = 0;
  for (let cur = s.next(); cur.type !== 'done' && n < 200; cur = s.next()) { if (cur.type === 'q') { assert.ok(s.answer(cur.q.kind === 'mcq' ? cur.q.answer : cur.q.kind === 'frac' ? `${cur.q.answer.n}/${cur.q.answer.d}` : String(cur.q.answer)).valid); n++; } }
  assert.equal(n, 18); assert.equal(st.days['2026-11-16'].done, true); assert.equal(st.days['2026-11-16'].mq, 18);
});

test('import refuses oversized, foreign and newer-version files; export never carries the lock state', () => {
  assert.throws(() => importText('x'.repeat(MAX_IMPORT_BYTES + 1)), /too large/);
  assert.throws(() => importText(wrap({ v: 4, skills: {}, profile: prof() })), /newer version/);
  assert.throws(() => importText(wrap({ v: 2, skills: {} })), /not a KS-LEARN backup/);
  assert.throws(() => importText('[1,2]'), /not a KS-LEARN backup/);
  assert.throws(() => importText(42), /not a KS-LEARN backup/);
  const st = freshState(); st.profile = prof(); st.lock = { f: 9, until: 9e12 };
  assert.deepEqual(importText(exportText(st)).lock, { f: 0, until: 0 });
});

test('undo copy survives a restore or erase', () => {
  const mem = {}, stor = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  const st = freshState(); st.profile = prof(); st.stars = 77; save(stor, st);
  assert.ok(keepUndo(stor)); delete mem[STORE_KEY];
  assert.equal(readUndo(stor).stars, 77);
  assert.equal(readUndo({ getItem: () => '{bad' }), null);
});

test('mission progress counts per answer, and practice does not complete the mission', () => {
  const st = freshState(); st.profile = prof();
  const date = new Date('2026-11-16T10:00:00'), app = { skills: SKILLS, byId: BY_ID, misc: MISC, state: st, now: () => date, day: () => '2026-11-16' };
  ensureState(SKILLS, st.skills, st.profile, date);
  const right = q => (q.kind === 'mcq' ? q.answer : q.kind === 'frac' ? `${q.answer.n}/${q.answer.d}` : String(q.answer));
  const drive = (s, max) => { let n = 0; for (let cur = s.next(); cur.type !== 'done' && n < max; cur = s.next()) if (cur.type === 'q') { s.answer(right(cur.q)); n++; } return n; };
  drive(createSession(app, Array.from({ length: 20 }, () => ({ kind: 'learn', strand: 'm' })), { seed: 1 }), 20);
  assert.equal(st.days['2026-11-16'].q, 20); assert.equal(st.days['2026-11-16'].mq, 0); assert.equal(st.days['2026-11-16'].done, false);
  const plan = buildMission(SKILLS, st.skills, st.profile, date, '2026-11-16');
  drive(createSession(app, plan, { mission: true, seed: 2, goal: 18 }), 17);   // app closed before the last question
  assert.equal(st.days['2026-11-16'].done, false);
  drive(createSession(app, buildMission(SKILLS, st.skills, { ...st.profile, dailyQ: 1 }, date, '2026-11-16'), { mission: true, seed: 3, goal: 18 }), 1);
  assert.equal(st.days['2026-11-16'].done, true, 'done as soon as the last answer is given, without a finish screen');
});

test('a stuck skill is set aside for the rest of the session instead of repeating', () => {
  const st = freshState(); st.profile = prof();
  const date = new Date('2026-11-16T10:00:00'), app = { skills: SKILLS, byId: BY_ID, misc: MISC, state: st, now: () => date, day: () => '2026-11-16' };
  ensureState(SKILLS, st.skills, st.profile, date);
  const s = createSession(app, Array.from({ length: 10 }, () => ({ kind: 'learn', strand: 'm' })), { seed: 9 });
  const asked = [];
  for (let cur = s.next(); cur.type !== 'done'; cur = s.next()) if (cur.type === 'q') { asked.push(cur.skill.id); s.answer(cur.q.kind === 'mcq' ? (cur.q.answer + 1) % cur.q.options.length : cur.q.kind === 'text' ? 'zzz' : '999999'); }
  assert.equal(asked.length, 10);
  assert.ok(new Set(asked).size >= 3, `moved on after getting stuck: ${[...new Set(asked)]}`);
  assert.ok(asked.slice(0, 3).every(id => id === asked[0]) && asked[3] !== asked[0]);
  assert.ok(st.skills[asked[0]].help);
});

test('answers: blank input is never graded, long input is refused', () => {
  const q = { kind: 'mcq', options: [{ t: 'a' }, { t: 'b' }], answer: 0 };
  for (const raw of ['', ' ', null, undefined, 'a', '-1', '2', 1.5, {}]) assert.equal(check(q, raw).valid, false, JSON.stringify(raw));
  assert.ok(check(q, 0).ok); assert.ok(check(q, '0').ok); assert.ok(!check(q, 1).ok);
  assert.equal(parseNum('9'.repeat(41)), null); assert.equal(parseNum('₹1,25,000'), 125000); assert.equal(parseNum('१२.५'), 12.5); assert.equal(parseNum('1e3'), null);
  assert.equal(check({ kind: 'text', answer: 'went' }, 'x'.repeat(61)).valid, false);
});

test('packs: hostile shapes are rejected, never thrown on', () => {
  const item = { q: { en: 'Q?', hi: 'प्रश्न?' }, a: { en: 'A', hi: 'अ' }, w: [{ en: 'B', hi: 'ब' }, { en: 'C', hi: 'स' }], x: { en: 'Because.', hi: 'क्योंकि।' } };
  const mk = over => ({ id: 'p1', skills: [{ id: 's.new1', strand: 's', grade: 6, pre: [], title: { en: 'T', hi: 'शीर्षक' }, tip: { en: 'Tip', hi: 'संकेत' }, items: [item, item, item, item], ...over }] });
  for (const bad of [null, 5, 'x', [], {}, { id: 'p', skills: 'x' }, { id: '<b>', skills: [{}] }, { id: 'p', skills: [null] }, { id: 'p', skills: [5] }, mk({ id: '__proto__' }), mk({ pre: 'm.add3' }), mk({ items: [null, 1, 'x', {}] }),
    mk({ grade: '6; drop' }), mk({ items: Array(501).fill(item) }), mk({ items: [{ ...item, q: { en: 'x'.repeat(1300), hi: 'य' } }, item, item, item] }), { id: 'p', skills: Array(301).fill(mk().skills[0]) }]) {
    let errs; assert.doesNotThrow(() => { errs = validatePack(bad, SKILLS, MISC); }); assert.ok(errs.length > 0, JSON.stringify(bad).slice(0, 60));
  }
  const loop = { id: 'p2', skills: [{ ...mk().skills[0], id: 's.aa', pre: ['s.bb'] }, { ...mk().skills[0], id: 's.bb', pre: ['s.aa'] }] };
  assert.ok(validatePack(loop, SKILLS, MISC).some(e => /loop/.test(e)));
});

test('early practice of a mastered skill never stretches its review gap', async () => {
  const { update } = await import('../src/core/mastery.js');
  const s = { ...newSkillState(false), m: true, st: 1, due: '2026-12-01', p: 0.97 };
  update(s, true, 0.25, '2026-11-20', null, 1000);
  assert.equal(s.st, 1); assert.equal(s.due, '2026-12-01');
  update(s, true, 0.25, '2026-12-01', null, 1000);
  assert.equal(s.st, 2); assert.equal(s.due, '2026-12-13');
});
