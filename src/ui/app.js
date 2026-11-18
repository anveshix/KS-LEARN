// KS-LEARN browser app: one child, one device, works offline.
import { SKILLS, BY_ID, MISC, STRAND_INFO } from '../content/index.js';
import { tx, ui, L } from '../core/i18n.js';
import { iso, addDays } from '../core/mastery.js';
import { ensureState, buildMission, classNow, academicYear, strandProgress, dueReviews, frontier, aheadFrontier, contentGaps, unlocked, STRANDS, SUPPORTED_CLASSES } from '../core/planner.js';
import { createSession, streak } from '../core/session.js';
import { load, save, freshState, exportText, parseImport, keepUndo, readUndo, STORE_KEY, MAX_IMPORT_BYTES } from '../core/store.js';
import { createLease } from '../core/lease.js';
import { trapFocus } from './dialog.js';
import { makePin, verifyPin, needsUpgrade, validPin, recordAttempt, lockedFor } from '../core/pin.js';
import { LEVELS, BADGES, levelInfo, startReward, comebackReward, settle, isEmpty } from '../core/rewards.js';
import { weekSummary, topMistakes, needsHelp, roadmap, skillStatus, learningModel } from '../core/insights.js';
import { packToSkills, validatePack } from '../core/packs.js';
import { fmt } from '../content/kit.js';
import { T, OFFSCREEN } from './labels.js';
import { h } from './dom.js';
import { orderWidget, matchWidget } from './widgets.js';
import { MARK_URI } from './mark.js';
import { check } from '../core/check.js';
import { hintFor, MSG } from '../core/guidance.js';
import { buildLadder, evidenceFor, FADE, LABEL } from '../core/scaffold.js';
import { guessRate } from '../core/mastery.js';
import { refit } from '../core/bkt.js';
import { createConsentFlow } from './consent-ui.js';
import { createAccountFlow } from './account-ui.js';
import { createLabsUI } from './labs-ui.js';
import { createWellbeingUI } from './wellbeing-ui.js';
import { createQuestsUI } from './quests-ui.js';
import { createStoriesUI } from './stories-ui.js';
import { labSummary } from '../core/labs.js';
import { verifyConsent, purposeOn, setChildDetails } from '../core/consent.js';

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
// One writer per device. A second tab is a reader until the learner explicitly takes over;
// no storage event may replace the state of a tab that is mid-session.
const lease = createLease(storage);
let readOnly = false;
function markReadOnly(announce) {
  const first = !readOnly;
  readOnly = true;
  if (announce && first) {
    toast(u(T.tabTaken), 6000);
    if (!run && state.profile) render();
  }
}
function writer() {
  if (lease.holds()) { lease.renew(); readOnly = false; return true; }
  if (!lease.peer() && lease.acquire()) { readOnly = false; return true; }
  markReadOnly(true);
  return false;
}
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
  // Restores and older saves may predate the adaptation counters: re-derive them from the
  // answer log where the log has the estimate each answer was given at.
  if (state.skills) refit(state.skills, state.log, { onlyMissing: true });
}
rebuildSkills();
const app = { get skills() { return skills; }, get byId() { return byId; }, get state() { return state; }, now, day: today, misc: MISC };
let saveWarned = 0;
function persist() {
  if (!writer()) return false;
  const ok = save(storage, state);
  if (!ok && Date.now() - saveWarned > 30000) { saveWarned = Date.now(); toast(u(T.saveFailed), 6000); }
  return ok;
}
const M = () => (state.profile && state.profile.lang) || 'bi';
const t = v => tx(v, M());
const u = v => ui(v, M());
const labsUI = createLabsUI({
  getState: () => state, h, mount, go, header, nav, persist, toast, confetti, today, t, u,
  currentClass: () => classNow(state.profile, now()), startSkill: id => startSkill(id),
});

const uiCtx = () => ({
  getState: () => state, h, mount, go, header, nav, persist, toast, confetti, today, t, u,
  currentClass: () => classNow(state.profile, now()), startSkill: id => startSkill(id),
  settleNow: extra => settleNow(extra), celebrate: r => celebrate(r),
});
const wellbeingUI = createWellbeingUI(uiCtx());
const questsUI = createQuestsUI(uiCtx());
const storiesUI = createStoriesUI(uiCtx());
const root = () => document.getElementById('app');
function mount(...nodes) { const r = root(); r.replaceChildren(...nodes); window.scrollTo(0, 0); }
function toast(msg, ms = 2600) {
  const el = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(el); setTimeout(() => el.remove(), ms);
}

const flow = createConsentFlow({
  getState: () => state,
  setConsent(record) { state.consent = record; persist(); },
  setLock(lock) { state.lock = lock; persist(); },
  persist, mount, go, render,
  toast: msg => toast(msg),
  offerFile: (name, text) => offerFile(name, text),
  brand: () => h('span', { class: 'brand-lockup' }, markElement('mark'), wordmark()),
  now: () => now(),
  onComplete: consentDone,
  guardianAction,
});

