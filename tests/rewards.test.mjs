import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, levelInfo, levelIndex, startReward, settle, isEmpty, REWARD, BADGES } from '../src/core/rewards.js';
import { freshState, sanitize } from '../src/core/store.js';

const mk = () => { const s = freshState(); s.profile = { name: 'A', cls: 4 }; return s; };
const stats = (asked, correct) => ({ asked, correct, mastered: [], stuck: [], stars: 0 });

test('levels are monotonic and map stars correctly', () => {
  for (let i = 1; i < LEVELS.length; i++) assert.ok(LEVELS[i].min > LEVELS[i - 1].min);
  assert.equal(levelIndex(0), 0); assert.equal(levelIndex(49), 0); assert.equal(levelIndex(50), 1); assert.equal(levelIndex(1e9), LEVELS.length - 1);
  const i = levelInfo(100); assert.equal(i.toNext, 50); assert.equal(i.frac, 0.5);
  assert.equal(levelInfo(99999).next, null); assert.equal(levelInfo(99999).frac, 1);
});
test('start reward is once per day', () => {
  const s = mk();
  assert.equal(startReward(s, '2026-11-16'), 1); assert.equal(startReward(s, '2026-11-16'), 0); assert.equal(startReward(s, '2026-11-17'), 1);
  assert.equal(s.stars, 2);
});
test('golden star needs a completed session with enough answers', () => {
  const s = mk();
  assert.equal(settle(s, { stats: stats(2, 2), completed: true, day: '2026-11-16', streakNow: 0 }).gold, 0);
  assert.equal(settle(s, { stats: stats(5, 3), completed: false, day: '2026-11-16', streakNow: 0 }).gold, 0);
  assert.equal(settle(s, { stats: stats(5, 3), completed: true, day: '2026-11-16', streakNow: 0 }).gold, REWARD.gold);
  assert.equal(s.stars, REWARD.gold); assert.equal(s.rw.gold, 1);
});
test('mission bonus (with streak) is paid exactly once per day', () => {
  const s = mk(); s.days['2026-11-16'] = { q: 18, c: 15, ms: 0, mq: 18, done: true };
  const a = settle(s, { day: '2026-11-16', streakNow: 3 });
  assert.equal(a.bonus, REWARD.mission + 6);
  const b = settle(s, { day: '2026-11-16', streakNow: 3 });
  assert.equal(b.bonus, 0);
  assert.equal(settle(s, { day: '2026-11-16', streakNow: 99 }).bonus, 0);
  const s2 = mk(); s2.days.d = {}; s2.days['2026-11-17'] = { q: 1, c: 1, ms: 0, mq: 1, done: true };
  assert.equal(settle(s2, { day: '2026-11-17', streakNow: 50 }).bonus, REWARD.mission + REWARD.streakCap * 2);
});
test('badges are awarded once; level-up reported once', () => {
  const s = mk(); s.log.push({ d: '2026-11-16', s: 'm.add3', ok: 1, ms: 1 }); s.stars = 120;
  const a = settle(s, { stats: stats(8, 8), completed: true, day: '2026-11-16', streakNow: 3 });
  for (const id of ['first', 'streak3', 'perfect', 'stars100']) assert.ok(a.badges.includes(id), id);
  assert.deepEqual(a.levelUp, { from: 0, to: 1 }); // 120 + 5 gold = 125 stars
  const b = settle(s, { day: '2026-11-16', streakNow: 3 });
  assert.equal(b.levelUp, null); assert.equal(b.badges.length, 0); assert.ok(isEmpty(b) || b.bonus === 0);
});
test('sanitize: old saves get rewards with level already acknowledged; junk is dropped', () => {
  const old = JSON.parse(JSON.stringify(freshState())); delete old.rw; old.stars = 400; old.profile = { name: 'A', pin: 'a'.repeat(64) };
  const st = sanitize(old); assert.equal(st.rw.lvl, 3); assert.deepEqual(st.rw.badges, {});
  old.rw = { badges: { first: '2026-11-16', evil: '2026-11-16', streak3: 'x' }, lvl: 99, bonusDay: 'no', gold: -5 };
  const s2 = sanitize(old); assert.deepEqual(s2.rw.badges, { first: '2026-11-16' }); assert.equal(s2.rw.lvl, LEVELS.length - 1); assert.equal(s2.rw.bonusDay, null); assert.equal(s2.rw.gold, 0);
});

