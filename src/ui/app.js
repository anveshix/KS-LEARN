// KS-LEARN browser app: one child, one device, works offline.
import { SKILLS, BY_ID, MISC, STRAND_INFO } from '../content/index.js';
import { tx, ui, L } from '../core/i18n.js';
import { iso, addDays } from '../core/mastery.js';
import { ensureState, buildMission, classNow, academicYear, strandProgress, dueReviews, frontier, unlocked, STRANDS } from '../core/planner.js';
import { createSession, streak } from '../core/session.js';
import { load, save, freshState, exportText, importText, keepUndo, readUndo, STORE_KEY, MAX_IMPORT_BYTES } from '../core/store.js';
import { makePin, verifyPin, needsUpgrade, validPin, recordAttempt, lockedFor } from '../core/pin.js';
import { LEVELS, BADGES, levelInfo, startReward, comebackReward, settle, isEmpty } from '../core/rewards.js';
import { weekSummary, topMistakes, needsHelp, roadmap, skillStatus } from '../core/insights.js';
import { packToSkills, validatePack } from '../core/packs.js';
import { fmt } from '../content/kit.js';
import { T, OFFSCREEN } from './labels.js';
import { h } from './dom.js';
import { orderWidget, matchWidget } from './widgets.js';
import { MARK_URI } from './mark.js';
import { check } from '../core/check.js';
import { hintFor, scaffoldFor, MAX_DEPTH, MSG } from '../core/guidance.js';

// ---------- environment ----------
const mem = {};
const storage = (() => {
  try { const k = '__ks'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return { ok: true, getItem: k2 => localStorage.getItem(k2), setItem: (k2, v) => localStorage.setItem(k2, v), removeItem: k2 => localStorage.removeItem(k2) }; }
  catch { return { ok: false, getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } }; }
})();
const now = () => new Date();
const today = () => iso(now());

const boot = load(storage);
let state = boot.state;
let skills = [], byId = {};
// Packs come from files and backups, so each one is validated again before any of it is used.
function rebuildSkills() {
  let all = SKILLS.slice();
  const kept = [];
  for (const p of state.packs || []) {
    try { if (validatePack(p, all, MISC).length) continue; all = all.concat(packToSkills(p)); kept.push(p); } catch { /* drop a damaged pack */ }
  }
  state.packs = kept;
  skills = all;
  byId = Object.fromEntries(all.map(s => [s.id, s]));
}
rebuildSkills();
const app = { get skills() { return skills; }, get byId() { return byId; }, get state() { return state; }, now, day: today, misc: MISC };
let saveWarned = 0;
function persist() {
  const ok = save(storage, state);
  if (!ok && Date.now() - saveWarned > 30000) { saveWarned = Date.now(); toast(u(T.saveFailed), 6000); }
  return ok;
}
const M = () => (state.profile && state.profile.lang) || 'bi';
const t = v => tx(v, M());
const u = v => ui(v, M());

const root = () => document.getElementById('app');
function mount(...nodes) { const r = root(); r.replaceChildren(...nodes); window.scrollTo(0, 0); }
function toast(msg, ms = 2600) {
  const el = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(el); setTimeout(() => el.remove(), ms);
}

// ---------- speech ----------
const voice = (() => {
  const synth = window.speechSynthesis;
  let ttsCap = null;
  if (!synth && window.claude && window.claude.use) window.claude.use('tts').then(x => { ttsCap = x; }).catch(() => {});
  const segs = text => {
    const out = [];
    for (const tok of String(text).replace(/\n+/g, '. ').split(/\s+/)) {
      if (!tok) continue;
      const lang = /[ऀ-ॿ]/.test(tok) ? 'hi-IN' : /[A-Za-z]/.test(tok) ? 'en-IN' : null;
      const last = out[out.length - 1];
      if (last && (lang === null || last.lang === lang)) last.text += ' ' + tok;
      else out.push({ lang: lang || (last ? last.lang : 'en-IN'), text: tok });
    }
    return out.map(s => ({ ...s, text: s.text.replace(/[()]/g, ' ').trim() })).filter(s => /[\p{L}\p{N}]/u.test(s.text));
  };
  return {
    available: () => !!(synth || ttsCap),
    speak(text) {
      try {
        if (synth) {
          synth.cancel();
          const voices = synth.getVoices();
          for (const s of segs(text)) {
            const ut = new SpeechSynthesisUtterance(s.text);
            ut.lang = s.lang; ut.rate = 0.92;
            const v = voices.find(x => x.lang === s.lang) || voices.find(x => x.lang.startsWith(s.lang.slice(0, 2)));
            if (v) ut.voice = v;
            synth.speak(ut);
          }
        } else if (ttsCap) ttsCap.speak(String(text).slice(0, 1900)).catch(() => {});
      } catch { /* speech is optional */ }
    },
    stop() { try { synth && synth.cancel(); ttsCap && ttsCap.stop(); } catch { /* ignore */ } },
  };
})();

// ---------- shared pieces ----------
const strandName = s => (STRAND_INFO[s] ? t(STRAND_INFO[s].name) : s);
const enabledStrands = () => STRANDS.filter(s => !(state.profile.off || []).includes(s));
function bar(frac, cls = '') {
  return h('div', { class: 'bar ' + cls, role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(frac * 100)) }, h('i', { style: `width:${Math.max(0, Math.min(100, frac * 100)).toFixed(1)}%` }));
}
function nav(active) {
  const item = (id, label, ico) => h('a', { href: '#' + id, class: 'tab' + (active === id ? ' on' : ''), 'aria-current': active === id ? 'page' : false }, h('span', { class: 'ico', 'aria-hidden': 'true' }, ico), h('span', {}, u(label)));
  return h('nav', { class: 'tabs', 'aria-label': 'Main' }, item('home', T.home, '🏠'), item('map', T.map, '🗺️'), item('parent', T.parent, '👨‍👩‍👧'));
}
function header() {
  const p = state.profile, cls = classNow(p, now());
  return h('header', { class: 'top' },
    h('div', { class: 'brand' }, h('span', { class: 'avatar', 'aria-hidden': 'true' }, Array.from(p.name)[0].toUpperCase()), h('div', {}, h('b', {}, p.name), h('small', {}, `${u(T.classN)} ${cls}`))),
    h('div', { class: 'pills' },
      h('span', { class: 'pill-stat', title: `${u(T.level)} ${levelInfo(state.stars || 0).index + 1}` }, h('span', { class: 'ico', 'aria-hidden': 'true' }, levelInfo(state.stars || 0).level.icon)),
      h('span', { class: 'pill-stat', title: u(T.streak) }, h('span', { class: 'ico', 'aria-hidden': 'true' }, '🔥'), String(streak(state.days, today(), addDays))),
      h('span', { class: 'pill-stat', title: u(T.stars) }, h('span', { class: 'ico', 'aria-hidden': 'true' }, '⭐'), String(state.stars || 0))));
}
const ICON = { m: '➗', e: '🔤', h: 'अ', s: '🔬', l: '🧩', c: '💻', g: '🌏', t: '🏛️' };
const offscreenToday = () => OFFSCREEN[Math.floor(now().getTime() / 864e5) % OFFSCREEN.length];

