// Panchakosha wellbeing: the five layers, the breath clock, the gentle timer and its storage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PANCHAKOSHA, KOSHA_IDS, koshaById, BREATH_PHASES, BREATH_CYCLES, BREATH_TOTAL_MS,
  LIMIT_CHOICES, DEFAULT_LIMIT_MIN, GAP_CREDIT_MS, TICK_CREDIT_CAP_MS, MAX_ACTIVE_MS,
  freshWellbeing, ensureWellbeing, limitMs, summary, tick, setLimit, noteBreak, noteLayer, clock, dayKey,
} from '../src/core/wellbeing.js';
import { freshState, sanitize, save, exportText } from '../src/core/store.js';
import { settle } from '../src/core/rewards.js';

const D1 = '2026-11-17', D2 = '2026-11-18';

test('five koshas are complete, bilingual and each has its own kind of pause', () => {
  assert.equal(PANCHAKOSHA.length, 5);
  assert.deepEqual(KOSHA_IDS, ['anna', 'prana', 'mano', 'vijnana', 'ananda']);
  assert.equal(new Set(KOSHA_IDS).size, 5);
  for (const k of PANCHAKOSHA) {
    for (const f of ['sanskrit', 'name', 'line', 'prompt']) assert.ok(k[f].en && k[f].hi, `${k.id}.${f} bilingual`);
    assert.ok(k.icon);
    assert.ok(['move', 'breathe', 'feel', 'think', 'joy'].includes(k.practice));
  }
  assert.equal(koshaById('anna').steps.length, 3);
  assert.equal(koshaById('mano').feelings.length, 5);
  assert.equal(koshaById('vijnana').options.length, 4);
  assert.equal(koshaById('ananda').sparks.length, 6);
  for (const f of koshaById('mano').feelings) assert.ok(f.reply.en && f.reply.hi, `${f.id} reply bilingual`);
  assert.equal(koshaById('nope'), null);
});

test('the breath is 4 in, 2 hold, 6 out, three rounds', () => {
  assert.deepEqual(BREATH_PHASES.map(p => [p.id, p.seconds]), [['in', 4], ['hold', 2], ['out', 6]]);
  assert.equal(BREATH_CYCLES, 3);
  assert.equal(BREATH_TOTAL_MS, 36000);
  assert.ok(BREATH_TOTAL_MS < 60000, 'short enough to do inside a lesson');
});

test('the timer counts only active, continuous seconds and resets with the day', () => {
  const st = { wellbeing: freshWellbeing(D1) };
  assert.equal(summary(st).activeMs, 0);
  assert.equal(limitMs(st.wellbeing), DEFAULT_LIMIT_MIN * 60000);
  let t = 1_700_000_000_000;
  tick(st, { day: D1, now: t, active: false });
  assert.equal(st.wellbeing.activeMs, 0, 'the first tick has no interval to credit');
  tick(st, { day: D1, now: t + 1000, active: true });
  assert.equal(st.wellbeing.activeMs, 1000);
  tick(st, { day: D1, now: t + 2000, active: true });
  assert.equal(st.wellbeing.activeMs, 2000);
  // A gap longer than a minute is rest, not screen time.
  tick(st, { day: D1, now: t + 2000 + GAP_CREDIT_MS + 1, active: true });
  assert.equal(st.wellbeing.activeMs, 2000);
  // A single long interval is capped, so a sleeping tab cannot add an hour.
  st.wellbeing.lastTick = t + 10_000;
  st.wellbeing.activeMs = 0;
  tick(st, { day: D1, now: t + 60_000, active: true });
  assert.equal(st.wellbeing.activeMs, TICK_CREDIT_CAP_MS, 'a 50s gap credits only the 30s cap');
  st.wellbeing.limitMin = 15;
  st.wellbeing.breaks = 4;
  ensureWellbeing(st, D2);
  assert.equal(st.wellbeing.day, D2);
  assert.equal(st.wellbeing.activeMs, 0, 'today starts at zero');
  assert.equal(st.wellbeing.breaksToday, 0);
  assert.equal(st.wellbeing.breaks, 4, 'the lifetime count survives');
  assert.equal(st.wellbeing.limitMin, 15, 'the guardian choice survives');
});

test('the limit is one of three gentle choices and never a lock', () => {
  const st = { wellbeing: freshWellbeing(D1) };
  assert.deepEqual(LIMIT_CHOICES, [15, 20, 30]);
  assert.equal(setLimit(st, 25), false);
  assert.equal(st.wellbeing.limitMin, DEFAULT_LIMIT_MIN);
  assert.equal(setLimit(st, 30), true);
  assert.equal(summary(st).limitMs, 30 * 60000);
  assert.equal(summary(st).due, false);
});