import { hintFor, narrow, scaffoldFor, MAX_DEPTH } from '../src/core/guidance.js';
import { comebackReward } from '../src/core/rewards.js';
import { SKILLS, BY_ID, MISC } from '../src/content/index.js';
import { rng } from '../src/core/rng.js';
import { check } from '../src/core/check.js';
import { auditQuestion } from '../src/core/audit.js';

test('comeback reward counts, pays and earns the badge after 5', () => {
  const s = mk(); for (let i = 0; i < 5; i++) comebackReward(s);
  assert.equal(s.stars, 10); assert.equal(s.rw.rec, 5);
  assert.ok(settle(s, { day: '2026-11-16', streakNow: 0 }).badges.includes('comeback'));
});
test('hint: misconception fix when known, else the skill tip', () => {
  const sk = BY_ID['m.add3'];
  assert.equal(hintFor(sk, MISC, 'carry').kind, 'misconception');
  assert.equal(hintFor(sk, MISC, null).text, sk.tip);
  assert.equal(hintFor(sk, MISC, 'no_such').kind, 'tip');
});
test('narrow keeps the right answer plus one wrong option', () => {
  for (let s = 1; s < 40; s++) {
    const sk = BY_ID['s.plants'], q = sk.gen(rng(s)), n = narrow(q, rng(s));
    assert.equal(n.options.length, 2); assert.equal(n.options[n.answer].t, q.options[q.answer].t);
    assert.ok(check(n, n.answer).ok);
  }
});
test('every skill yields a valid, different, gradable scaffold; prereq scaffolds come from a prerequisite', () => {
  assert.ok(MAX_DEPTH >= 1);
  for (const sk of SKILLS) for (let s = 1; s <= 6; s++) {
    const q = sk.gen(rng(s * 101)), sc = scaffoldFor(BY_ID, sk, q, s * 977);
    assert.deepEqual(auditQuestion(sc.skill, sc.q, MISC), [], sk.id);
    if (sc.mode === 'prereq') assert.ok(sk.pre.includes(sc.skill.id), sk.id); else assert.equal(sc.skill.id, sk.id);
  }
});
test('order and match check strictly and reject malformed input', () => {
  const o = BY_ID['e.order_sent'].gen(rng(5)), m = BY_ID['t.match_capitals'].gen(rng(5));
  for (const q of [o, m]) {
    assert.ok(check(q, q.answer).ok); assert.equal(check(q, q.answer.slice(1)).valid, false);
    assert.equal(check(q, q.answer.map(() => 0)).valid, false); assert.equal(check(q, 'x').valid, false);
    const w = q.answer.slice(); [w[0], w[1]] = [w[1], w[0]]; assert.deepEqual(check(q, w), { valid: true, ok: false, trap: null });
  }
});
test('every new interactive skill has a unique correct order (no duplicate words)', () => {
  for (const id of ['e.order_sent', 'h.vakya_order']) for (let s = 1; s < 200; s++) { const q = BY_ID[id].gen(rng(s)); assert.equal(new Set(q.items.map(i => i.en)).size, q.items.length); }
});
test('scaffold for sentence order is a different sentence from the missed one', () => {
  const sk = BY_ID['e.order_sent'];
  for (let s = 1; s < 60; s++) { const q = sk.gen(rng(s)), sc = scaffoldFor(BY_ID, sk, q, s * 13); assert.notEqual(sc.q.items.map(i => i.en).sort().join(), q.items.map(i => i.en).sort().join()); }
});