// ---------- brand ----------
// The mark arrives as a data URI so the page still makes no requests; the wordmark is
// real text, so it stays selectable, translatable and readable by a screen reader.
const markElement = (cls = 'mark') => h('span', { class: cls, role: 'img', 'aria-label': T.app.en, style: `background-image:url("${MARK_URI}")` });
const wordmark = () => h('span', { class: 'wordmark', 'aria-hidden': 'true' }, 'KS', h('i', {}, '-'), 'LEARN');

// ---------- setup ----------
function viewSetup() {
  const f = h('form', { class: 'card form', id: 'setup' },
    h('h1', {}, u(T.setupTitle)),
    h('label', { for: 'f-name' }, ui(T.nickname, 'bi')), h('input', { id: 'f-name', required: true, maxlength: '20', autocomplete: 'off' }),
    h('label', { for: 'f-cls' }, ui(T.classIn, 'bi')),
    h('select', { id: 'f-cls' }, [3, 4, 5, 6, 7, 8].map(c => h('option', { value: String(c), selected: c === 4 }, String(c)))),
    h('label', { for: 'f-lang' }, ui(T.language, 'bi')),
    h('select', { id: 'f-lang' }, h('option', { value: 'bi' }, ui(T.langBi, 'bi')), h('option', { value: 'hi' }, ui(T.langHi, 'bi')), h('option', { value: 'en' }, ui(T.langEn, 'bi'))),
    h('label', { for: 'f-daily' }, ui(T.daily, 'bi')),
    h('select', { id: 'f-daily' }, [12, 18, 24, 30].map(n => h('option', { value: String(n), selected: n === 18 }, `${n} (~${Math.round(n * 0.75)} min)`))),
    h('label', { for: 'f-pin' }, ui(T.pin, 'bi')), h('input', { id: 'f-pin', type: 'password', inputmode: 'numeric', pattern: '[0-9]{4}', maxlength: '4', required: true, autocomplete: 'off' }),
    h('p', { class: 'muted small' }, ui(T.pinNote, 'bi')),
    h('p', { class: 'err', id: 'f-err', role: 'alert', hidden: true }),
    h('button', { class: 'btn primary big', type: 'submit' }, ui(T.start, 'bi')));
  f.addEventListener('submit', e => {
    e.preventDefault();
    const d = now(), name = f.querySelector('#f-name').value.trim().slice(0, 20), pin = f.querySelector('#f-pin').value;
    const err = f.querySelector('#f-err');
    if (!name || !/^\d{4}$/.test(pin)) { err.textContent = ui(name ? T.pinNeeded : T.nameNeeded, 'bi'); err.hidden = false; return; }
    state = freshState();
    state.profile = {
      name, cls: +f.querySelector('#f-cls').value, ay0: academicYear(d), lang: f.querySelector('#f-lang').value,
      dailyQ: +f.querySelector('#f-daily').value, pin: makePin(pin), off: [], autoRead: false, created: today(),
    };
    rebuildSkills(); ensureState(skills, state.skills, state.profile, d); persist(); go('home');
  });
  const welcome = h('header', { class: 'welcome' },
    markElement('mark mark-lg'),
    h('div', { class: 'welcome-text' },
      wordmark(),
      h('p', { class: 'tagline' }, u(T.tagline)),
      h('p', { class: 'muted small welcome-note' }, ui(T.setupNote, 'bi'))));
  mount(h('main', { class: 'wrap' }, welcome, f, restoreCard()));
}

// ---------- rewards UI ----------
function confetti(n = 46) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const wrap = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  const cols = ['#2b55e6', '#7b45d6', '#d9730b', '#148a5a', '#c2387a', '#e7b84a'];
  for (let i = 0; i < n; i++) {
    const p = h('i', {});
    p.style.setProperty('--x', `${(Math.random() * 100).toFixed(1)}%`); p.style.setProperty('--dx', `${(Math.random() * 160 - 80).toFixed(0)}px`);
    p.style.setProperty('--d', `${(1.6 + Math.random() * 1.6).toFixed(2)}s`); p.style.setProperty('--w', `${(Math.random() * .5).toFixed(2)}s`);
    p.style.setProperty('--r', `${(Math.random() * 720 - 360).toFixed(0)}deg`); p.style.background = cols[i % cols.length];
    wrap.append(p);
  }
  document.body.append(wrap); setTimeout(() => wrap.remove(), 3800);
}
// One list of "what you just earned", used on the finish screen and in the Home pop-up.
function rewardLines(r) {
  const out = [];
  if (r.gold) out.push(h('p', { class: 'rw-line gold' }, h('span', { class: 'rw-ico' }, '🌟'), ` ${u(T.goldStar)} +${r.gold}`));
  if (r.bonus) out.push(h('p', { class: 'rw-line' }, h('span', { class: 'rw-ico' }, '🎁'), ` ${u(T.missionBonus)} +${r.bonus}`));
  for (const id of r.badges) { const b = BADGES.find(x => x.id === id); out.push(h('p', { class: 'rw-line' }, h('span', { class: 'rw-ico' }, b.icon), ` ${u(T.newBadge)}: `, h('b', {}, t(b.name)), h('span', { class: 'muted small' }, ` · ${t(b.desc)}`))); }
  if (r.levelUp) { const L2 = LEVELS[r.levelUp.to]; out.push(h('div', { class: 'levelup' }, h('div', { class: 'lu-ico' }, L2.icon), h('h2', {}, u(T.levelUp)), h('p', {}, `${u(T.youAre)} `, h('b', {}, t(L2.name))))); }
  return out;
}
function celebrate(r) {
  const close = () => { sheet.remove(); };
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-label': u(T.rewards), onclick: e => { if (e.target === sheet) close(); } },
    h('section', { class: 'card sheet-body celebrate' }, h('div', { class: 'eyebrow' }, u(T.awesome)), rewardLines(r), h('button', { class: 'btn primary big', id: 'cel-ok', onclick: close }, u(T.gotIt))));
  document.body.append(sheet); confetti(); document.getElementById('cel-ok').focus();
}
function levelTile() {
  const li = levelInfo(state.stars || 0);
  return h('section', { class: 'card tile b-wide level-tile' },
    h('div', { class: 'lv-row' }, h('div', { class: 'lv-ico', 'aria-hidden': 'true' }, li.level.icon),
      h('div', { class: 'lv-main' }, h('div', { class: 'eyebrow' }, `${u(T.level)} ${li.index + 1}`), h('h2', {}, t(li.level.name)),
        bar(li.frac), h('small', { class: 'muted' }, li.next ? `${li.toNext} ${u(T.toNext)} ${t(li.next.name)} ${li.next.icon}` : u(T.maxLevel)))));
}
function badgeShelf() {
  const got = state.rw.badges, n = Object.keys(got).length;
  return h('section', { class: 'card b-wide' }, h('div', { class: 'eyebrow' }, `${u(T.badges)} · ${n}/${BADGES.length} ${u(T.badgesEarned)}`),
    h('div', { class: 'shelf' }, BADGES.map(b => h('div', { class: 'badge' + (got[b.id] ? ' on' : ''), title: `${t(b.name)}: ${t(b.desc)}`, role: 'img', 'aria-label': `${t(b.name)}${got[b.id] ? '' : ' (locked)'}` },
      h('span', { class: 'b-ico' }, got[b.id] ? b.icon : '🔒'), h('small', {}, t(b.name))))));
}
const settleNow = (extra = {}) => settle(state, { day: today(), streakNow: streak(state.days, today(), addDays), ...extra });