const accountFlow = createAccountFlow({
  getState: () => state,
  setAccount(record) { state.account = record; persist(); },
  getSession: () => guardianActive(),
  setSession(on) { if (on) startGuardianSession(); else endGuardianSession(); },
  persist, mount, go, render,
  toast: msg => toast(msg),
  offerFile: (name, text) => offerFile(name, text),
  brand: () => h('span', { class: 'brand-lockup' }, markElement('mark'), wordmark()),
  now: () => now(),
  onRegistered() {
    appUnlocked = true; startGuardianSession();
    if (!state.profile) return viewSetup();
    toast(ui(T.consentOk, 'bi'));
    go('home');
  },
  onLogin() {
    appUnlocked = true; startGuardianSession();
    const after = pendingAfterLogin, intent = loginIntent;
    pendingAfterLogin = null; loginIntent = null;
    if (after) return after();
    if (intent === 'parent' || parentOpen) { parentOpen = true; parentSeen = Date.now(); return go('parent'); }
    go('home');
  },
  signOut() { endGuardianSession(); appUnlocked = false; parentOpen = false; go('home'); },
});

// ---------- guardian session ----------
// The 4-digit PIN is a child lock. A guardian account session is what authorises privacy
// actions (withdrawal, erasure, credential changes). It lives in memory only, never on disk,
// and expires after 15 minutes; `appUnlocked` separately remembers an app-lock unlock for
// this browser session only.
const GUARDIAN_TTL = 15 * 60 * 1000;
let guardianSession = false, guardianAt = 0, appUnlocked = false;
let loginIntent = null, pendingAfterLogin = null;
const guardianActive = () => guardianSession && Date.now() - guardianAt < GUARDIAN_TTL;
function startGuardianSession() { guardianSession = true; guardianAt = Date.now(); appUnlocked = true; }
function endGuardianSession() { guardianSession = false; guardianAt = 0; }
function guardianAction(fn) {
  if (guardianActive()) { fn(); return true; }
  pendingAfterLogin = fn; loginIntent = null;
  toast(ui(T.loginNeeded, 'bi'), 4000);
  go('login');
  return false;
}

