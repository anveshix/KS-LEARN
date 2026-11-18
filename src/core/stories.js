// Moral-dilemma stories: graph validation, an in-memory choice runner, and progress.
// The choice path is deliberately *not* stored. Keeping "which moral option the child picked"
// would build a behavioural profile of a child on a shared device; only "seen", "finished"
// and "reflection done" are kept, and the parent sees counts, never answers.
import { STORIES } from '../content/stories.js';

export { STORIES };
export const STORY_ID = /^story\.[a-z0-9_]{1,30}$/;
export const STORY_STARS = 2;

export const storyById = id => STORIES.find(s => s.id === id) || null;

const text = v => !!v && typeof v.en === 'string' && typeof v.hi === 'string' && v.en.trim().length > 0 && v.hi.trim().length > 0;

export function validateStories(stories, byId = null) {
  const issues = [], seenIds = new Set();
  if (!Array.isArray(stories) || !stories.length) return ['no stories'];
  for (const [i, story] of stories.entries()) {
    const at = story && story.id || `story[${i}]`;
    if (!story || typeof story !== 'object') { issues.push(`${at}: not an object`); continue; }
    if (!STORY_ID.test(story.id || '')) issues.push(`${at}: bad id`);
    if (seenIds.has(story.id)) issues.push(`${at}: duplicate id`);
    seenIds.add(story.id);
    if (!text(story.title) || !text(story.blurb) || !text(story.place)) issues.push(`${at}: title, blurb and place must be bilingual`);
    if (!Number.isInteger(story.grade) || story.grade < 3 || story.grade > 9) issues.push(`${at}: grade must be 3..9`);
    if (story.skill && byId && !byId[story.skill]) issues.push(`${at}: unknown skill ${story.skill}`);
    const nodes = story.nodes;
    if (!nodes || typeof nodes !== 'object' || Array.isArray(nodes)) { issues.push(`${at}: no nodes`); continue; }
    if (!nodes[story.start]) issues.push(`${at}: start node missing`);
    const keys = Object.keys(nodes);
    if (keys.length < 5) issues.push(`${at}: needs at least five nodes`);
    let endings = 0;
    for (const key of keys) {
      const node = nodes[key];
      if (!node || typeof node !== 'object') { issues.push(`${at}.${key}: not a node`); continue; }
      if (!text(node.text)) issues.push(`${at}.${key}: text must be bilingual`);
      const hasChoices = Array.isArray(node.choices) && node.choices.length > 0;
      if (node.end === true) {
        endings++;
        if (hasChoices) issues.push(`${at}.${key}: an ending cannot have choices`);
        if (!text(node.lesson)) issues.push(`${at}.${key}: ending needs a bilingual lesson`);
        if (!node.reflection || !text(node.reflection.q)) issues.push(`${at}.${key}: ending needs a reflection question`);
        else if (!Array.isArray(node.reflection.options) || node.reflection.options.length < 2 || node.reflection.options.length > 4) issues.push(`${at}.${key}: reflection needs 2..4 options`);
        else if (node.reflection.options.some(o => !text(o))) issues.push(`${at}.${key}: reflection options must be bilingual`);
      } else {
        if (!hasChoices) { issues.push(`${at}.${key}: a non-ending needs choices`); continue; }
        if (node.choices.length < 2 || node.choices.length > 3) issues.push(`${at}.${key}: needs 2..3 choices`);
        for (const [j, ch] of node.choices.entries()) {
          if (!text(ch.label)) issues.push(`${at}.${key}#${j}: choice label must be bilingual`);
          if (!ch.next || !nodes[ch.next]) issues.push(`${at}.${key}#${j}: points at a missing node`);
        }
      }
    }
    if (endings < 2) issues.push(`${at}: needs at least two endings`);
    // Reachability, and a cycle check; a cycle would let a child loop forever.
    if (nodes[story.start]) {
      const colour = new Map(), reachable = new Set();
      const walk = (key, stack) => {
        if (colour.get(key) === 'grey') { issues.push(`${at}: cycle through ${key}`); return; }
        if (colour.get(key) === 'black') return;
        colour.set(key, 'grey'); reachable.add(key);
        for (const ch of (nodes[key].choices || [])) if (nodes[ch.next]) walk(ch.next, stack.concat(key));
        colour.set(key, 'black');
      };
      walk(story.start, []);
      for (const key of keys) if (!reachable.has(key)) issues.push(`${at}.${key}: unreachable from start`);
    }
  }
  return issues;
}

// A run lives only in memory. No node ids or choices are written to storage.
export const newRun = story => ({ id: story.id, node: story.start, path: [], done: false });

export function nodeOf(story, run) {
  if (!story || !run || !story.nodes) return null;
  return story.nodes[run.node] || null;
}

export function choose(story, run, index) {
  if (!story || !run || run.done) return { valid: false };
  const node = nodeOf(story, run);
  const choice = node && Array.isArray(node.choices) ? node.choices[index] : null;
  if (!choice) return { valid: false };
  const next = story.nodes[choice.next];
  if (!next) return { valid: false };
  const path = run.path.concat([{ node: run.node, choice: index }]);
  const done = next.end === true;
  return { valid: true, run: { ...run, node: choice.next, path, done }, node: next, done };
}

const record = r => (r && typeof r === 'object' && !Array.isArray(r) ? r : null);

export function markStorySeen(state, id, day) {
  if (!state || !STORY_ID.test(id) || !storyById(id)) return null;
  const all = state.stories || (state.stories = {});
  const r = record(all[id]) || (all[id] = { seen: null, done: null, reflections: 0 });
  if (!r.seen) r.seen = day;
  return r;
}
export function markStoryDone(state, id, day) {
  const r = markStorySeen(state, id, day);
  if (!r) return false;
  const first = !r.done;
  if (!r.done) r.done = day;
  return first;
}
const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function noteReflection(state, id, day = localDay()) {
  const r = markStorySeen(state, id, day);
  if (!r) return 0;
  r.reflections = Math.min(1e5, (r.reflections || 0) + 1);
  return r.reflections;
}
export function storyProgress(state, id) {
  const r = state && state.stories && record(state.stories[id]);
  return { seen: (r && r.seen) || null, done: (r && r.done) || null, reflections: (r && r.reflections) || 0 };
}
export function storySummary(state) {
  const done = STORIES.filter(s => storyProgress(state, s.id).done).length;
  const seen = STORIES.filter(s => storyProgress(state, s.id).seen).length;
  const reflections = STORIES.reduce((a, s) => a + storyProgress(state, s.id).reflections, 0);
  return { total: STORIES.length, seen, done, reflections };
}