// ---------- home ----------
function viewHome() {
  const p = state.profile, d = now(), day = today(), cls = classNow(p, d);
  ensureState(skills, state.skills, p, d);
  const pending = settleNow(); if (!isEmpty(pending)) persist();
  const td = state.days[day] || { q: 0, c: 0, mq: 0, done: false };
  const remaining = Math.max(1, p.dailyQ - (td.mq || 0));
  const due = dueReviews(skills, state.skills, day).length;
  const mission = h('section', { class: 'card mission hero b-hero' + (td.done ? ' complete' : '') },
    h('div', { class: 'eyebrow' }, u(T.todayMission)),
    td.done
      ? [h('h2', {}, u(T.missionDone)), h('p', {}, u(T.missionDoneNote))]
      : [h('h2', {}, `${remaining} ${u(T.questions)}`), h('p', { class: 'muted' }, `~${Math.max(3, Math.round(remaining * 0.75))} ${u(T.minutes)}${due ? ` · ${due} ${u(T.dueReviews)}` : ''}`),
        h('button', { class: 'btn primary big pulse', onclick: () => startMission() }, u(td.mq > 0 ? T.continueMission : T.startMission))]);
  const strands = h('section', { class: 'card b-wide' }, h('div', { class: 'eyebrow' }, u(T.practise)),
    h('div', { class: 'strands' }, enabledStrands().map(s => {
      const pr = strandProgress(skills, state.skills, s, cls);
      return h('button', { class: `strand s-${s}`, onclick: () => startPractice(s) },
        h('span', { class: 'sico', 'aria-hidden': 'true' }, ICON[s] || '📘'), h('span', { class: 'sname' }, strandName(s)),
        bar(pr.classTotal ? pr.classMastered / pr.classTotal : 0),
        h('small', {}, `${pr.classMastered}/${pr.classTotal} ${u(T.thisClass)}${pr.ahead ? ` · +${pr.ahead} ${u(T.ahead)}` : ''}`));
    })));
  const masteredN = skills.filter(sk => state.skills[sk.id] && state.skills[sk.id].m).length;
  const test = h('section', { class: 'card row b-half' }, h('div', {}, h('div', { class: 'eyebrow' }, u(T.test)), h('p', { class: 'muted small' }, u(masteredN >= 5 ? T.testNote : T.testNeeds))),
    h('button', { class: 'btn', disabled: masteredN < 5, onclick: () => startTest() }, u(T.start)));
  const off = h('section', { class: 'card offscreen b-half' }, h('div', { class: 'eyebrow' }, u(T.offscreen)), h('p', {}, t(offscreenToday())));
  const sDays = streak(state.days, today(), addDays);
  const tStreak = h('section', { class: 'card tile b-half' }, h('div', { class: 'eyebrow' }, u(T.streak)), h('span', { class: 'big-ico', 'aria-hidden': 'true' }, h('span', { class: 'flame' }, '🔥')), h('div', { class: 'big-n' }, String(sDays)));
  const tStars = h('section', { class: 'card tile b-half' }, h('div', { class: 'eyebrow' }, u(T.stars)), h('span', { class: 'big-ico', 'aria-hidden': 'true' }, '⭐'), h('div', { class: 'big-n' }, String(state.stars || 0)));
  mount(header(), h('main', { class: 'wrap' }, !storage.ok && h('p', { class: 'warn' }, u(T.storageWarn)), boot.recovered && h('p', { class: 'warn' }, u(T.recovered)),
    h('h1', { class: 'hello' }, `${u(T.hello)}, ${p.name}`),
    h('div', { class: 'bento' }, mission, levelTile(), tStreak, tStars, td.done ? off : null, strands, test, td.done ? null : off, badgeShelf())), nav('home'));
  if (!isEmpty(pending)) celebrate(pending);
}

// ---------- sessions ----------
let run = null; // { s: session, mode, results: [] }
function startMission() {
  const p = state.profile, day = today(), td = state.days[day] || { mq: 0 };
  const plan = buildMission(skills, state.skills, { ...p, dailyQ: Math.max(1, p.dailyQ - (td.mq || 0)) }, now(), day);
  begin(createSession(app, plan, { mission: true, goal: p.dailyQ }), 'mission');
}
function startPractice(strand) {
  const td = state.days[today()] || { q: 0 };
  if (td.q >= state.profile.dailyQ * 2.5) { toast(u(T.enough)); return; }
  begin(createSession(app, Array.from({ length: 8 }, () => ({ kind: 'learn', strand }))), 'practice');
}
function startSkill(id) { begin(createSession(app, Array.from({ length: 6 }, () => ({ kind: 'skill', skill: id }))), 'practice'); }
function startTest() {
  const pool = skills.filter(sk => state.skills[sk.id] && state.skills[sk.id].m);
  const picks = Array.from({ length: 15 }, (_, i) => pool[(i * 7 + Math.floor(Math.random() * pool.length)) % pool.length]);
  begin(createSession(app, picks.map(sk => ({ kind: 'skill', skill: sk.id })), { test: true }), 'test');
}
function begin(s, mode) {
  run = { s, mode, results: [] };
  if (mode !== 'test' && startReward(state, today())) { persist(); toast(`⭐ ${u(T.startBonus)}`, 2200); }
  step(s.next());
}