// ---------- parental consent (DPDP) ----------
// The flow is injected with storage, routing and file export so the consent screens stay
// free of hidden side effects. Every entry point re-checks the record with verifyConsent().
function consentDone(record) {
  state.consent = record;
  persist();
  if (!state.profile) return state.account ? viewSetup() : accountFlow.register(); // account, then profile
  // A renewal started from the Parent area returns there; a gate opened on the way in goes home.
  if (['consent', 'parent'].includes((location.hash || '').slice(1))) {
    parentSeen = Date.now();
    return go('parent');
  }
  toast(ui(T.consentOk, 'bi'));
  go('home');
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
    // Read-aloud is an optional purpose on the consent record. Without it, no voice button appears.
    available: () => !!(synth || ttsCap) && purposeOn(state.consent, 'readaloud'),
    speak(text) {
      if (!purposeOn(state.consent, 'readaloud')) return;
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
function bar(frac, cls = '', label = '') {
  return h('div', {
    class: 'bar ' + cls, role: 'progressbar', 'aria-label': label || u(T.progress),
    'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(frac * 100)),
  }, h('i', { style: `width:${Math.max(0, Math.min(100, frac * 100)).toFixed(1)}%` }));
}
function nav(active) {
  const item = (id, label, ico) => h('a', { href: '#' + id, class: 'tab' + (active === id ? ' on' : ''), 'aria-current': active === id ? 'page' : false }, h('span', { class: 'ico', 'aria-hidden': 'true' }, ico), h('span', {}, u(label)));
  return h('nav', { class: 'tabs', 'aria-label': 'Main' }, item('home', T.home, '🏠'), item('map', T.map, '🗺️'), item('labs', T.labs, '🧪'), item('grow', T.grow, '🌱'), item('parent', T.parent, '👨‍👩‍👧'));
}
function header() {
  const p = state.profile, cls = classNow(p, now());
  return h('header', { class: 'top' },
    h('div', { class: 'brand' }, h('span', { class: 'avatar', 'aria-hidden': 'true' }, Array.from(p.name)[0].toUpperCase()),
      h('div', {}, h('b', {}, p.name), h('small', {}, `${u(T.classN)} ${cls}`))),
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
    h('select', { id: 'f-cls' }, SUPPORTED_CLASSES.map(c => h('option', { value: String(c), selected: c === 4 }, String(c)))),
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
    // This form only creates the learner: the guardian's consent record and account survive it.
    const { consent, account } = state;
    state = freshState();
    state.consent = consent;
    state.account = account;
    state.profile = {
      name, cls: +f.querySelector('#f-cls').value, ay0: academicYear(d), lang: f.querySelector('#f-lang').value,
      dailyQ: +f.querySelector('#f-daily').value, pin: makePin(pin), off: [], autoRead: false, created: today(),
    };
    // The consent record names the class it was given for; keep it true when the profile is made.
    state.consent = setChildDetails(state.consent, { cls: state.profile.cls }, d);
    rebuildSkills(); ensureState(skills, state.skills, state.profile, d); persist(); go('home');
  });
  const welcome = h('header', { class: 'welcome' },
    markElement('mark mark-lg'),
    h('div', { class: 'welcome-text' },
      wordmark(),
      h('p', { class: 'tagline' }, u(T.tagline)),
      h('p', { class: 'muted small welcome-note' }, ui(T.setupNote, 'bi'))));
  const consent = state.consent;
  mount(h('main', { class: 'wrap' }, welcome,
    consent && h('p', { class: 'consent-chip' }, h('span', { class: 'chip chip-ok' }, ui(T.consentDone, 'bi')),
      h('span', { class: 'muted small' }, `${consent.guardian.name} · ${consent.reconsentBy}`)),
    f, restoreCard()));
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
  const sheetEl = h('div', { class: 'sheet' },
    h('section', { class: 'card sheet-body celebrate' }, h('div', { class: 'eyebrow' }, u(T.awesome)), rewardLines(r),
      h('button', { class: 'btn primary big', id: 'cel-ok' }, u(T.gotIt))));
  const ok = sheetEl.querySelector('#cel-ok');
  const release = trapFocus(sheetEl, { onClose: () => { release(); sheetEl.remove(); }, initial: ok });
  ok.addEventListener('click', () => { release(); sheetEl.remove(); });
  document.body.append(sheetEl); confetti();
}
function levelTile() {
  const li = levelInfo(state.stars || 0);
  return h('section', { class: 'card tile b-wide level-tile' },
    h('div', { class: 'lv-row' }, h('div', { class: 'lv-ico', 'aria-hidden': 'true' }, li.level.icon),
      h('div', { class: 'lv-main' }, h('div', { class: 'eyebrow' }, `${u(T.level)} ${li.index + 1}`), h('h2', {}, t(li.level.name)),
        bar(li.frac, '', `${u(T.level)} ${li.index + 1}: ${t(li.level.name)}`), h('small', { class: 'muted' }, li.next ? `${li.toNext} ${u(T.toNext)} ${t(li.next.name)} ${li.next.icon}` : u(T.maxLevel)))));
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
        bar(pr.classTotal ? pr.classMastered / pr.classTotal : 0, '', `${strandName(s)}: ${pr.classMastered}/${pr.classTotal}`),
        h('small', {}, `${pr.classMastered}/${pr.classTotal} ${u(T.thisClass)}${pr.ahead ? ` · +${pr.ahead} ${u(T.ahead)}` : ''}`));
    })));
  const gaps = contentGaps(skills, p, d);
  const gapCard = gaps.length ? h('section', { class: 'card b-wide content-gap' },
    h('div', { class: 'eyebrow' }, `🧩 ${u(T.contentGap)}`),
    h('p', { class: 'muted small' }, u(T.contentGapNote)),
    h('p', { class: 'small' }, gaps.map(strandName).join(' · '))) : null;
  const questTile = questsUI.homeTile();
  const calmTile = wellbeingUI.homeTile();
  const storyTile = storiesUI.homeTile();
  const labSum = labSummary(state);
  const labsTile = h('section', { class: 'card tile b-half lab-tile' },
    h('div', { class: 'eyebrow' }, `🧪 ${u(T.labs)}`),
    h('span', { class: 'big-ico', 'aria-hidden': 'true' }, '🔭'),
    h('div', { class: 'big-n' }, `${labSum.done}/${labSum.total}`),
    h('button', { class: 'btn small', onclick: () => go('labs') }, u(L('Open the labs', 'लैब खोलो'))));
  const masteredN = skills.filter(sk => state.skills[sk.id] && state.skills[sk.id].m).length;
  const test = h('section', { class: 'card row b-half' }, h('div', {}, h('div', { class: 'eyebrow' }, u(T.test)), h('p', { class: 'muted small' }, u(masteredN >= 5 ? T.testNote : T.testNeeds))),
    h('button', { class: 'btn', disabled: masteredN < 5, onclick: () => startTest() }, u(T.start)));
  const off = h('section', { class: 'card offscreen b-half' }, h('div', { class: 'eyebrow' }, u(T.offscreen)), h('p', {}, t(offscreenToday())));
  const sDays = streak(state.days, today(), addDays);
  const tStreak = h('section', { class: 'card tile b-half' }, h('div', { class: 'eyebrow' }, u(T.streak)), h('span', { class: 'big-ico', 'aria-hidden': 'true' }, h('span', { class: 'flame' }, '🔥')), h('div', { class: 'big-n' }, String(sDays)));
  const tStars = h('section', { class: 'card tile b-half' }, h('div', { class: 'eyebrow' }, u(T.stars)), h('span', { class: 'big-ico', 'aria-hidden': 'true' }, '⭐'), h('div', { class: 'big-n' }, String(state.stars || 0)));
  mount(header(), h('main', { class: 'wrap' }, !storage.ok && h('p', { class: 'warn' }, u(T.storageWarn)), boot.recovered && h('p', { class: 'warn' }, u(T.recovered)),
    h('div', { class: 'hello-row' },
      h('h1', { class: 'hello' }, `${u(T.hello)}, ${p.name}`),
      h('span', { class: 'program-chip' }, ui(T.program, 'bi'))),
    h('div', { class: 'bento' }, mission, levelTile(), tStreak, tStars, td.done ? off : null, gapCard, strands, test, td.done ? null : off, labsTile, questTile, calmTile, storyTile, badgeShelf())), nav('home'));
  if (!isEmpty(pending)) celebrate(pending);
}

