// Cross-tab safety, backup integrity and the honesty of the assessment model.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLease, LEASE_MS } from '../src/core/lease.js';
import {
  freshState, sanitize, save, load, exportText, parseImport, importText,
  STORE_KEY, LEGACY_KEY, BACKUP_KEYS, checksum, stable, VERSION,
} from '../src/core/store.js';
import { createSession } from '../src/core/session.js';
import { ensureState, frontier, aheadFrontier, buildMission, contentGaps, SUPPORTED_CLASSES } from '../src/core/planner.js';
import { SKILLS, BY_ID, MISC } from '../src/content/index.js';
import { gate, matrix, MINIMA } from '../tools/content-gate.mjs';
import fs from 'node:fs';
import { T } from '../src/ui/labels.js';

const memStorage = () => {
  const mem = {};
  return {
    mem,
    getItem: k => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: k => { delete mem[k]; },
  };
};
const profile = (cls = 4) => ({ name: 'Test', cls, ay0: 2026, lang: 'bi', dailyQ: 18, off: [], pin: 'p:1234', autoRead: false, created: null });

// ---------- single writer ----------
test('one tab holds the lease; a second tab can read but cannot write, and takeover is explicit', () => {
  const stor = memStorage();
  let now = 1_000_000;
  const a = createLease(stor, { id: 'tab-a', now: () => now });
  const b = createLease(stor, { id: 'tab-b', now: () => now });
  assert.equal(a.acquire(), true);
  assert.equal(a.holds(), true);
  assert.equal(b.holds(), false);
  assert.equal(b.acquire(), false, 'a live writer is not displaced silently');
  assert.equal(b.peer().id, 'tab-a');

  now += LEASE_MS - 1;
  assert.equal(a.holds(), true);
  now += 2;
  assert.equal(a.holds(), false, 'a stale lease expires');
  assert.equal(b.acquire(), true, 'the reader may become the writer once the lease is stale');
  assert.equal(a.holds(), false);

  const c = createLease(stor, { id: 'tab-c', now: () => now });
  assert.equal(c.acquire(), false);
  assert.equal(c.take(), true, 'takeover is a deliberate call, never a side effect');
  assert.equal(c.holds(), true);
  assert.equal(b.holds(), false);
  c.release();
  assert.equal(c.holds(), false);
});

test('a crashed tab blocks other tabs for at most the lease TTL', () => {
  const stor = memStorage();
  let now = 0;
  const dead = createLease(stor, { id: 'dead', now: () => now });
  dead.acquire();
  now = LEASE_MS + 1;
  const fresh = createLease(stor, { id: 'fresh', now: () => now });
  assert.equal(fresh.acquire(), true);
  assert.equal(dead.holds(), false);
});

// ---------- backups ----------
test('exports are checksummed; a single edited character is refused', () => {
  const st = freshState(); st.profile = profile(); st.stars = 7;
  const text = exportText(st);
  const info = parseImport(text);
  assert.equal(info.signed, true);
  assert.deepEqual(info.warnings, []);
  assert.equal(info.state.stars, 7);

  const o = JSON.parse(text);
  o.state.stars = 8;
  assert.throws(() => parseImport(JSON.stringify(o)), /checksum does not match/);
  o.state.stars = 7;
  assert.equal(parseImport(JSON.stringify(o)).state.stars, 7, 'the original still parses');
  assert.notEqual(checksum(stable({ a: 1 })), checksum(stable({ a: 2 })));
});

test('a v2 document is migrated, not dropped: schema 3 keeps its progress', () => {
  const st = freshState(); st.profile = profile(); st.stars = 42;
  const legacy = JSON.parse(exportText(st));
  legacy.state.v = 2; delete legacy.sum;
  const mem = {};
  mem[LEGACY_KEY] = JSON.stringify(legacy.state);
  const stor = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
  const boot = load(stor);
  assert.equal(boot.migrated, true);
  assert.equal(boot.state.stars, 42);
  assert.equal(boot.state.v, VERSION);
  save(stor, boot.state);
  assert.ok(mem[STORE_KEY], 'the upgraded document is written under the current key');
  assert.equal(load(stor).state.stars, 42);
});

test('two rolling snapshots recover progress when the main document is corrupt', () => {
  const stor = memStorage();
  const first = freshState(); first.profile = profile(); first.stars = 11;
  save(stor, first);
  const second = freshState(); second.profile = profile(); second.stars = 22;
  save(stor, second);
  assert.ok(stor.mem[BACKUP_KEYS[0]], 'the previous document was kept');
  stor.mem[STORE_KEY] = '{half a save';
  const res = load(stor);
  assert.equal(res.recovered, true);
  assert.equal(res.state.stars, 11);
  assert.equal(stor.mem[STORE_KEY + '.damaged'], '{half a save', 'the damaged copy is kept for inspection');
  assert.equal(sanitize({ v: 99, skills: {} }), null, 'an unknown schema is refused, never guessed at');
});