function step(cur) {
  voice.stop();
  if (cur.type === 'done') return finish();
  if (cur.type === 'lesson') return lesson(cur);
  question(cur);
}
function progressHead(cur) {
  const frac = cur.total ? cur.index / cur.total : 0;
  return h('div', { class: 'qhead' },
    h('button', { class: 'btn ghost small', onclick: () => { voice.stop(); run.s.finish(); persist(); run = null; go('home'); } }, u(T.quit)),
    bar(frac, 'thin'), h('span', { class: 'muted small' }, cur.total ? `${cur.index + 1}/${cur.total}` : ''));
}
function lesson(cur) {
  const sk = cur.skill, ex = cur.example;
  const exAns = answerText(ex);
  const body = h('section', { class: `card lesson s-${sk.strand}` },
    h('div', { class: 'eyebrow' }, `${u(T.newSkill)} · ${strandName(sk.strand)}`),
    h('h1', {}, t(sk.title)),
    h('p', { class: 'tip' }, t(sk.tip)),
    h('div', { class: 'example' }, h('div', { class: 'eyebrow' }, u(T.example)),
      ex.passage && h('p', { class: 'muted small' }, ex.passage.title),
      ex.code && h('pre', { class: 'code' }, ex.code),
      h('p', {}, t(ex.prompt)), h('p', {}, h('b', {}, `${u(T.answerIs)}: `), exAns), h('p', { class: 'muted' }, t(ex.explain))),
    h('div', { class: 'actions' },
      voice.available() && h('button', { class: 'btn', onclick: () => voice.speak(`${t(sk.title)}. ${t(sk.tip)}`) }, u(T.listen)),
      h('button', { class: 'btn primary', id: 'go', onclick: () => step(run.s.next()) }, u(T.gotIt))));
  mount(h('main', { class: 'wrap narrow' }, progressHead(cur), body));
  document.getElementById('go').focus();
}
function answerText(q) {
  if (q.kind === 'mcq') return t(q.options[q.answer].t);
  if (q.kind === 'frac') return q.answer.d === 1 ? String(q.answer.n) : `${q.answer.n}/${q.answer.d}`;
  if (q.kind === 'order') return q.answer.map(i => t(q.items[i])).join(' → ');
  if (q.kind === 'match') return q.left.map((l, i) => `${t(l)} → ${t(q.right[q.answer[i]])}`).join('; ');
  if (q.kind === 'num') return fmt(q.answer);
  return q.answer;
}
function robotGrid(g) {
  const NS = 'http://www.w3.org/2000/svg', S = 34, svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${S * 5 + 30} ${S * 5 + 30}`); svg.setAttribute('class', 'grid'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `5 by 5 grid, robot at (${g.x}, ${g.y})`);
  const el = (n, a, txt) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; svg.append(e); return e; };
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) el('rect', { x: 26 + i * S, y: 4 + j * S, width: S - 2, height: S - 2, rx: 4, class: 'cell' });
  for (let i = 1; i <= 5; i++) { el('text', { x: 26 + (i - 1) * S + S / 2 - 1, y: S * 5 + 22, class: 'lbl', 'text-anchor': 'middle' }, String(i)); el('text', { x: 12, y: 4 + (5 - i) * S + S / 2 + 4, class: 'lbl', 'text-anchor': 'middle' }, String(i)); }
  const cx = 26 + (g.x - 1) * S + S / 2 - 1, cy = 4 + (5 - g.y) * S + S / 2 - 1;
  const rot = [0, 90, 180, 270][g.d];
  el('path', { d: 'M0,-11 L9,9 L0,4 L-9,9 Z', class: 'bot', transform: `translate(${cx},${cy}) rotate(${rot})` });
  return svg;
}
// Answer controls for any question kind. submit(raw) grades; lock() freezes the controls after grading.
function controls(q, m, seen, submit) {
  let opts = null, input = null, wid = null;
  if (q.kind === 'mcq') {
    opts = h('div', { class: 'options' + (q.options.length <= 3 && q.options.every(o => t(o.t).length < 14) ? ' inline' : '') },
      q.options.map((o, i) => h('button', { class: 'opt', 'data-i': String(i), onclick: () => submit(i) }, h('span', { class: 'key' }, 'ABCDE'[i]), h('span', {}, tx(o.t, m, seen)))));
  } else if (q.kind === 'order' || q.kind === 'match') {
    wid = (q.kind === 'order' ? orderWidget : matchWidget)(q, v => tx(v, m, seen));
  } else {
    input = h('input', { id: 'ans', class: 'answer', autocomplete: 'off', autocapitalize: q.caps ? 'characters' : 'off', spellcheck: 'false', inputmode: q.kind === 'text' ? 'text' : (q.kind === 'frac' ? 'text' : 'decimal'), 'aria-label': u(T.yourAnswer), placeholder: q.kind === 'frac' ? u(T.fracHint) : u(T.yourAnswer) });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(input.value); });
  }
  const row = input ? h('div', { class: 'answer-row' }, input, h('button', { class: 'btn primary', onclick: () => submit(input.value) }, u(T.check)))
    : wid ? h('div', { class: 'answer-row stack' }, wid.el, h('button', { class: 'btn primary', onclick: () => { const r = wid.raw(); submit(r === null ? '' : r); } }, u(T.check))) : null;
  // Soft states only: a missed answer is outlined, never painted red. reveal=true also shows the right option.
  const lock = (ok, raw, reveal) => {
    if (opts) opts.querySelectorAll('.opt').forEach(b => { b.disabled = true; const i = +b.dataset.i; if (i === q.answer && (ok || reveal)) b.classList.add('right'); else if (!ok && String(i) === String(raw)) b.classList.add('miss'); });
    if (input) { input.disabled = true; input.classList.add(ok ? 'right' : 'miss'); }
    if (wid) wid.lock();
  };
  return { opts, input, row, lock, focus: card => (input || card.querySelector('.opt, .tile-btn')).focus({ preventScroll: true }) };
}
// The part of a question card that shows what is being asked.
function askBlock(q, m, seen) {
  return [q.passage && h('details', { class: 'passage', open: true }, h('summary', {}, q.passage.title), h('p', {}, q.passage.text)),
    q.lead && h('p', { class: 'muted' }, u(q.lead)), h('p', { class: 'prompt' }, tx(q.prompt, m, seen)), q.grid && robotGrid(q.grid), q.code && h('pre', { class: 'code' }, q.code)];
}
function question(cur) {
  const { q, skill: sk } = cur, m = M(), seen = new Set();
  const prompt = tx(q.prompt, m, new Set());
  let answered = false;
  const fb = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  const nextBtn = h('button', { class: 'btn primary big', hidden: true, onclick: () => step(run.s.next()) }, u(T.next));
  const actions = h('div', { class: 'actions' });
  const submit = raw => {
    if (answered) return;
    const res = run.s.answer(raw);
    if (!res.valid) { fb.className = 'feedback note'; fb.replaceChildren(u(q.kind === 'text' ? T.notWord : T.notAnswer)); return; }
    answered = true;
    persist();
    if (run.mode === 'test') { run.results.push({ q, sk, raw, ok: res.ok }); return step(run.s.next()); }
    showResult(res, raw);
  };
  const ctl = controls(q, m, seen, submit);
  function showResult(res, raw) {
    ctl.lock(res.ok, raw, false);
    if (!res.ok) { // Recursive Guidance Loop: hint now, then an easier question, then a retry (see guide()).
      const hint = hintFor(sk, app.misc, res.trap);
      const lines = [h('p', { class: 'verdict' }, `🤔 ${u(MSG.oops)}`), h('p', { class: 'hint' }, h('b', {}, `💡 ${u(MSG.hintLbl)}: `), t(hint.text))];
      if (res.events.includes('stuck')) lines.push(h('p', { class: 'muted' }, u(T.stuck)));
      fb.className = 'feedback try'; fb.replaceChildren(...lines);
      nextBtn.remove();
      const go = h('button', { class: 'btn primary big pulse', onclick: () => guide(cur, { q, sk, trap: res.trap }, 0) }, u(MSG.easier));
      actions.append(go); go.focus();
      if (voice.available() && state.profile.autoRead) voice.speak(fb.textContent);
      return;
    }
    const lines = [h('p', { class: 'verdict' }, u(T.correct), ' ', h('span', { class: 'star-pop' }, '+1 ⭐')), h('p', {}, tx(q.explain, m, seen))];
    for (const e of res.events) {
      if (e === 'mastered') { lines.push(h('p', { class: 'badge-line' }, `★ ${u(T.masteredNow)}: ${t(sk.title)}`)); if (sk.explore) lines.push(h('a', { href: sk.explore, target: '_blank', rel: 'noopener noreferrer', referrerpolicy: 'no-referrer', class: 'explore' }, u(T.explore))); }
      if (e === 'review_ok') lines.push(h('p', { class: 'muted' }, u(T.reviewOk)));
    }
    fb.className = 'feedback good'; fb.replaceChildren(...lines);
    nextBtn.hidden = false; nextBtn.focus();
  }
  const helpBtn = h('button', { class: 'btn ghost small', onclick: e => { if (run.s.askParent()) { persist(); e.currentTarget.disabled = true; toast(u(T.helpSent)); } } }, u(T.help));
  actions.append(voice.available() && h('button', { class: 'btn ghost small', onclick: () => voice.speak(q.say ? q.say : `${prompt} ${q.kind === 'mcq' ? q.options.map((o, i) => `${'ABCDE'[i]}. ${t(o.t)}.`).join(' ') : ''}`) }, u(T.listen)), run.mode !== 'test' && helpBtn, nextBtn);
  const card = h('section', { class: `card q s-${sk.strand}` },
    h('div', { class: 'eyebrow' }, `${strandName(sk.strand)} · ${t(sk.title)}${cur.review ? ` · ${u(T.review)}` : ''}`),
    askBlock(q, m, seen), ctl.opts, ctl.row, fb, actions);
  mount(h('main', { class: 'wrap narrow' }, progressHead(cur), card));
  if (q.say && voice.available()) voice.speak(q.say);
  ctl.focus(card);
}

// ---------- Recursive Guidance Loop: Hint -> Scaffold -> Retry -> Reward ----------
// Guided answers are practice: they never change mastery. Only the first attempt is graded.
function miniCard(q, sk, { tag, intro, after }) {
  const m = M(), seen = new Set(); let done = false;
  const fb = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' }), actions = h('div', { class: 'actions' });
  const submit = raw => {
    if (done) return;
    const res = check(q, raw);
    if (!res.valid) { fb.className = 'feedback note'; fb.replaceChildren(u(q.kind === 'text' ? T.notWord : T.notAnswer)); return; }
    done = true; ctl.lock(res.ok, raw, false);
    after(res, {
      say: (cls, nodes) => { fb.className = 'feedback ' + cls; fb.replaceChildren(...nodes); },
      reveal: () => ctl.lock(false, raw, true),
      next: (label, fn) => { const b = h('button', { class: 'btn primary big', onclick: fn }, label); actions.append(b); b.focus(); },
    });
  };
  const ctl = controls(q, m, seen, submit);
  const card = h('section', { class: `card q guide s-${sk.strand}` }, h('div', { class: 'eyebrow' }, tag), intro, askBlock(q, m, seen), ctl.opts, ctl.row, fb, actions);
  return { card, focus: () => ctl.focus(card) };
}
const verdictP = (icon, v) => h('p', { class: 'verdict' }, `${icon} ${u(v)}`);
const hintP = (sk, trap) => h('p', { class: 'hint' }, h('b', {}, `💡 ${u(MSG.hintLbl)}: `), t(hintFor(sk, app.misc, trap).text));
const nextQuestion = () => step(run.s.next());
// orig = { q, sk, trap }: the question that was missed at this level. onDone() runs after this level's retry.
function guide(cur, orig, depth, onDone = nextQuestion) {
  const sc = scaffoldFor(byId, orig.sk, orig.q, (Date.now() & 0x7fffffff) + depth * 7919);
  const intro = sc.worked ? h('div', { class: 'example' }, h('div', { class: 'eyebrow' }, `📖 ${u(MSG.worked)}`), h('p', {}, tx(sc.worked, M())))
    : h('p', { class: 'muted' }, `🌱 ${u(MSG.prereqNote)} · ${t(sc.skill.title)}`);
  const retry = () => showRetry(cur, orig, depth === 0, onDone);
  const mc = miniCard(sc.q, sc.skill, { tag: `🪜 ${u(MSG.easier)}`, intro, after: (res, c) => {
    if (res.ok) { c.say('good', [verdictP('✅', MSG.scaffoldOk), h('p', {}, tx(sc.q.explain, M()))]); return c.next(u(MSG.tryOrig), retry); }
    if (depth + 1 < MAX_DEPTH) { // the easier question was missed too: one more, simpler level, then back up
      c.say('try', [verdictP('🤔', MSG.oops), hintP(sc.skill, res.trap)]);
      return c.next(u(MSG.easier), () => guide(cur, { q: sc.q, sk: sc.skill, trap: res.trap }, depth + 1, retry));
    }
    c.reveal(); c.say('try', [verdictP('🌱', MSG.scaffoldNo), h('p', {}, h('b', {}, `${u(T.correctAnswer)}: `), answerText(sc.q)), h('p', {}, tx(sc.q.explain, M()))]);
    c.next(u(MSG.tryOrig), retry);
  } });
  mount(h('main', { class: 'wrap narrow' }, progressHead(cur), mc.card)); mc.focus();
}
function showRetry(cur, o, top, onDone) {
  const mc = miniCard(o.q, o.sk, { tag: `🔁 ${u(MSG.retry)}`, intro: null, after: (res, c) => {
    const label = u(top ? T.next : MSG.tryOrig);
    if (res.ok) {
      const lines = [verdictP('🎉', top ? MSG.comeback : MSG.scaffoldOk)];
      if (top) { const n = comebackReward(state); persist(); confetti(34); lines.push(h('p', {}, h('span', { class: 'star-pop' }, `+${n} ⭐`))); }
      lines.push(h('p', {}, tx(o.q.explain, M())));
      c.say('good', lines); return c.next(label, onDone);
    }
    c.reveal();
    const lines = [verdictP('🌱', MSG.notYet), h('p', {}, h('b', {}, `${u(T.correctAnswer)}: `), answerText(o.q)), h('p', {}, tx(o.q.explain, M()))];
    const rem = res.trap && app.misc[res.trap]; if (rem) lines.push(h('p', { class: 'remedy' }, h('b', {}, `${u(T.remember)}: `), t(rem)));
    c.say('try', lines); c.next(label, onDone);
  } });
  mount(h('main', { class: 'wrap narrow' }, progressHead(cur), mc.card)); mc.focus();
}

function finish() {
  const st = run.s.finish();
  const rw = settleNow({ stats: st, completed: true }); persist();
  const rows = [h('div', { class: 'eyebrow' }, u(T.done)),
    h('div', { class: 'big-stats' },
      h('div', {}, h('b', {}, String(st.asked)), h('small', {}, u(T.answered))),
      h('div', {}, h('b', {}, String(st.correct)), h('small', {}, u(T.rightCount))),
      h('div', {}, h('b', {}, `+${st.stars + rw.gold + rw.bonus}`), h('small', {}, u(T.stars))))];
  if (!isEmpty(rw)) rows.push(h('div', { class: 'rw-box' }, rewardLines(rw)));
  if (st.mastered.length) rows.push(h('h2', {}, u(T.newMastered)), h('ul', {}, [...new Set(st.mastered)].map(id => h('li', {}, t(byId[id].title)))));
  if (run.mode === 'test' && run.results.length) {
    rows.push(h('h2', {}, u(T.testReview)), h('ol', { class: 'review-list' }, run.results.map(r => h('li', { class: r.ok ? 'ok' : 'no' },
      h('p', {}, t(r.q.prompt)), !r.ok && h('p', {}, h('b', {}, `${u(T.correctAnswer)}: `), answerText(r.q)), !r.ok && h('p', { class: 'muted' }, t(r.q.explain))))));
  }
  if (run.mode === 'mission') rows.push(h('div', { class: 'card offscreen inset' }, h('div', { class: 'eyebrow' }, u(T.offscreen)), h('p', {}, t(offscreenToday()))));
  rows.push(h('button', { class: 'btn primary big', onclick: () => go('home') }, u(T.backHome)));
  run = null;
  mount(h('main', { class: 'wrap narrow' }, h('section', { class: 'card done' }, rows)));
  if (!isEmpty(rw) || st.mastered.length) confetti(rw.levelUp ? 80 : 40);
}

// ---------- skill map ----------
let mapStrand = 'm';
function viewMap() {
  const day = today(), cls = classNow(state.profile, now());
  ensureState(skills, state.skills, state.profile, now());
  const tabs = h('div', { class: 'chips', role: 'tablist' }, STRANDS.map(s => h('button', { class: `chip s-${s}${s === mapStrand ? ' on' : ''}`, role: 'tab', 'aria-selected': String(s === mapStrand), onclick: () => { mapStrand = s; viewMap(); } }, strandName(s))));
  const list = skills.filter(sk => sk.strand === mapStrand);
  const grades = [...new Set(list.map(sk => sk.grade))].sort((a, b) => a - b);
  const next = frontier(skills, state.skills, mapStrand, cls)[0];
  const groups = grades.map(g => h('section', { class: 'card' },
    h('div', { class: 'eyebrow' }, `${u(T.classN)} ${g}${g === cls ? ` · ${u(T.thisClass)}` : ''}`),
    h('ul', { class: 'skills' }, list.filter(sk => sk.grade === g).map(sk => {
      const s = state.skills[sk.id], status = skillStatus(sk, state.skills, day, unlocked);
      return h('li', { class: `sk ${status}${next && next.id === sk.id ? ' next' : ''}` },
        h('button', { class: 'sk-btn', onclick: () => skillSheet(sk) },
          h('span', { class: 'sk-title' }, t(sk.title)),
          h('span', { class: `pill ${status}` }, u(T[status])),
          bar(s ? s.p : 0, 'thin')));
    }))));
  mount(header(), h('main', { class: 'wrap' }, tabs, groups), nav('map'));
}
function skillSheet(sk) {
  const s = state.skills[sk.id], ok = unlocked(sk, state.skills);
  const dlg = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': t(sk.title) },
    h('div', { class: 'sheet-body card' },
      h('div', { class: 'eyebrow' }, `${strandName(sk.strand)} · ${u(T.classN)} ${sk.grade}`),
      h('h2', {}, t(sk.title)), h('p', {}, t(sk.tip)),
      s && h('p', { class: 'muted small' }, `${Math.round(s.p * 100)}% · ${s.c}/${s.n} ${u(T.rightCount)}`),
      sk.pre.length > 0 && h('p', { class: 'small' }, h('b', {}, `${u(T.needs)}: `), sk.pre.map(p => (byId[p] ? t(byId[p].title) : p) + (state.skills[p] && state.skills[p].m ? ' ✓' : '')).join(', ')),
      sk.explore && h('a', { href: sk.explore, target: '_blank', rel: 'noopener noreferrer', referrerpolicy: 'no-referrer', class: 'explore' }, u(T.explore)),
      h('div', { class: 'actions' },
        h('button', { class: 'btn ghost', 'aria-label': u(T.close), onclick: () => close() }, '✕'),
        ok && h('button', { class: 'btn primary', onclick: () => { close(); startSkill(sk.id); } }, u(T.practiseThis)))));
  const opener = document.activeElement;
  const close = () => { dlg.remove(); if (opener && opener.isConnected) opener.focus(); };
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab') return; // keep focus inside the dialog
    const f = [...dlg.querySelectorAll('button, a[href]')], first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.querySelectorAll('.sheet').forEach(x => x.remove());
  document.body.append(dlg);
  dlg.querySelector('.btn.primary, .btn').focus();
}

// ---------- parent area ----------
let parentOpen = false, parentSeen = 0;
const PARENT_IDLE_MS = 5 * 60 * 1000; // the parent area locks itself when left or idle
function viewParent() {
  if (!parentOpen) {
    const f = h('form', { class: 'card form narrow-card' }, h('h1', {}, u(T.enterPin)),
      h('input', { id: 'pin', inputmode: 'numeric', type: 'password', maxlength: '4', autocomplete: 'off', 'aria-label': u(T.enterPin) }),
      h('p', { class: 'err', id: 'pinerr', role: 'alert', hidden: true }, u(T.wrongPin)),
      h('button', { class: 'btn primary', type: 'submit' }, u(T.open)));
    const err = f.querySelector('#pinerr');
    const showLock = () => { const s = lockedFor(state.lock, Date.now()); if (s > 0) { err.textContent = `${u(T.pinLocked)}: ${s} ${u(T.seconds)}`; err.hidden = false; } return s > 0; };
    showLock();
    f.addEventListener('submit', e => {
      e.preventDefault();
      if (showLock()) return;
      const pin = f.querySelector('#pin').value, ok = verifyPin(pin, state.profile.pin);
      state.lock = recordAttempt(state.lock, ok, Date.now());
      if (ok) { if (needsUpgrade(state.profile.pin)) state.profile.pin = makePin(pin); persist(); parentOpen = true; parentSeen = Date.now(); return viewParent(); }
      persist(); f.querySelector('#pin').value = '';
      if (!showLock()) { err.textContent = u(T.wrongPin); err.hidden = false; }
    });
    mount(header(), h('main', { class: 'wrap' }, f), nav('parent'));
    f.querySelector('#pin').focus();
    return;
  }
  parentSeen = Date.now();
  const d = now(), day = today(), p = state.profile;
  ensureState(skills, state.skills, p, d);
  const wk = weekSummary(state, day);
  const week = h('section', { class: 'card' }, h('div', { class: 'eyebrow' }, u(T.week)),
    h('div', { class: 'big-stats' },
      h('div', {}, h('b', {}, `${wk.days}/7`), h('small', {}, u(T.daysActive))),
      h('div', {}, h('b', {}, String(wk.n)), h('small', {}, u(T.questions))),
      h('div', {}, h('b', {}, wk.n ? `${Math.round(wk.acc * 100)}%` : '–'), h('small', {}, u(T.accuracy))),
      h('div', {}, h('b', {}, wk.n ? `${wk.avgSec.toFixed(0)}s` : '–'), h('small', {}, u(T.avgTime)))),
    h('p', { class: 'muted small' }, u(T.talk)));
  const rm = roadmap(skills, state.skills, p, d, day);
  const road = h('section', { class: 'card' }, h('div', { class: 'eyebrow' }, u(T.roadmap)), h('p', { class: 'muted small' }, u(T.roadmapNote)),
    h('div', { class: 'road' }, rm.rows.map(r => h('div', { class: 'road-row' + (r.current ? ' current' : '') },
      h('span', { class: 'road-y' }, r.label), h('span', { class: 'road-c' }, `${u(T.classN)} ${r.cls}`),
      r.total ? bar(r.done / r.total) : h('span', { class: 'muted small' }, t(L('Content pack needed', 'सामग्री पैक चाहिए'))),
      h('span', { class: 'road-n' }, r.total ? `${r.done}/${r.total}` : '')))),
    h('p', { class: 'small' }, h('b', {}, `${u(T.pace)}: `), rm.perWeek > 0
      ? t(L(`${rm.perWeek.toFixed(1)} new skills a week. ${rm.left} skills of this class and below are left: about ${rm.weeksLeft} week(s) at this pace.`, `प्रति सप्ताह ${rm.perWeek.toFixed(1)} नए कौशल। इस कक्षा तक के ${rm.left} कौशल बाकी हैं: इस गति से लगभग ${rm.weeksLeft} सप्ताह।`))
      : t(L(`${rm.left} skills of this class and below are left. Pace appears after the first skills are mastered.`, `इस कक्षा तक के ${rm.left} कौशल बाकी हैं। पहले कौशल सीखने के बाद गति दिखेगी।`))));
  const helpList = needsHelp(skills, state.skills);
  const helpCard = h('section', { class: 'card' }, h('div', { class: 'eyebrow' }, u(T.needsHelp)),
    helpList.length ? h('ul', {}, helpList.map(sk => h('li', {}, h('b', {}, t(sk.title)), ' – ', t(sk.tip)))) : h('p', { class: 'muted' }, u(T.noHelp)));
  const tm = topMistakes(state, day);
  const mist = h('section', { class: 'card' }, h('div', { class: 'eyebrow' }, u(T.mistakes)),
    tm.length ? h('ul', {}, tm.map(([k, n]) => h('li', {}, t(MISC[k]), h('span', { class: 'muted' }, ` (${n}×)`)))) : h('p', { class: 'muted' }, u(T.noMistakes)));
  const asks = state.asks.filter(a => !a.done);
  const askCard = h('section', { class: 'card' }, h('div', { class: 'eyebrow' }, u(T.asks)),
    asks.length ? h('ul', { class: 'asks' }, asks.map(a => h('li', {}, h('span', {}, `${a.d} · ${byId[a.s] ? t(byId[a.s].title) : a.s}: ${a.q}`),
      h('button', { class: 'btn small', onclick: () => { a.done = true; persist(); viewParent(); } }, u(T.resolved))))) : h('p', { class: 'muted' }, u(T.noAsks)));
  mount(header(), h('main', { class: 'wrap' }, week, helpCard, askCard, mist, road, settingsCard(), pinCard(), packsCard(), backupCard(),
    h('button', { class: 'btn ghost', onclick: () => { parentOpen = false; go('home'); } }, u(T.lockParent))), nav('parent'));
}
function settingsCard() {
  const p = state.profile, clsNow = classNow(p, now());
  const f = h('form', { class: 'card form' }, h('div', { class: 'eyebrow' }, u(T.settings)),
    h('label', { for: 's-lang' }, u(T.language)),
    h('select', { id: 's-lang' }, [['bi', T.langBi], ['hi', T.langHi], ['en', T.langEn]].map(([v, l]) => h('option', { value: v, selected: p.lang === v }, ui(l, 'bi')))),
    h('label', { for: 's-daily' }, u(T.daily)),
    h('select', { id: 's-daily' }, [12, 18, 24, 30].map(n => h('option', { value: String(n), selected: p.dailyQ === n }, String(n)))),
    h('label', { for: 's-cls' }, u(T.classIn)),
    h('select', { id: 's-cls' }, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(c => h('option', { value: String(c), selected: clsNow === c }, String(c)))),
    h('fieldset', {}, h('legend', {}, u(T.subjects)), STRANDS.map(s => h('label', { class: 'check' }, h('input', { type: 'checkbox', value: s, checked: !(p.off || []).includes(s) }), strandName(s)))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 's-read', checked: !!p.autoRead }), t(L('Read explanations aloud after a wrong answer', 'गलत उत्तर के बाद व्याख्या पढ़कर सुनाएँ'))),
    h('button', { class: 'btn primary', type: 'submit' }, u(T.save)));
  f.addEventListener('submit', e => {
    e.preventDefault();
    p.lang = f.querySelector('#s-lang').value; p.dailyQ = +f.querySelector('#s-daily').value;
    const c = +f.querySelector('#s-cls').value;
    if (c !== clsNow) { p.cls = c; p.ay0 = academicYear(now()); } // the chosen class is the class for the session running today
    p.off = [...f.querySelectorAll('fieldset input')].filter(x => !x.checked).map(x => x.value);
    if (p.off.length === STRANDS.length) p.off = [];
    p.autoRead = f.querySelector('#s-read').checked;
    persist(); toast(u(T.saved)); viewParent();
  });
  return f;
}
function pinCard() {
  const f = h('form', { class: 'card form' }, h('div', { class: 'eyebrow' }, u(T.changePin)),
    h('label', { for: 'np' }, u(T.newPin)), h('input', { id: 'np', type: 'password', inputmode: 'numeric', maxlength: '4', autocomplete: 'off' }),
    h('p', { class: 'err', id: 'np-err', role: 'alert', hidden: true }, u(T.pinNeeded)),
    h('button', { class: 'btn', type: 'submit' }, u(T.save)));
  f.addEventListener('submit', e => {
    e.preventDefault();
    const v = f.querySelector('#np').value;
    if (!/^\d{4}$/.test(v) || !validPin(v)) { f.querySelector('#np-err').hidden = false; return; }
    state.profile.pin = makePin(v); persist(); toast(u(T.pinChanged)); viewParent();
  });
  return f;
}
async function offerFile(name, text) {
  try {
    if (window.claude && window.claude.use) {
      const dl = await Promise.race([window.claude.use('downloads'), new Promise(r => setTimeout(() => r(null), 1500))]);
      if (dl) { await dl.save({ filename: name, data: text }); return; }
    }
  } catch { /* fall through to a normal download */ }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function backupCard() {
  const area = h('textarea', { id: 'b-text', rows: '3', 'aria-label': u(T.pasteB), placeholder: u(T.pasteB) });
  const file = h('input', { type: 'file', id: 'b-file', accept: '.json,application/json,text/plain' });
  // Restoring replaces everything, so it takes two taps and keeps one undo copy.
  let pending = null;
  const note = h('p', { class: 'warn', role: 'alert', hidden: true }, u(T.confirmRestore));
  const goBtn = h('button', { class: 'btn', onclick: () => {
    const text = pending != null ? pending : area.value.trim();
    if (!text) return;
    if (pending == null) { try { importText(text); } catch (e) { toast(e.message); return; } pending = text; note.hidden = false; goBtn.classList.add('danger'); return; }
    try { const next = importText(text); keepUndo(storage); state = next; state.lock = { f: 0, until: 0 }; rebuildSkills(); persist(); toast(u(T.restored)); parentOpen = false; go('home'); } catch (e) { toast(e.message); }
  } }, u(T.restoreB));
  file.addEventListener('change', async () => {
    const f = file.files[0]; if (!f) return;
    if (f.size > MAX_IMPORT_BYTES) { toast(u(T.tooBig)); file.value = ''; return; }
    try { const text = await f.text(); importText(text); pending = text; note.hidden = false; goBtn.classList.add('danger'); goBtn.focus(); } catch (e) { toast(e.message); file.value = ''; }
  });
  area.addEventListener('input', () => { pending = null; note.hidden = true; goBtn.classList.remove('danger'); });
  const undo = readUndo(storage);
  const confirm = h('input', { id: 'b-reset', autocomplete: 'off', 'aria-label': u(T.resetConfirm), placeholder: 'ERASE' });
  return h('section', { class: 'card form' }, h('div', { class: 'eyebrow' }, u(T.backup)), h('p', { class: 'muted small' }, u(T.backupNote)),
    h('div', { class: 'actions wrap-row' },
      h('button', { class: 'btn primary', onclick: () => offerFile(`ks-learn-backup-${today()}.json`, exportText(state)) }, u(T.exportB)),
      h('button', { class: 'btn', onclick: async () => { const txt = exportText(state); try { await navigator.clipboard.writeText(txt); toast(u(T.copied)); } catch { area.value = txt; area.select(); } } }, u(T.copyB))),
    h('label', { for: 'b-file' }, u(T.importB)), file, area,
    note, goBtn,
    undo && undo.profile && h('button', { class: 'btn ghost', onclick: () => { const prev = readUndo(storage); if (!prev) return; keepUndo(storage); state = prev; rebuildSkills(); persist(); toast(u(T.undone)); parentOpen = false; go('home'); } }, u(T.undo)),
    h('details', {}, h('summary', {}, u(T.reset)), h('label', { for: 'b-reset' }, u(T.resetConfirm)), confirm,
      h('button', { class: 'btn danger', onclick: () => { if (confirm.value.trim() === 'ERASE') { keepUndo(storage); storage.removeItem(STORE_KEY); state = freshState(); rebuildSkills(); parentOpen = false; render(); } } }, u(T.reset))));
}
function packsCard() {
  const file = h('input', { type: 'file', id: 'p-file', accept: '.json,application/json' });
  const out = h('ul', { class: 'small errs' });
  file.addEventListener('change', async () => {
    const f = file.files[0]; if (!f) return;
    if (f.size > MAX_IMPORT_BYTES) { out.replaceChildren(h('li', {}, u(T.tooBig))); return; }
    let pack; try { pack = JSON.parse(await f.text()); } catch { out.replaceChildren(h('li', {}, u(T.packBad))); return; }
    // Validate against everything except an older copy of the same pack, which this one replaces.
    const others = (state.packs || []).filter(p => p.id !== (pack && pack.id));
    let base = SKILLS.slice(); for (const p of others) base = base.concat(packToSkills(p));
    let errs; try { errs = validatePack(pack, base, MISC); } catch { errs = [u(T.packBad)]; }
    if (errs.length) { out.replaceChildren(...errs.map(e => h('li', {}, e))); return; }
    if (others.length >= 20) { out.replaceChildren(h('li', {}, u(T.tooBig))); return; }
    state.packs = [...others, pack]; rebuildSkills(); ensureState(skills, state.skills, state.profile, now());
    toast(`${pack.skills.length} ${u(T.packAdded)}`); persist(); viewParent();
  });
  return h('section', { class: 'card form' }, h('div', { class: 'eyebrow' }, u(T.packs)), h('p', { class: 'muted small' }, u(T.packsNote)),
    (state.packs || []).length ? h('ul', { class: 'asks' }, state.packs.map(p => h('li', {}, h('span', {}, `${String((p.title && (p.title.en || p.title.hi)) || p.id).slice(0, 80)} · ${p.skills.length}`),
      h('button', { class: 'btn small', onclick: () => { state.packs = state.packs.filter(x => x !== p); rebuildSkills(); persist(); viewParent(); } }, u(T.removePack))))) : null,
    h('label', { for: 'p-file' }, u(T.addPack)), file, out);
}
function restoreCard() {
  const file = h('input', { type: 'file', id: 'r-file', accept: '.json,application/json,text/plain' });
  file.addEventListener('change', async () => {
    const f = file.files[0]; if (!f) return;
    if (f.size > MAX_IMPORT_BYTES) { toast(ui(T.tooBig, 'bi')); return; }
    try { state = importText(await f.text()); state.lock = { f: 0, until: 0 }; rebuildSkills(); persist(); go('home'); } catch (e) { toast(e.message); }
  });
  return h('details', { class: 'card' }, h('summary', {}, ui(T.restore, 'bi')), h('label', { for: 'r-file' }, ui(T.importB, 'bi')), file);
}

// ---------- routing ----------
function go(route) { if (location.hash !== '#' + route) location.hash = route; else render(); }
function render() {
  voice.stop();
  if (!state.profile) return viewSetup();
  if (run) return; // never navigate away from a running session by hash
  const r = (location.hash || '#home').slice(1);
  document.documentElement.lang = M() === 'hi' ? 'hi' : 'en';
  document.querySelectorAll('.sheet').forEach(x => x.remove());
  if (r !== 'parent' || Date.now() - parentSeen > PARENT_IDLE_MS) parentOpen = false; // leaving the parent area locks it
  if (r === 'map') return viewMap();
  if (r === 'parent') return viewParent();
  return viewHome();
}
window.addEventListener('hashchange', () => { if (run) { run.s.finish(); persist(); run = null; } render(); });
// The parent area also locks when left idle. (Not on backgrounding: the file picker hides the page on phones.)
setInterval(() => { if (parentOpen && Date.now() - parentSeen > PARENT_IDLE_MS) { parentOpen = false; if (!run && state.profile) render(); } }, 30000);
document.addEventListener('pointerdown', () => { if (parentOpen) parentSeen = Date.now(); }, true);
document.addEventListener('keydown', () => { if (parentOpen) parentSeen = Date.now(); }, true);
// Another tab changed the saved progress: take the newer copy instead of overwriting it later.
window.addEventListener('storage', e => {
  if (e.key !== STORE_KEY || !storage.ok) return;
  state = load(storage).state; rebuildSkills(); run = null; parentOpen = false;
  toast(u(T.otherTab), 5000); render();
});
// Last line of defence: never leave a child on a blank or frozen screen.
let crashed = false;
function crash(err) {
  if (crashed) return; crashed = true;
  try { console.error(err); voice.stop(); } catch { /* ignore */ }
  run = null;
  const lbl = v => ui(v, 'bi');
  try {
    mount(h('main', { class: 'wrap narrow' }, h('section', { class: 'card', role: 'alert' }, h('h1', {}, lbl(T.errorTitle)), h('p', {}, lbl(T.errorNote)),
      h('div', { class: 'actions wrap-row' }, h('button', { class: 'btn primary', onclick: () => location.reload() }, lbl(T.reload))))));
  } catch { /* nothing more can be done */ }
}
window.addEventListener('error', e => { if (e.error) crash(e.error); }); // ignores cross-origin noise from browser extensions
window.addEventListener('unhandledrejection', e => crash(e.reason));
document.addEventListener('keydown', e => {
  if (!run || e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const k = e.key.toUpperCase(), i = 'ABCDE'.indexOf(k);
  const b = i >= 0 ? document.querySelector(`.opt[data-i="${i}"]`) : null;
  if (b && !b.disabled) b.click();
});
try { render(); } catch (e) { crash(e); }
/* global __PWA__ */
if (__PWA__ && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