// ---------- one writer per device ----------
// A second tab is a reader. It never overwrites the writer and never shows stale progress as
// if it were live. Taking over is a deliberate tap, so no child loses a mission by accident.
function viewReadOnly() {
  mount(header(), h('main', { class: 'wrap narrow' },
    h('section', { class: 'card', role: 'alert' },
      h('h1', {}, u(T.tabReadOnly)),
      h('p', { class: 'muted' }, u(T.tabTaken)),
      h('div', { class: 'actions wrap-row' },
        h('button', { class: 'btn primary big', onclick: () => {
          if (!lease.take()) return toast(u(T.tabReadOnly));
          readOnly = false; state = load(storage).state; rebuildSkills(); render();
        } }, u(T.tabTake))))), nav('home'));
}

// ---------- grow hub ----------
function viewGrow() {
  mount(header(), h('main', { class: 'wrap' },
    h('h1', { class: 'page-h' }, `🌱 ${u(T.grow)}`),
    h('p', { class: 'muted' }, u(T.growIntro)),
    h('div', { class: 'grow-grid' }, wellbeingUI.growCard(), questsUI.growCard(), storiesUI.growCard()),
    h('section', { class: 'card grow-note' },
      h('div', { class: 'eyebrow' }, `🪷 ${u(T.growWhyTitle)}`),
      h('p', {}, u(T.growWhy)),
      h('p', { class: 'muted small' }, u(T.growPrivacy)))), nav('grow'));
}

// ---------- sessions ----------
let run = null; // { s: session, mode, results: [] }
function writable() {
  if (writer()) return true;
  toast(u(T.tabReadOnly), 5000);
  return false;
}
function startMission() {
  if (!writable()) return;
  const p = state.profile, day = today(), td = state.days[day] || { mq: 0 };
  const plan = buildMission(skills, state.skills, { ...p, dailyQ: Math.max(1, p.dailyQ - (td.mq || 0)) }, now(), day);
  if (!plan.length) { toast(u(T.contentGapNote), 7000); return; }
  begin(createSession(app, plan, { mission: true, goal: p.dailyQ }), 'mission');
}
function startPractice(strand) {
  if (!writable()) return;
  const td = state.days[today()] || { q: 0 };
  if (td.q >= state.profile.dailyQ * 2.5) { toast(u(T.enough)); return; }
  begin(createSession(app, Array.from({ length: 8 }, () => ({ kind: 'learn', strand }))), 'practice');
}
function startSkill(id) { if (!writable()) return; begin(createSession(app, Array.from({ length: 6 }, () => ({ kind: 'skill', skill: id }))), 'practice'); }
function startTest() {
  if (!writable()) return;
  const pool = skills.filter(sk => state.skills[sk.id] && state.skills[sk.id].m);
  // Distinct questions: shuffle, take at most 15, and only repeat if the pool is smaller.
  const order = pool.slice();
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const picks = Array.from({ length: 15 }, (_, i) => order[i % order.length]);
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
    bar(frac, 'thin', `${u(T.progress)}: ${cur.index + 1}/${cur.total}`), h('span', { class: 'muted small' }, cur.total ? `${cur.index + 1}/${cur.total}` : ''));
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
      // Support fades with the estimate: a learner near mastery gets the hint and a retry first;
      // a learner who is still building gets the ladder first. Both are always one tap away.
      const s = state.skills[sk.id], p = s ? s.p : 0.2, high = p >= FADE.high;
      const retryBtn = h('button', { class: `btn ${high ? 'primary pulse' : 'ghost'} big`, onclick: () => showRetry(cur, { q, sk, trap: res.trap }, true) }, u(MSG.tryAgain));
      const learnBtn = h('button', { class: `btn ${high ? 'ghost' : 'primary pulse'} big`, onclick: () => guide(cur, { q, sk, trap: res.trap }, high) }, u(MSG.easier));
      actions.append(high ? retryBtn : learnBtn, high ? learnBtn : retryBtn);
      lines.push(h('p', { class: 'muted small' }, u(high ? LABEL.fadeRetry : p >= FADE.low ? LABEL.fadeSingle : LABEL.fadeFull)));
      (high ? retryBtn : learnBtn).focus();
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
    h('div', { class: 'eyebrow' }, `${strandName(sk.strand)} · ${t(sk.title)}${cur.review ? ` · ${u(T.review)}` : ''}${cur.ahead ? ` · ${u(T.aheadWork)}` : ''}`),
    askBlock(q, m, seen), ctl.opts, ctl.row, fb, actions);
  mount(h('main', { class: 'wrap narrow' }, progressHead(cur), card));
  if (q.say && voice.available()) voice.speak(q.say);
  ctl.focus(card);
}

