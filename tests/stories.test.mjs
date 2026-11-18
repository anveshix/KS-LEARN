// Moral stories: graph integrity, every path ending safely, and a privacy rule that holds.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORIES, STORY_ID, STORY_STARS, storyById, validateStories, newRun, nodeOf, choose,
  markStorySeen, markStoryDone, noteReflection, storyProgress, storySummary,
} from '../src/core/stories.js';
import { BY_ID } from '../src/content/index.js';
import { freshState, sanitize } from '../src/core/store.js';
import { settle } from '../src/core/rewards.js';

const D1 = '2026-11-17', D2 = '2026-11-18';

// Every path through a story, as a list of choice indices, plus any structural trouble.
function allPaths(story) {
  const out = [];
  const walk = (id, route, seen) => {
    const node = story.nodes[id];
    if (!node) { out.push({ trouble: 'missing', at: id }); return; }
    if (node.end) { out.push({ route, end: id, depth: route.length }); return; }
    if (!Array.isArray(node.choices) || !node.choices.length) { out.push({ trouble: 'stuck', at: id }); return; }
    for (const [i, c] of node.choices.entries()) {
      if (seen.has(c.next)) { out.push({ trouble: 'cycle', at: c.next }); continue; }
      walk(c.next, route.concat(i), new Set([...seen, c.next]));
    }
  };
  walk(story.start, [], new Set([story.start]));
  return out;
}

test('the four stories are complete, bilingual graphs', () => {
  assert.deepEqual(validateStories(STORIES, BY_ID), []);
  assert.equal(STORIES.length, 4);
  assert.equal(new Set(STORIES.map(s => s.id)).size, 4);
  for (const s of STORIES) {
    assert.match(s.id, STORY_ID);
    assert.ok(s.title.en && s.title.hi && s.blurb.en && s.blurb.hi && s.place.en && s.place.hi);
    assert.ok(s.grade >= 3 && s.grade <= 6);
    assert.ok(Object.keys(s.nodes).length >= 8, `${s.id} has a real graph`);
    assert.ok(s.nodes[s.start], `${s.id} starts where it says`);
  }
  assert.equal(storyById('story.paratha').grade, 4);
  assert.equal(storyById('story.nope'), null);
  assert.equal(STORY_STARS, 2);
});

test('every ending has a lesson and a reflection, and nothing is graded', () => {
  for (const s of STORIES) {
    const endings = Object.values(s.nodes).filter(n => n.end);
    assert.ok(endings.length >= 4, `${s.id} has several honest endings`);
    for (const e of endings) {
      assert.ok(e.lesson && e.lesson.en && e.lesson.hi, `${s.id} lesson bilingual`);
      assert.ok(e.reflection && e.reflection.q && e.reflection.q.en && e.reflection.q.hi);
      assert.ok(e.reflection.options.length >= 2 && e.reflection.options.length <= 4);
      for (const o of e.reflection.options) assert.ok(o.en && o.hi, 'reflection options bilingual');
      assert.equal(e.choices, undefined, 'an ending does not keep asking');
      assert.equal(e.correct, undefined, 'no option is marked correct');
      assert.equal(e.score, undefined);
    }
  }
});

test('every path from the start reaches an ending, and no path loops', () => {
  for (const s of STORIES) {
    const paths = allPaths(s);
    const endings = Object.values(s.nodes).filter(n => n.end).length;
    assert.equal(paths.filter(p => p.trouble).length, 0, `${s.id}: ${JSON.stringify(paths.filter(p => p.trouble))}`);
    assert.ok(paths.length >= endings, `${s.id} reaches every ending by at least one path`);
    assert.equal(new Set(paths.map(p => p.end)).size, endings, `${s.id}: every ending is reachable`);
    for (const p of paths) {
      assert.ok(p.depth <= 6, `${s.id} does not drag on (${p.depth} choices)`);
      assert.ok(p.route.every(i => Number.isInteger(i) && i >= 0 && i <= 2));
    }
    // Re-run with every choice index to prove no index is a dead end.
    for (const node of Object.values(s.nodes)) {
      if (node.end) continue;
      assert.ok(node.choices.length >= 2 && node.choices.length <= 3);
      for (const c of node.choices) assert.ok(s.nodes[c.next], 'no dangling choice');
    }
  }
});

