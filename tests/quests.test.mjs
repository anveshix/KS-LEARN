// Daily quests: self-chosen goals, deterministic offers, no loss and no streak.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUESTS, QUEST_IDS, questById, offerFor, freshQuests, ensureQuests, metricValue,
  questProgress, pickQuest, claimQuest, questTotal,
} from '../src/core/quests.js';
import { freshState, sanitize } from '../src/core/store.js';
import { settle } from '../src/core/rewards.js';
import { freshWellbeing, noteBreak } from '../src/core/wellbeing.js';

const D1 = '2026-11-17', D2 = '2026-11-18';
const blank = () => {
  const st = freshState();
  st.days[D1] = { q: 0, c: 0, mq: 0, done: false };
  st.wellbeing = freshWellbeing(D1);
  return st;
};

test('five quests cover five different ways of taking part', () => {
  assert.equal(QUESTS.length, 5);
  assert.equal(new Set(QUEST_IDS).size, 5);
  assert.deepEqual([...new Set(QUESTS.map(q => q.metric))].sort(), ['calm', 'labs', 'mastered', 'questions', 'stories']);
  for (const q of QUESTS) {
    assert.ok(q.title.en && q.title.hi && q.desc.en && q.desc.hi);
    assert.ok(q.goal >= 1 && q.stars >= 1 && q.stars <= 5);
    assert.ok(q.icon);
  }
  assert.equal(questById('q.questions').goal, 12);
  assert.equal(questById('q.master').stars, 5);
  assert.equal(questById('nope'), null);
});

test('three distinct offers rotate predictably and every quest appears', () => {
  const seen = new Set();
  let previous = null;
  for (let i = 0; i < 30; i++) {
    const day = `2026-11-${String(i + 1).padStart(2, '0')}`;
    const a = offerFor(day), b = offerFor(day);
    assert.deepEqual(a.map(q => q.id), b.map(q => q.id), 'the same day gives the same offers');
    assert.equal(a.length, 3);
    assert.equal(new Set(a.map(q => q.id)).size, 3, 'offers are distinct');
    for (const q of a) { assert.ok(QUEST_IDS.includes(q.id)); seen.add(q.id); }
    if (previous) assert.notDeepEqual(a.map(q => q.id), previous, 'offers do move');
    previous = a.map(q => q.id);
  }
  assert.equal(seen.size, 5, 'every quest is offered at some point in a month');
});

test('a quest is picked before progress, and cannot be taken away after it', () => {
  const st = blank(), day = D1;
  const offers = offerFor(day);
  assert.equal(questProgress(st, day).picked, false);
  const notOffered = QUEST_IDS.find(id => !offers.some(q => q.id === id));
  assert.equal(pickQuest(st, day, notOffered).reason, 'not-offered');
  assert.equal(pickQuest(st, day, offers[0].id).ok, true);
  assert.equal(st.quests.id, offers[0].id);
  assert.equal(questProgress(st, day).canSwitch, true, 'before any progress, a change is allowed');
  assert.equal(pickQuest(st, day, offers[1].id).ok, true);
  assert.equal(st.quests.id, offers[1].id, 'switching before progress changes the quest');
  const def = questById(st.quests.id);
  if (def.metric === 'questions') st.days[day].q = 3;
  if (def.metric === 'mastered') st.skills.s1 = { m: 1, mst: day };
  if (def.metric === 'labs') st.labs.l1 = { seen: day, done: day };
  if (def.metric === 'stories') st.stories['story.purse'] = { seen: day, done: day };
  if (def.metric === 'calm') { st.wellbeing.breaksToday = 1; st.wellbeing.breaks = 1; }
  assert.equal(questProgress(st, day).current, 1);
  assert.equal(questProgress(st, day).canSwitch, false);
  assert.equal(pickQuest(st, day, offers[0].id).reason, 'started');
  assert.equal(st.quests.id, offers[1].id, 'a started quest stays');
});

