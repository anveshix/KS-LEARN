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
