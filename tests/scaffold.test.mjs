// Recursive scaffolding: the ladder, its fading, and the evidence it writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLadder, simplerQuestion, EVIDENCE, FADE, MAX_RUNGS, evidenceFor } from '../src/core/scaffold.js';
import { SKILLS, BY_ID, MISC } from '../src/content/index.js';
import { rng } from '../src/core/rng.js';
import { auditQuestion } from '../src/core/audit.js';
import { createSession } from '../src/core/session.js';
import { ensureState } from '../src/core/planner.js';
import { freshState, sanitize } from '../src/core/store.js';
import { makePin } from '../src/core/pin.js';
import { masteryReady } from '../src/core/mastery.js';

const profile = () => ({ name: 'Test', cls: 4, ay0: 2026, lang: 'bi', dailyQ: 18, off: [], pin: makePin('1234', 'cd'.repeat(16)), created: '2026-11-16' });
const appFor = () => {
  const state = freshState(); state.profile = profile();
  const date = new Date('2026-11-16T10:00:00');
  ensureState(SKILLS, state.skills, state.profile, date);
  return { state, app: { skills: SKILLS, byId: BY_ID, misc: MISC, state, now: () => date, day: () => '2026-11-16' } };
};

test('every skill builds a short, valid ladder; every rung is a real, gradable question', () => {
  for (const sk of SKILLS) {
    const q = sk.gen(rng(17));
    const l = buildLadder({ byId: BY_ID, skill: sk, missed: { ...q, explain: q.explain || sk.tip }, seed: 5, mastery: 0.2, misc: MISC });
    assert.equal(l.skill, sk.id);
    assert.ok(l.steps.length >= 1 && l.steps.length <= MAX_RUNGS, `${sk.id}: ${l.steps.length} rungs`);
    assert.ok(l.hint && typeof l.hint.text === 'object');
    for (const [i, st] of l.steps.entries()) {
      assert.equal(st.level, i + 1);
      assert.ok(st.skill && BY_ID[st.skill.id], `${sk.id}: rung skill exists`);
      assert.deepEqual(auditQuestion(st.skill, st.q, MISC), [], `${sk.id} rung ${i + 1}`);
      assert.ok(st.evidence > 0 && st.evidence < 1, 'scaffold evidence is always weaker than a cold answer');
      assert.ok(st.q.skill === st.skill.id);
    }
    // The first rung is a prerequisite only when a prerequisite exists and is shaky.
    const hasPre = (sk.pre || []).some(id => BY_ID[id]);
    if (hasPre) assert.ok(l.steps.some(st => st.kind === 'prereq' || st.kind === 'worked'));
    else assert.equal(l.steps[0].kind, 'worked');
  }
});

test('support fades with mastery: none at the top, one rung in the middle, the full ladder when building', () => {
  const sk = BY_ID['m.add3'];
  const missed = { ...sk.gen(rng(3)), explain: sk.tip };
  assert.equal(buildLadder({ byId: BY_ID, skill: sk, missed, mastery: 0.95 }).fade, 'retry');
  assert.equal(buildLadder({ byId: BY_ID, skill: sk, missed, mastery: 0.95 }).steps.length, 0);
  assert.equal(buildLadder({ byId: BY_ID, skill: sk, missed, mastery: 0.6 }).fade, 'single');
  assert.equal(buildLadder({ byId: BY_ID, skill: sk, missed, mastery: 0.6 }).steps.length, 1);
  assert.equal(buildLadder({ byId: BY_ID, skill: sk, missed, mastery: 0.1 }).fade, 'full');
  assert.ok(buildLadder({ byId: BY_ID, skill: sk, missed, mastery: 0.1 }).steps.length >= 1);
  assert.ok(FADE.high > FADE.low);
});

