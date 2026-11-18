// Persistence: one JSON document in the browser's storage, with export/import so
// progress can move between phone and laptop or be backed up.
// Everything read from storage or from a backup file is untrusted: sanitize() rebuilds
// the state field by field, so a damaged or hand-edited file cannot crash the app,
// smuggle unexpected keys or make it loop over absurd sizes.
import { BADGE_IDS, LEVELS, freshRw } from './rewards.js';
import { sanitizeConsent } from './consent.js';
import { sanitizeAccount } from './account.js';
import { LAB_ID, labById } from './labs.js';
import { freshWellbeing, dayKey, LIMIT_CHOICES, KOSHA_IDS, MAX_ACTIVE_MS, DEFAULT_LIMIT_MIN } from './wellbeing.js';
import { QUEST_IDS, freshQuests } from './quests.js';
import { STORY_ID, storyById } from './stories.js';
export const STORE_KEY = 'kslearn.v2';
export const VERSION = 2;
export const MAX_IMPORT_BYTES = 3 * 1024 * 1024;
const LIMITS = { log: 6000, days: 4000, asks: 60, packs: 20, skills: 3000 };

export const freshState = () => ({ v: VERSION, profile: null, consent: null, account: null, skills: {}, log: [], days: {}, stars: 0, rw: freshRw(0), asks: [], packs: [], labs: {}, wellbeing: freshWellbeing(dayKey()), quests: freshQuests(dayKey()), stories: {}, lock: { f: 0, until: 0 } });