test('the in-memory runner walks choices and refuses impossible ones', () => {
  const s = storyById('story.purse');
  let run = newRun(s);
  assert.equal(run.node, s.start);
  assert.equal(run.done, false);
  assert.equal(run.path.length, 0);
  assert.ok(nodeOf(s, run).text);
  assert.equal(choose(s, run, 9).valid, false);
  assert.equal(choose(s, { ...run, done: true }, 0).valid, false, 'a finished run cannot be pushed further');
  assert.equal(choose(null, run, 0).valid, false);
  const first = choose(s, run, 0);
  assert.equal(first.valid, true);
  assert.equal(first.run.path.length, 1);
  assert.equal(first.run.path[0].choice, 0);
  assert.deepEqual(run.path, [], 'the old run is not mutated');
  let guard = 0;
  while (!run.done && guard++ < 10) {
    const r = choose(s, run, 0);
    assert.equal(r.valid, true);
    run = r.run;
  }
  assert.equal(run.done, true);
  assert.ok(nodeOf(s, run).end);
  assert.equal(choose(s, run, 0).valid, false);
});

test('progress counts only seen, finished and reflected — never the path', () => {
  const st = freshState();
  assert.equal(markStorySeen(st, 'story.purse', D1).seen, D1);
  assert.equal(markStoryDone(st, 'story.purse', D1), true);
  assert.equal(markStoryDone(st, 'story.purse', D2), false, 'finishing again is not a first time');
  assert.equal(st.stories['story.purse'].done, D1, 'the first finish is kept');
  assert.equal(noteReflection(st, 'story.purse'), 1);
  assert.equal(noteReflection(st, 'story.purse'), 2);
  assert.equal(storyProgress(st, 'story.purse').reflections, 2);
  assert.deepEqual(Object.keys(st.stories['story.purse']).sort(), ['done', 'reflections', 'seen']);
  assert.equal(markStorySeen(st, 'story.fake', D1), null);
  assert.equal(noteReflection(st, 'evil'), 0);
  assert.equal(st.stories['evil'], undefined);
  const sum = storySummary(st);
  assert.deepEqual(sum, { total: 4, seen: 1, done: 1, reflections: 2 });
});

test('a saved story record cannot smuggle the child\'s choices back in', () => {
  const raw = freshState();
  raw.stories = {
    'story.purse': { seen: D1, done: D1, reflections: 2, path: [{ node: 'start', choice: 2 }], choice: 2, virtue: 'honest' },
    'story.fake': { seen: D1, done: D1, reflections: 1 },
    'evil': { seen: D1 },
    'story.cricket': { seen: 'not-a-day', done: D2, reflections: 1e9 },
  };
  const clean = sanitize(raw);
  assert.deepEqual(Object.keys(clean.stories).sort(), ['story.cricket', 'story.purse']);
  assert.deepEqual(Object.keys(clean.stories['story.purse']).sort(), ['done', 'reflections', 'seen']);
  assert.equal(clean.stories['story.purse'].path, undefined);
  assert.equal(clean.stories['story.purse'].virtue, undefined);
  assert.equal(clean.stories['story.purse'].choice, undefined);
  assert.equal(clean.stories['story.cricket'].seen, undefined);
  assert.equal(clean.stories['story.cricket'].done, D2);
  assert.equal(clean.stories['story.cricket'].reflections, 1e5);
});

test('story badges fire from finished stories through settle', () => {
  const st = freshState();
  st.days[D1] = { q: 0, c: 0, mq: 0, done: false };
  assert.ok(!settle(st, { day: D1, streakNow: 0 }).badges.includes('story1'));
  markStoryDone(st, 'story.purse', D1);
  assert.ok(settle(st, { day: D1, streakNow: 0 }).badges.includes('story1'));
  markStoryDone(st, 'story.paratha', D1);
  markStoryDone(st, 'story.cricket', D1);
  const three = settle(st, { day: D1, streakNow: 0 });
  assert.ok(three.badges.includes('story3'));
  assert.equal(storySummary(st).done, 3);
});