test('prerequisite state orders the ladder without changing its content', () => {
  const sk = SKILLS.find(s => (s.pre || []).some(id => BY_ID[id] && BY_ID[id].gen));
  const pre = BY_ID[sk.pre.find(id => BY_ID[id] && BY_ID[id].gen)];
  const missed = { ...sk.gen(rng(4)), explain: sk.tip };
  const shaky = buildLadder({ byId: BY_ID, skill: sk, missed, mastery: 0.2, states: { [pre.id]: { p: 0.15 }, [sk.id]: { p: 0.2 } } });
  const secure = buildLadder({ byId: BY_ID, skill: sk, missed, mastery: 0.2, states: { [pre.id]: { p: 0.9 }, [sk.id]: { p: 0.2 } } });
  assert.equal(shaky.steps[0].kind, 'prereq');
  if (secure.steps.length > 1) assert.equal(secure.steps[0].kind, 'worked');
  assert.equal(shaky.steps.length, secure.steps.length);
});

test('a simpler question is never a copy of the missed one and keeps the skill tag', () => {
  for (const id of ['m.add3', 's.plants', 'e.plural']) {
    const sk = BY_ID[id];
    for (let seed = 1; seed < 12; seed++) {
      const missed = sk.gen(rng(seed * 13));
      const q = simplerQuestion(sk, missed, seed * 31);
      assert.equal(q.skill, id);
      assert.deepEqual(auditQuestion(sk, q, MISC), []);
      const key = x => JSON.stringify(x.prompt) + JSON.stringify(x.options || x.items || x.left || null);
      if (sk.gen(rng(seed * 13)).kind === 'mcq') assert.notEqual(key(q), key(missed));
    }
  }
});

test('assisted answers move the estimate, are logged with weight and rung, and never master a skill', () => {
  const { app, state } = appFor();
  const s = createSession(app, [{ kind: 'learn', strand: 'm' }], { seed: 3 });
  s.next(); // lesson
  const cur = s.next();
  assert.equal(cur.type, 'q');
  const id = cur.skill.id;
  const beforeN = state.skills[id].n;
  for (let lvl = 1; lvl <= 4; lvl++) {
    const r = s.assisted({ skill: id, ok: true, guess: 0.25, level: lvl, ms: 1500, weight: evidenceFor('worked') });
    assert.ok(r.weight > 0 && r.weight < 1);
  }
  const sk = state.skills[id];
  assert.equal(sk.n, beforeN, 'graded count unchanged');
  assert.equal(sk.scn, 4);
  assert.equal(sk.scl, 4);
  assert.equal(masteryReady(sk), false);
  const rows = state.log.filter(r => r.s === id && r.a === 1);
  assert.equal(rows.length, 4);
  assert.ok(rows.every(r => r.w > 0 && r.w < 1 && r.lv >= 1 && r.lv <= 4));
  assert.equal(state.days['2026-11-16'].h, 4);
  // Round trip keeps the assist trail and the deepest rung.
  const back = sanitize(JSON.parse(JSON.stringify(state)));
  assert.equal(back.skills[id].scl, 4);
  assert.equal(back.skills[id].scn, 4);
  assert.deepEqual(back.log.filter(r => r.a === 1).map(r => r.lv), [1, 2, 3, 4]);
});

test('the session stays with one skill until it is mastered or set aside', () => {
  const { app } = appFor();
  const s = createSession(app, Array.from({ length: 12 }, () => ({ kind: 'learn', strand: 'm' })), { seed: 11 });
  const asked = [];
  for (let cur = s.next(); cur.type !== 'done' && asked.length < 8; cur = s.next()) {
    if (cur.type !== 'q') continue;
    asked.push(cur.skill.id);
    const raw = cur.q.kind === 'mcq' ? (cur.q.answer + 1) % cur.q.options.length : cur.q.kind === 'text' ? 'zzz' : '999999';
    s.answer(raw); // wrong: after three the skill is set aside
  }
  assert.ok(asked[0] === asked[1] && asked[1] === asked[2], `stayed with the skill: ${asked}`);
  assert.ok(new Set(asked).size >= 2, 'moved on after getting stuck');
  assert.equal(EVIDENCE.retry, 0.75);
});