const DATE = /^\d{4}-\d{2}-\d{2}$/, SKILL_ID = /^[a-z]\.[a-z0-9_]{1,40}$/, WORD = /^[a-z0-9_]{1,40}$/;
const STRANDS = ['m', 'e', 'h', 's', 'l', 'c', 'g', 't'], LANGS = ['bi', 'hi', 'en'];
const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const int = (v, lo, hi, d) => (Number.isFinite(+v) && typeof v !== 'boolean' ? Math.min(hi, Math.max(lo, Math.round(+v))) : d);
const num = (v, lo, hi, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const date = v => (typeof v === 'string' && DATE.test(v) ? v : null);
// Printable text only: no control characters, bounded length.
const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').trim().slice(0, max) : '');

function pinRecord(p) {
  if (obj(p) && p.v === 2 && /^[0-9a-f]{32}$/.test(p.s) && /^[0-9a-f]{64}$/.test(p.h)) return { v: 2, s: p.s, n: int(p.n, 1, 20000, 4000), h: p.h };
  if (typeof p === 'string' && (/^[0-9a-f]{64}$/.test(p) || /^p:\d{4,8}$/.test(p))) return p; // formats before 2.1, upgraded on next unlock
  return null;
}
function profile(p) {
  if (!obj(p)) return null;
  const name = str(p.name, 20), pin = pinRecord(p.pin);
  if (!name || !pin) return null;
  return {
    name, pin, cls: int(p.cls, 1, 12, 4), ay0: int(p.ay0, 2020, 2100, new Date().getFullYear()),
    lang: LANGS.includes(p.lang) ? p.lang : 'bi', dailyQ: int(p.dailyQ, 6, 60, 18),
    off: Array.isArray(p.off) ? STRANDS.filter(s => p.off.includes(s)).slice(0, STRANDS.length - 1) : [],
    autoRead: p.autoRead === true, created: date(p.created),
  };
}
function skillState(s) {
  if (!obj(s)) return null;
  const n = int(s.n, 0, 1e6, 0), msc = {};
  if (obj(s.msc)) for (const k of Object.keys(s.msc).slice(0, 60)) if (WORD.test(k)) msc[k] = int(s.msc[k], 0, 1e6, 0);
  const out = {
    p: num(s.p, 0.01, 0.995, 0.2), n, c: int(s.c, 0, n, 0), run: int(s.run, 0, 1e6, 0), bad: int(s.bad, 0, 1e6, 0),
    m: s.m === true, due: date(s.due), st: int(s.st, 0, 5, 0), fast: s.fast === true, help: s.help === true, seen: s.seen === true,
    msc, ms: int(s.ms, 0, 180000, 0), last: date(s.last),
    scn: int(s.scn, 0, 1e6, 0), scl: int(s.scl, 0, 4, 0), bp: null,
    hn: int(s.hn, 0, 1e6, 0), he: int(s.he, 0, 1e6, 0), ln: int(s.ln, 0, 1e6, 0), lc: int(s.lc, 0, 1e6, 0),
  };
  if (obj(s.bp) && Number.isFinite(s.bp.l) && Number.isFinite(s.bp.s)) {
    out.bp = { l: num(s.bp.l, 0.03, 0.3, 0.12), s: num(s.bp.s, 0.01, 0.4, 0.1) };
  }
  if (date(s.mst)) out.mst = s.mst;
  if (Array.isArray(s.recent)) out.recent = s.recent.slice(-8).map(k => str(String(k), 60));
  if (out.m && !out.due) out.due = out.last || null;
  return out;
}

// -> clean state, or null when the document is not a KS-LEARN state at all.
export function sanitize(raw) {
  if (!obj(raw) || raw.v !== VERSION || !obj(raw.skills)) return null;
  const st = freshState();
  st.profile = profile(raw.profile);
  // A consent record is kept even when its digest no longer matches: the app must be able
  // to say "this record is damaged" and ask again, instead of silently dropping it.
  st.consent = sanitizeConsent(raw.consent);
  // The guardian credential is stored as KDF output only; anything else is dropped.
  st.account = sanitizeAccount(raw.account);
  for (const id of Object.keys(raw.skills).slice(0, LIMITS.skills)) { if (!SKILL_ID.test(id)) continue; const s = skillState(raw.skills[id]); if (s) st.skills[id] = s; }
  if (Array.isArray(raw.log)) for (const r of raw.log.slice(-LIMITS.log)) {
    if (!obj(r) || !date(r.d) || !SKILL_ID.test(r.s)) continue;
    const row = { d: r.d, s: r.s, ok: r.ok ? 1 : 0, ms: int(r.ms, 0, 180000, 0) };
    if (typeof r.m === 'string' && WORD.test(r.m)) row.m = r.m;
    if (r.a === 1) { row.a = 1; row.w = num(r.w, 0.05, 1, 0.5); row.lv = int(r.lv, 1, 4, 1); }
    else { row.w = 1; row.lv = 0; }
    if (Number.isFinite(r.p0)) row.p0 = num(r.p0, 0.001, 0.999, 0.2);
    st.log.push(row);
  }
  if (obj(raw.days)) for (const d of Object.keys(raw.days).filter(k => DATE.test(k)).sort().slice(-LIMITS.days)) {
    const v = raw.days[d]; if (!obj(v)) continue;
    const q = int(v.q, 0, 1e5, 0);
    st.days[d] = { q, c: int(v.c, 0, q, 0), ms: int(v.ms, 0, 864e5, 0), mq: int(v.mq, 0, q, v.done === true ? q : 0), done: v.done === true };
    if (int(v.h, 0, 1e5, 0)) st.days[d].h = int(v.h, 0, 1e5, 0);
  }
  st.stars = int(raw.stars, 0, 1e9, 0);
  // Rewards: older saves have none; their level counts as already celebrated.
  st.rw = freshRw(st.stars);
  if (obj(raw.rw)) {
    if (obj(raw.rw.badges)) for (const id of BADGE_IDS) { const d = date(raw.rw.badges[id]); if (d) st.rw.badges[id] = d; }
    st.rw.lvl = int(raw.rw.lvl, 0, LEVELS.length - 1, st.rw.lvl);
    st.rw.bonusDay = date(raw.rw.bonusDay); st.rw.startDay = date(raw.rw.startDay); st.rw.gold = int(raw.rw.gold, 0, 1e6, 0); st.rw.rec = int(raw.rw.rec, 0, 1e6, 0);
  }
  if (Array.isArray(raw.asks)) for (const a of raw.asks.slice(-LIMITS.asks)) if (obj(a) && date(a.d) && SKILL_ID.test(a.s)) st.asks.push({ d: a.d, s: a.s, q: str(a.q, 400), done: a.done === true });
  // Packs are only shape-checked here; the app re-validates each one against the skill graph before use.
  if (Array.isArray(raw.packs)) st.packs = raw.packs.filter(p => obj(p) && typeof p.id === 'string' && Array.isArray(p.skills)).slice(0, LIMITS.packs);
  // Curiosity Labs progress: which models were opened and finished, and how many tries.
  if (obj(raw.labs)) for (const id of Object.keys(raw.labs).slice(0, 40)) {
    if (!LAB_ID.test(id) || !labById(id)) continue;
    const v = raw.labs[id]; if (!obj(v)) continue;
    const rec = { tries: int(v.tries, 0, 999, 0) };
    const seen = date(v.seen), done = date(v.done);
    if (seen) rec.seen = seen;
    if (done) rec.done = done;
    st.labs[id] = rec;
  }
  // Wellbeing is a clock and a count, not a diary: no activity names, no timestamps of what
  // was done, only seconds of active use today and how many breaks were taken.
  if (obj(raw.wellbeing)) {
    const w = raw.wellbeing, layers = {};
    for (const id of KOSHA_IDS) layers[id] = int(w.layers && w.layers[id], 0, 1e6, 0);
    st.wellbeing = {
      day: date(w.day), activeMs: int(w.activeMs, 0, MAX_ACTIVE_MS, 0),
      limitMin: LIMIT_CHOICES.includes(w.limitMin) ? w.limitMin : DEFAULT_LIMIT_MIN,
      breaks: int(w.breaks, 0, 1e6, 0), breaksToday: int(w.breaksToday, 0, 1e4, 0),
      lastBreak: date(w.lastBreak), lastTick: 0, layers,
    };
  }
  // One chosen quest a day; the total survives so badges can see real effort over time.
  if (obj(raw.quests)) {
    const q = raw.quests, id = QUEST_IDS.includes(q.id) ? q.id : null;
    st.quests = { day: date(q.day), id, done: !!id && q.done === true, total: int(q.total, 0, 1e6, 0) };
  }
  // Moral stories: completion and reflection counts only. The choices are never stored.
  if (obj(raw.stories)) for (const id of Object.keys(raw.stories).slice(0, 40)) {
    if (!STORY_ID.test(id) || !storyById(id)) continue;
    const v = raw.stories[id]; if (!obj(v)) continue;
    const rec = { reflections: int(v.reflections, 0, 1e5, 0) };
    const seen = date(v.seen), done = date(v.done);
    if (seen) rec.seen = seen;
    if (done) rec.done = done;
    st.stories[id] = rec;
  }
  if (obj(raw.lock)) st.lock = { f: int(raw.lock.f, 0, 1000, 0), until: int(raw.lock.until, 0, 8.64e15, 0) };
  return st;
}

// -> { state, recovered } recovered=true means unreadable data was found and set aside (never silently overwritten).
export function load(storage) {
  let text = null;
  try { text = storage.getItem(STORE_KEY); } catch { /* storage unavailable */ }
  if (text == null) return { state: freshState(), recovered: false };
  let st = null;
  try { st = sanitize(JSON.parse(text)); } catch { /* not JSON */ }
  if (st) return { state: st, recovered: false };
  try { storage.setItem(STORE_KEY + '.damaged', text.slice(0, MAX_IMPORT_BYTES)); } catch { /* best effort */ }
  return { state: freshState(), recovered: true };
}
// The heartbeat clock is a live-session detail. It is deliberately written as zero, so no
// sub-day timestamp is ever stored or exported — only the day-level counters are.
const withoutClock = state => (state && state.wellbeing ? { ...state, wellbeing: { ...state.wellbeing, lastTick: 0 } } : state);
export function save(storage, state) {
  try { storage.setItem(STORE_KEY, JSON.stringify(withoutClock(state))); return true; } catch { return false; }
}
// One-step undo for destructive actions (restore, erase): keeps the previous document.
export function keepUndo(storage) {
  try { const cur = storage.getItem(STORE_KEY); if (cur != null) storage.setItem(STORE_KEY + '.undo', cur); return true; } catch { return false; }
}
export function readUndo(storage) {
  try { return sanitize(JSON.parse(storage.getItem(STORE_KEY + '.undo'))); } catch { return null; }
}

export const exportText = state => JSON.stringify({ app: 'ks-learn', v: VERSION, exported: new Date().toISOString(), state: { ...withoutClock(state), lock: { f: 0, until: 0 } } });
const NOT = 'This is not a KS-LEARN backup.';
export function importText(text) {
  if (typeof text !== 'string' || text.length > MAX_IMPORT_BYTES) throw new Error(typeof text === 'string' ? 'This file is too large to be a KS-LEARN backup.' : NOT);
  let o;
  try { o = JSON.parse(text); } catch { throw new Error(NOT); }
  if (!obj(o) || o.app !== 'ks-learn' || !obj(o.state)) throw new Error(NOT);
  if (o.state.v > VERSION) throw new Error('This backup was made by a newer version of KS-LEARN. Update the app first.');
  const st = sanitize(o.state);
  if (!st || !st.profile) throw new Error(NOT);
  return st;
}