test('skill state survives the round trip, including the new mastery dates', () => {
  const st = freshState(); st.profile = profile();
  st.skills['m.add3'] = {
    ...sanitize({ v: 3, skills: { 'm.add3': { p: 0.8, n: 5, c: 4, m: true, due: '2026-12-01', cand: '2026-11-20', relearn: '2026-11-25' } }, profile }).skills['m.add3'],
  };
  const back = importText(exportText(st));
  assert.equal(back.skills['m.add3'].cand, '2026-11-20');
  assert.equal(back.skills['m.add3'].relearn, '2026-11-25');
});

// ---------- test mode ----------
test('a test measures without changing learning state, stars, days or the log', () => {
  const st = freshState(); st.profile = profile();
  ensureState(SKILLS, st.skills, st.profile, new Date('2026-11-16T10:00:00'));
  const before = JSON.stringify(st);
  const date = new Date('2026-11-16T10:00:00');
  const app = { skills: SKILLS, byId: BY_ID, misc: MISC, state: st, now: () => date, day: () => '2026-11-16' };
  const s = createSession(app, Array.from({ length: 6 }, () => ({ kind: 'skill', skill: 'm.add3' })), { test: true, seed: 3 });
  let n = 0;
  for (let cur = s.next(); cur.type !== 'done'; cur = s.next()) {
    if (cur.type !== 'q') continue;
    const q = cur.q;
    const right = q.kind === 'mcq' ? q.answer : q.kind === 'frac' ? `${q.answer.n}/${q.answer.d}` : String(q.answer);
    const wrong = q.kind === 'mcq' ? (q.answer + 1) % q.options.length : q.kind === 'frac' ? `${q.answer.n + 1}/${q.answer.d}` : q.kind === 'num' ? String(q.answer + 7) : 'zzz';
    const res = s.answer(n % 2 ? wrong : right);
    assert.equal(res.valid, true);
    n++;
  }
  assert.equal(n, 6);
  assert.equal(s.stats.asked, 6);
  assert.equal(JSON.stringify(st), before, 'no p, m, due, stuck, stars, day or log change');
  s.finish();
  assert.equal(JSON.stringify(st), before, 'finishing a test changes nothing either');
});

// ---------- planning honesty ----------
test('no above-class content is offered silently; stretch work is labelled', () => {
  const p = profile(4), date = new Date('2026-11-16T10:00:00'), day = '2026-11-16';
  const st = ensureState(SKILLS, {}, p, date);
  // Master every maths skill at or below class 4, leaving class 5 maths untouched.
  for (const sk of SKILLS) if (sk.strand === 'm' && sk.grade <= 4) { st[sk.id].m = true; st[sk.id].due = '2099-01-01'; }
  assert.deepEqual(frontier(SKILLS, st, 'm', 4), [], 'nothing at this level is left');
  assert.ok(aheadFrontier(SKILLS, st, 'm', 4).length > 0);
  const plan = buildMission(SKILLS, st, p, date, day);
  const ahead = plan.filter(x => x.ahead);
  assert.ok(ahead.length > 0);
  for (const step of ahead) {
    assert.equal(step.kind, 'skill');
    assert.ok(BY_ID[step.skill].grade > 4);
  }
});

test('a class with no content at all reports a gap instead of pretending', () => {
  const p = profile(3), date = new Date('2026-11-16T10:00:00');
  const gaps = contentGaps(SKILLS, p, date);
  for (const s of ['e', 'h', 's', 'l', 'c', 'g', 't']) assert.ok(gaps.includes(s), `${s} in ${JSON.stringify(gaps)}`);
  assert.ok(!gaps.includes('m'), 'class 3 does have maths');
  assert.ok(!gaps.includes('sorting'), 'only real strands');
});

// ---------- published coverage ----------
test('the content gate matches the declared supported classes', () => {
  const { errors, supported } = gate(SKILLS);
  assert.deepEqual(errors, []);
  assert.deepEqual(supported, SUPPORTED_CLASSES);
  const m = matrix(SKILLS);
  for (const cls of SUPPORTED_CLASSES) {
    assert.ok(m[cls].total >= MINIMA.total, `class ${cls} total`);
    assert.ok(m[cls].maths >= MINIMA.maths, `class ${cls} maths`);
    assert.ok(m[cls].language >= MINIMA.language, `class ${cls} language`);
  }
});

test('class rows below the minimum are named, not hidden', () => {
  const { matrix: m } = gate(SKILLS);
  const thin = Object.keys(m).map(Number).filter(g => g >= 3 && g <= 9 && !SUPPORTED_CLASSES.includes(g));
  assert.deepEqual(thin, [3, 8], 'class 3 and class 8 are the known gaps');
});

// ---------- labels ----------
test('every T.<label> used by a UI module exists', () => {
  const missing = [];
  for (const file of fs.readdirSync('src/ui').filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(`src/ui/${file}`, 'utf8');
    for (const m of src.matchAll(/\bT\.([A-Za-z][A-Za-z0-9]*)/g)) {
      if (!(m[1] in T)) missing.push(`${file}: T.${m[1]}`);
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});