test('a break counts, resets the clock and names its layer', () => {
  const st = { wellbeing: freshWellbeing(D1) };
  tick(st, { day: D1, now: 1000, active: false });
  tick(st, { day: D1, now: 31_000, active: true });
  assert.equal(summary(st).activeMs, 30_000);
  st.wellbeing.activeMs = limitMs(st.wellbeing);
  assert.equal(summary(st).due, true);
  noteBreak(st, { day: D1, layer: 'prana' });
  assert.equal(st.wellbeing.activeMs, 0, 'the clock starts again, not backwards');
  assert.equal(summary(st).due, false);
  assert.equal(st.wellbeing.breaks, 1);
  assert.equal(st.wellbeing.breaksToday, 1);
  assert.equal(st.wellbeing.layers.prana, 1);
  assert.equal(st.wellbeing.lastBreak, D1);
  noteBreak(st, { day: D1, layer: 'nonsense' });
  assert.equal(st.wellbeing.layers.prana, 2, 'an unknown layer falls back to the breath');
  assert.equal(noteLayer(st, 'ananda'), true);
  assert.equal(st.wellbeing.layers.ananda, 1);
  assert.equal(noteLayer(st, 'fake'), false);
  assert.equal(clock(0), '0:00');
  assert.equal(clock(61_000), '1:01');
  assert.equal(clock(3_661_000), '61:01');
});

test('active time is capped and hostile saved counters are clamped, not trusted', () => {
  const st = { wellbeing: freshWellbeing(D1) };
  st.wellbeing.activeMs = MAX_ACTIVE_MS - 1;
  tick(st, { day: D1, now: 10_000, active: false });
  tick(st, { day: D1, now: 20_000, active: true });
  assert.ok(st.wellbeing.activeMs <= MAX_ACTIVE_MS);
  const raw = {
    ...freshState(),
    wellbeing: { day: 'not-a-day', activeMs: 1e12, limitMin: 999, breaks: -4, breaksToday: 1e9, lastBreak: 'x', lastTick: 1_700_000_000_000, layers: { anna: 1e12, prana: '9', evil: 99 } },
  };
  const clean = sanitize(raw);
  assert.equal(clean.wellbeing.day, null);
  assert.equal(clean.wellbeing.activeMs, MAX_ACTIVE_MS);
  assert.equal(clean.wellbeing.limitMin, DEFAULT_LIMIT_MIN);
  assert.equal(clean.wellbeing.breaks, 0);
  assert.equal(clean.wellbeing.breaksToday, 10000);
  assert.deepEqual(Object.keys(clean.wellbeing.layers).sort(), [...KOSHA_IDS].sort());
  assert.equal(clean.wellbeing.layers.anna, 1e6);
  assert.equal(clean.wellbeing.layers.prana, 9);
  assert.equal(clean.wellbeing.layers.evil, undefined);
  assert.equal(clean.wellbeing.lastBreak, null);
  assert.equal(clean.wellbeing.lastTick, 0, 'a sub-day heartbeat timestamp is never kept');
});

test('a first break earns the calm badge through the ordinary settle path', () => {
  const st = freshState();
  st.days[D1] = { q: 0, c: 0, mq: 0, done: false };
  const quiet = settle(st, { day: D1, streakNow: 0 });
  assert.ok(!quiet.badges.includes('calm'));
  noteBreak(st, { day: D1, layer: 'prana' });
  const r = settle(st, { day: D1, streakNow: 0 });
  assert.ok(r.badges.includes('calm'), 'calm fires after a real break');
  const again = settle(st, { day: D1, streakNow: 0 });
  assert.ok(!again.badges.includes('calm'), 'a badge fires once');
  for (let i = 0; i < 6; i++) noteBreak(st, { day: D1, layer: 'prana' });
  const seven = settle(st, { day: D1, streakNow: 0 });
  assert.ok(seven.badges.includes('calm7'));
  assert.equal(st.wellbeing.breaks, 7);
});

test('saving and exporting never write a heartbeat timestamp', () => {
  const st = freshState();
  st.wellbeing.lastTick = 1_700_000_000_000;
  st.wellbeing.activeMs = 1234;
  const mem = {};
  save({ setItem: (k, v) => { mem[k] = v; } }, st);
  const written = JSON.parse(mem['kslearn.v2']);
  assert.equal(written.wellbeing.lastTick, 0);
  assert.equal(written.wellbeing.activeMs, 1234);
  assert.equal(st.wellbeing.lastTick, 1_700_000_000_000, 'the live state keeps its clock');
  assert.equal(JSON.parse(exportText(st)).state.wellbeing.lastTick, 0);
});

test('the wellbeing store is a clock and a count, not a diary', () => {
  const w = freshWellbeing(D1);
  assert.deepEqual(Object.keys(w).sort(), ['activeMs', 'breaks', 'breaksToday', 'day', 'lastBreak', 'lastTick', 'layers', 'limitMin'].sort());
  assert.equal(dayKey(new Date(2026, 10, 7)), '2026-11-07');
});