// ---------- Recursive Scaffolding: Hint -> Scaffold -> Retry -> Reward ----------
// Scaffold answers are practice with support: they move the BKT estimate with a weight
// below 1, but only the first attempt is graded. The ladder fades as mastery grows.
function miniCard(q, sk, { tag, intro, after }) {
  const m = M(), seen = new Set(); let done = false; const t0 = Date.now();
  const fb = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' }), actions = h('div', { class: 'actions' });
  const submit = raw => {
    if (done) return;
    const res = check(q, raw);
    if (!res.valid) { fb.className = 'feedback note'; fb.replaceChildren(u(q.kind === 'text' ? T.notWord : T.notAnswer)); return; }
    done = true; ctl.lock(res.ok, raw, false);
    after(res, {
      ms: Math.max(0, Date.now() - t0),
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

// The ladder is built once per miss, so its rungs are stable while the child works through them.
// `forced` is used only when a learner near mastery asks to see the steps anyway.
function guide(cur, orig, forced = false, onDone = nextQuestion) {
  const s = state.skills[orig.sk.id];
  const ladder = buildLadder({
    byId, skill: orig.sk, missed: orig.q, misc: app.misc, states: state.skills, trap: orig.trap,
    seed: (Date.now() & 0x7fffffff), mastery: forced ? 0.2 : (s ? s.p : 0.2),
  });
  if (!ladder.steps.length) return showRetry(cur, orig, true, onDone);
  rung(cur, orig, ladder, 0, onDone);
}
function rung(cur, orig, ladder, idx, onDone) {
  const step = ladder.steps[idx], last = idx >= ladder.steps.length - 1;
  const intro = step.worked
    ? h('div', { class: 'example' }, h('div', { class: 'eyebrow' }, `📖 ${u(MSG.worked)}`), h('p', {}, tx(step.worked, M())))
    : h('p', { class: 'muted' }, `🌱 ${u(MSG.prereqNote)} · ${t(step.skill.title)}`);
  const retry = () => showRetry(cur, orig, true, onDone);
  const mc = miniCard(step.q, step.skill, { tag: `🪜 ${u(step.note)} · ${idx + 1}/${ladder.steps.length}`, intro, after: (res, c) => {
    run.s.assisted({ skill: step.skill.id, ok: res.ok, guess: guessRate(step.q), level: step.level, ms: c.ms, weight: step.evidence });
    persist();
    if (res.ok) { c.say('good', [verdictP('✅', MSG.scaffoldOk), h('p', {}, tx(step.q.explain, M()))]); return c.next(u(MSG.tryOrig), retry); }
    if (!last) { // this rung was missed too: one step lower, then back up to the original
      c.say('try', [verdictP('🤔', MSG.oops), hintP(step.skill, res.trap)]);
      return c.next(u(MSG.easier), () => rung(cur, orig, ladder, idx + 1, onDone));
    }
    c.reveal();
    c.say('try', [verdictP('🌱', MSG.scaffoldNo), h('p', {}, h('b', {}, `${u(T.correctAnswer)}: `), answerText(step.q)), h('p', {}, tx(step.q.explain, M()))]);
    c.next(u(MSG.tryOrig), retry);
  } });
  mount(h('main', { class: 'wrap narrow' }, progressHead(cur), mc.card));
  mc.focus();
}
function showRetry(cur, o, top, onDone = nextQuestion) {
  const mc = miniCard(o.q, o.sk, { tag: `🔁 ${u(MSG.retry)}`, intro: null, after: (res, c) => {
    run.s.assisted({ skill: o.sk.id, ok: res.ok, guess: guessRate(o.q), level: 4, ms: c.ms, weight: evidenceFor('retry') });
    persist();
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
  const isTest = run.mode === 'test';
  const st = run.s.finish();
  const rw = isTest ? null : settleNow({ stats: st, completed: true });
  if (!isTest) persist();
  const rows = [h('div', { class: 'eyebrow' }, u(T.done)),
    h('div', { class: 'big-stats' },
      h('div', {}, h('b', {}, String(st.asked)), h('small', {}, u(T.answered))),
      h('div', {}, h('b', {}, String(st.correct)), h('small', {}, u(T.rightCount))),
      h('div', {}, h('b', {}, `+${st.stars + (rw ? rw.gold + rw.bonus : 0)}`), h('small', {}, u(T.stars))))];
  if (rw && !isEmpty(rw)) rows.push(h('div', { class: 'rw-box' }, rewardLines(rw)));
  if (st.mastered.length) rows.push(h('h2', {}, u(T.newMastered)), h('ul', {}, [...new Set(st.mastered)].map(id => h('li', {}, t(byId[id].title)))));
  if (run.mode === 'test' && run.results.length) {
    rows.push(h('h2', {}, u(T.testReview)), h('ol', { class: 'review-list' }, run.results.map(r => h('li', { class: r.ok ? 'ok' : 'no' },
      h('p', {}, t(r.q.prompt)), !r.ok && h('p', {}, h('b', {}, `${u(T.correctAnswer)}: `), answerText(r.q)), !r.ok && h('p', { class: 'muted' }, t(r.q.explain))))));
  }
  if (run.mode === 'mission') rows.push(h('div', { class: 'card offscreen inset' }, h('div', { class: 'eyebrow' }, u(T.offscreen)), h('p', {}, t(offscreenToday()))));
  rows.push(h('button', { class: 'btn primary big', onclick: () => go('home') }, u(T.backHome)));
  run = null;
  mount(h('main', { class: 'wrap narrow' }, h('section', { class: 'card done' }, rows)));
  if (rw && (!isEmpty(rw) || st.mastered.length)) confetti(rw.levelUp ? 80 : 40);
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
          bar(s ? s.p : 0, 'thin', `${t(sk.title)}: ${Math.round((s ? s.p : 0) * 100)}%`)));
    }))));
  mount(header(), h('main', { class: 'wrap' }, h('h1', { class: 'page-h' }, u(T.map)), tabs, groups), nav('map'));
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
  let release = () => {};
  const close = () => { release(); dlg.remove(); };
  document.querySelectorAll('.sheet').forEach(x => x.remove());
  document.body.append(dlg);
  release = trapFocus(dlg, { onClose: close, initial: dlg.querySelector('.btn.primary, .btn') });
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
    mount(header(), h('main', { class: 'wrap' }, f,
      state.account && h('div', { class: 'actions wrap-row' },
        h('button', { class: 'btn ghost', onclick: () => { loginIntent = 'parent'; go('login'); } }, u(T.guardianLogin)))), nav('parent'));
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
    h('p', { class: 'muted small' }, u(T.talk)),
    h('p', { class: 'muted small' }, `${labSummary(state).done}/${labSummary(state).total} ${u(L('curiosity labs explored on this device', 'जिज्ञासा लैब इसी डिवाइस पर देखी गईं'))}`));
  // The same BKT estimate the planner uses, shown without grades or rankings.
  const lm = learningModel(skills, state.skills);
  const model = h('section', { class: 'card' }, h('div', { class: 'eyebrow' }, u(L('How the learning model sees it', 'सीखने का मॉडल क्या देखता है'))),
    h('div', { class: 'big-stats' },
      h('div', {}, h('b', {}, lm.seen ? `${Math.round(lm.p * 100)}%` : '–'), h('small', {}, u(L('average mastery estimate', 'औसत महारत अनुमान')))),
      h('div', {}, h('b', {}, String(lm.seen)), h('small', {}, u(L('skills practised', 'अभ्यास किए कौशल')))),
      h('div', {}, h('b', {}, `${Math.round(lm.helpRate * 100)}%`), h('small', {}, u(L('answers after help', 'मदद के बाद उत्तर')))),
      h('div', {}, h('b', {}, String(lm.stuck)), h('small', {}, u(L('need a re-teach', 'दोबारा सिखाने चाहिए'))))),
    h('p', { class: 'muted small' }, u(L(
      'Each skill has its own estimate. Right answers raise it, misses lower it, and an answer given after a hint or a worked step counts for less. The number is a guide for practice, never a grade or a rank.',
      'हर कौशल का अपना अनुमान है। सही उत्तर उसे बढ़ाते हैं, गलतियाँ घटाती हैं, और संकेत या हल किए उदाहरण के बाद दिया उत्तर कम गिना जाता है। यह संख्या अभ्यास का मार्गदर्शन है, अंक या रैंक नहीं।'))),
    h('p', { class: 'muted small' }, u(L(
      `${lm.personal} skills have their own error and learning rates from this child's answers; the rest still use the classroom starting values.`,
      `${lm.personal} कौशलों की चूक-दर और सीखने की दर इस बच्चे के उत्तरों से बनी है; बाकी अभी कक्षा के शुरुआती मानों का उपयोग करते हैं।`))));
  const rm = roadmap(skills, state.skills, p, d, day);
  const road = h('section', { class: 'card' }, h('div', { class: 'eyebrow' }, u(T.roadmap)), h('p', { class: 'muted small' }, u(T.roadmapNote)),
    h('div', { class: 'road' }, rm.rows.map(r => h('div', { class: 'road-row' + (r.current ? ' current' : '') },
      h('span', { class: 'road-y' }, r.label), h('span', { class: 'road-c' }, `${u(T.classN)} ${r.cls}`),
      r.total ? bar(r.done / r.total, '', `${u(T.classN)} ${r.cls}: ${r.done}/${r.total}`) : h('span', { class: 'muted small' }, t(L('Content pack needed', 'सामग्री पैक चाहिए'))),
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
  mount(header(), h('main', { class: 'wrap' }, h('h1', { class: 'page-h' }, u(T.parent)), accountFlow.card(), flow.card(), wellbeingUI.parentCard(), week, model, helpCard, askCard, mist, road, settingsCard(), pinCard(), packsCard(), backupCard(),
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
    h('select', { id: 's-cls' }, SUPPORTED_CLASSES.map(c => h('option', { value: String(c), selected: clsNow === c }, String(c)))),
    h('fieldset', {}, h('legend', {}, u(T.subjects)), STRANDS.map(s => h('label', { class: 'check' }, h('input', { type: 'checkbox', value: s, checked: !(p.off || []).includes(s) }), strandName(s)))),
    h('label', { class: 'check' + (purposeOn(state.consent, 'readaloud') ? '' : ' off') },
      h('input', { type: 'checkbox', id: 's-read', checked: !!p.autoRead, disabled: !purposeOn(state.consent, 'readaloud') }),
      t(purposeOn(state.consent, 'readaloud')
        ? L('Read explanations aloud after a wrong answer', 'गलत उत्तर के बाद व्याख्या पढ़कर सुनाएँ')
        : L('Read-aloud is off because this purpose was not consented to.', 'पढ़कर सुनाना बंद है क्योंकि इस उद्देश्य की सहमति नहीं दी गई।'))),
    h('button', { class: 'btn primary', type: 'submit' }, u(T.save)));
  f.addEventListener('submit', e => {
    e.preventDefault();
    p.lang = f.querySelector('#s-lang').value; p.dailyQ = +f.querySelector('#s-daily').value;
    const c = +f.querySelector('#s-cls').value;
    if (c !== clsNow) { p.cls = c; p.ay0 = academicYear(now()); } // the chosen class is the class for the session running today
    state.consent = setChildDetails(state.consent, { cls: p.cls }, now());
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
  // Restoring replaces everything, so it takes two taps, shows what is inside, and keeps
  // one undo copy. The checksum is verified before anything is touched.
  let pending = null, pendingInfo = null;
  const preview = h('div', { class: 'notice-line', role: 'status', hidden: true });
  const note = h('p', { class: 'warn', role: 'alert', hidden: true }, u(T.confirmRestore));
  const showPreview = info => {
    preview.hidden = false;
    const n = Object.keys(info.state.skills || {}).length;
    preview.replaceChildren(
      h('p', {}, `${u(T.backupPreview)}: ${info.state.profile.name} · ${u(T.classN)} ${info.state.profile.cls} · ${n} ${u(T.skillsCount)}`),
      ...info.warnings.map(w => h('p', { class: 'muted small' }, w === 'unsigned' ? u(T.backupUnsigned) : w)));
  };
  const fail = e => toast(/checksum/i.test(e.message) ? u(T.backupDamaged) : e.message, 6000);
  const goBtn = h('button', { class: 'btn', onclick: () => {
    const text = pending != null ? pending : area.value.trim();
    if (!text) return;
    if (pending == null) {
      try { pendingInfo = parseImport(text); } catch (e) { return fail(e); }
      pending = text; showPreview(pendingInfo); note.hidden = false; goBtn.classList.add('danger'); goBtn.focus(); return;
    }
    try {
      const next = parseImport(text).state;
      keepUndo(storage); state = next; state.lock = { f: 0, until: 0 };
      rebuildSkills(); persist(); toast(u(T.restored)); parentOpen = false; go('home');
    } catch (e) { fail(e); }
  } }, u(T.restoreB));
  file.addEventListener('change', async () => {
    const f = file.files[0]; if (!f) return;
    if (f.size > MAX_IMPORT_BYTES) { toast(u(T.tooBig)); file.value = ''; return; }
    try {
      const text = await f.text();
      pendingInfo = parseImport(text); pending = text; showPreview(pendingInfo);
      note.hidden = false; goBtn.classList.add('danger'); goBtn.focus();
    } catch (e) { fail(e); file.value = ''; }
  });
  area.addEventListener('input', () => { pending = null; pendingInfo = null; preview.hidden = true; note.hidden = true; goBtn.classList.remove('danger'); });
  const undo = readUndo(storage);
  const confirm = h('input', { id: 'b-reset', autocomplete: 'off', 'aria-label': u(T.resetConfirm), placeholder: 'ERASE' });
  return h('section', { class: 'card form' }, h('div', { class: 'eyebrow' }, u(T.backup)), h('p', { class: 'muted small' }, u(T.backupNote)),
    h('div', { class: 'actions wrap-row' },
      h('button', { class: 'btn primary', onclick: () => offerFile(`ks-learn-backup-${today()}.json`, exportText(state)) }, u(T.exportB)),
      h('button', { class: 'btn', onclick: async () => { const txt = exportText(state); try { await navigator.clipboard.writeText(txt); toast(u(T.copied)); } catch { area.value = txt; area.select(); } } }, u(T.copyB))),
    h('label', { for: 'b-file' }, u(T.importB)), file, area,
    preview, note, goBtn,
    undo && undo.profile && h('button', { class: 'btn ghost', onclick: () => { const prev = readUndo(storage); if (!prev) return; keepUndo(storage); state = prev; rebuildSkills(); persist(); toast(u(T.undone)); parentOpen = false; go('home'); } }, u(T.undo)),
    h('details', {}, h('summary', {}, u(T.reset)), h('label', { for: 'b-reset' }, u(T.resetConfirm)), confirm,
      h('button', { class: 'btn danger', onclick: () => {
        if (confirm.value.trim() !== 'ERASE') return;
        guardianAction(() => {
          keepUndo(storage); storage.removeItem(STORE_KEY);
          state = freshState(); rebuildSkills(); endGuardianSession(); appUnlocked = false; parentOpen = false; render();
        });
      } }, u(T.reset))));
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
    try { state = parseImport(await f.text()).state; state.lock = { f: 0, until: 0 }; rebuildSkills(); persist(); go('home'); } catch (e) { toast(/checksum/i.test(e.message) ? ui(T.backupDamaged, 'bi') : e.message); }
  });
  return h('details', { class: 'card' }, h('summary', {}, ui(T.restore, 'bi')), h('label', { for: 'r-file' }, ui(T.importB, 'bi')), file);
}

// ---------- routing ----------
function go(route) { if (location.hash !== '#' + route) location.hash = route; else render(); }
function render() {
  voice.stop();
  labsUI.stopLab();
  wellbeingUI.stop();
  if (!state.profile) {
    // First run, in order: notice and consent, guardian account, child profile. A reload
    // between steps resumes at the first unfinished step instead of repeating a finished one.
    if (!verifyConsent(state.consent, now()).ok) return flow.start();
    if (!state.account) return accountFlow.register();
    return viewSetup();
  }
  if (run) return; // never navigate away from a running session by hash
  if (!lease.holds() && lease.peer()) { readOnly = true; return viewReadOnly(); }
  const r = (location.hash || '#home').slice(1);
  document.documentElement.lang = M() === 'hi' ? 'hi' : 'en';
  document.querySelectorAll('.sheet').forEach(x => x.remove());
  // No consent, a withdrawn record, a damaged digest or a year-old record: the learning
  // screens are closed until a guardian deals with it. No exceptions on any route.
  const consent = verifyConsent(state.consent, now());
  if (!consent.ok) return flow.renew(consent);
  // An account is part of the gate: without it there is no authority to change privacy settings.
  if (!state.account) return accountFlow.register();
  if (state.account.requireUnlock && !appUnlocked) { parentOpen = false; return accountFlow.login(); }
  if ((r !== 'parent' && r !== 'consent' && r !== 'login') || Date.now() - parentSeen > PARENT_IDLE_MS) {
    parentOpen = false; endGuardianSession(); // the parent area and its guardian session end together
  }
  // Leaving the sign-in screen abandons whatever it was opened for: no stale erasure callback
  // and no stale "return to parent" intent can survive to a later login.
  if (r !== 'login') { pendingAfterLogin = null; loginIntent = null; }
  if (r === 'consent') return flow.renew(consent);
  if (r === 'login') return accountFlow.login();
  if (r === 'map') return viewMap();
  if (r === 'labs') return labsUI.viewLabs();
  if (r.startsWith('labs/')) return labsUI.viewLab(r.slice(5));
  if (r === 'grow') return viewGrow();
  if (r === 'wellbeing') return wellbeingUI.viewWellbeing();
  if (r === 'quests') return questsUI.viewQuests();
  if (r === 'stories') return storiesUI.viewStories();
  if (r.startsWith('stories/')) return storiesUI.viewStory(r.slice(8));
  if (r === 'parent') return viewParent();
  return viewHome();
}
window.addEventListener('hashchange', () => { if (run) { run.s.finish(); persist(); run = null; } render(); });
// The parent area also locks when left idle. (Not on backgrounding: the file picker hides the page on phones.)
setInterval(() => { if (parentOpen && Date.now() - parentSeen > PARENT_IDLE_MS) { parentOpen = false; endGuardianSession(); if (!run && state.profile) render(); } }, 30000);
document.addEventListener('pointerdown', () => { if (parentOpen) parentSeen = Date.now(); }, true);
document.addEventListener('keydown', () => { if (parentOpen) parentSeen = Date.now(); }, true);
// One slow heartbeat for the screen-time rhythm. It counts only child screens, only while
// the tab is visible, and never while the parent area is open. Persisting every 15 seconds
// keeps the counter across a reload without writing to storage every second.
let beats = 0;
setInterval(() => {
  if (!state.profile) return;
  const r = (location.hash || '#home').slice(1);
  const childScreen = r !== 'parent' && r !== 'login' && r !== 'consent';
  wellbeingUI.beat(childScreen);
  if (++beats % 15 === 0) persist();
}, 1000);
// Lease heartbeat: keep this tab the writer, or notice (without touching the screen) that
// another tab has taken over. A running session is never reset by a storage event.
setInterval(() => {
  if (!storage.ok) return;
  if (lease.holds()) lease.renew();
}, 5000);
window.addEventListener('storage', e => {
  if (!storage.ok) return;
  if (e.key === lease.key) {
    const was = readOnly;
    readOnly = !lease.holds();
    if (readOnly && !was) { toast(u(T.tabTaken), 6000); if (!run && state.profile) render(); }
    else if (!readOnly && was) { state = load(storage).state; rebuildSkills(); toast(u(T.tabActive)); if (!run) render(); }
    return;
  }
  if (e.key !== STORE_KEY) return;
  // Only a writer may refresh from disk, never mid-session, and never by discarding the
  // parent area: that was the old two-tab bug.
  if (!lease.holds() || run) return;
  state = load(storage).state; rebuildSkills(); render();
});
// Closing without a session frees the lease immediately; a crashed tab frees it by TTL.
window.addEventListener('pagehide', () => { if (!run) lease.release(); });
window.addEventListener('pageshow', e => { if (e.persisted) { if (!lease.holds()) lease.acquire(); render(); } });
window.addEventListener('focus', () => { if (state.profile && !run && !lease.holds() && !lease.peer()) { lease.acquire(); render(); } });
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
// A document upgraded from schema 2 is written under the current key once, after the first
// screen exists, so a failed write cannot leave the child on a blank page.
if (boot.migrated && state.profile) persist();
/* global __PWA__ */
if (__PWA__ && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