test('claim is once, only when complete, and never costs the child anything', () => {
  const st = blank(), day = D1;
  const pick = offerFor(day)[0];
  pickQuest(st, day, pick.id);
  assert.equal(claimQuest(st, day).reason, 'not-complete');
  const before = st.stars;
  // Reach this quest's goal by its own metric.
  if (pick.metric === 'questions') st.days[day].q = pick.goal;
  if (pick.metric === 'mastered') st.skills.s1 = { m: 1, mst: day };
  if (pick.metric === 'labs') st.labs.l1 = { seen: day, done: day };
  if (pick.metric === 'stories') st.stories['story.purse'] = { seen: day, done: day };
  if (pick.metric === 'calm') { st.wellbeing.breaksToday = 1; st.wellbeing.breaks = 1; }
  const prog = questProgress(st, day);
  assert.equal(prog.complete, true);
  assert.equal(prog.pct, 1);
  const r = claimQuest(st, day);
  assert.equal(r.ok, true);
  assert.equal(r.stars, pick.stars);
  assert.equal(st.stars, before + pick.stars);
  assert.equal(st.quests.total, 1);
  assert.equal(st.quests.done, true);
  assert.equal(claimQuest(st, day).reason, 'done');
  assert.equal(st.stars, before + pick.stars, 'stars are paid once');
  assert.equal(pickQuest(st, day, offerFor(day)[1].id).reason, 'done');
  assert.equal(questTotal(st), 1);
});

test('a new day clears the choice but keeps the honest total', () => {
  const st = blank();
  const pick = offerFor(D1)[0];
  pickQuest(st, D1, pick.id);
  const done = { ...st, quests: { ...st.quests, done: true, total: 4 } };
  assert.equal(questProgress(done, D2).picked, false, 'tomorrow starts open');
  assert.equal(ensureQuests(done, D2).total, 4, 'the total is not lost');
  done.days[D2] = { q: 0, c: 0, mq: 0, done: false };
  assert.equal(pickQuest(done, D2, offerFor(D2)[0].id).ok, true);
});

test('each metric reads the same thing the rest of the app records', () => {
  const st = blank(), day = D1;
  st.days[day].q = 7;
  assert.equal(metricValue(st, 'questions', day), 7);
  assert.equal(metricValue(st, 'questions', D2), 0);
  st.skills.a = { m: 1, mst: day }; st.skills.b = { m: 1, mst: D2 };
  assert.equal(metricValue(st, 'mastered', day), 1);
  st.labs.x = { done: day };
  assert.equal(metricValue(st, 'labs', day), 1);
  st.stories['story.purse'] = { done: day };
  assert.equal(metricValue(st, 'stories', day), 1);
  noteBreak(st, { day, layer: 'prana' });
  assert.equal(metricValue(st, 'calm', day), 1);
  assert.equal(metricValue(st, 'calm', D2), 0, 'yesterday\'s pauses do not fill today\'s goal');
  assert.equal(metricValue(st, 'unknown', day), 0);
  assert.equal(questProgress(st, day).picked, false);
});

test('hostile saved quests are repaired, and no imaginary quest survives', () => {
  const st = blank();
  st.quests = { day: 'x', id: 'q.evil', done: true, total: 1e12 };
  const clean = sanitize(st);
  assert.equal(clean.quests.day, null);
  assert.equal(clean.quests.id, null);
  assert.equal(clean.quests.done, false, 'a done flag without a real quest is dropped');
  assert.equal(clean.quests.total, 1e6);
  const clean2 = sanitize({ ...freshState(), quests: { day: D1, id: 'q.calm', done: 'yes', total: -3 } });
  assert.equal(clean2.quests.id, 'q.calm');
  assert.equal(clean2.quests.done, false, 'only a literal true counts');
  assert.equal(clean2.quests.total, 0);
  const fresh = freshQuests(D1);
  assert.deepEqual(fresh, { day: D1, id: null, done: false, total: 0 });
});

test('quest badges fire from the total, not from chaining days', () => {
  const st = blank(), day = D1;
  st.quests = { day, id: 'q.calm', done: true, total: 1 };
  const first = settle(st, { day, streakNow: 0 });
  assert.ok(first.badges.includes('quest1'));
  st.quests.total = 5;
  const five = settle(st, { day, streakNow: 0 });
  assert.ok(five.badges.includes('quest5'));
  assert.equal(st.quests.total, 5);
});
