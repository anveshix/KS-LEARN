// Accessibility gate: every core route is rendered in a real DOM and scanned with axe-core,
// and every sheet is checked for the dialog contract (modal, focus, Tab, Escape, return).
// Colour contrast is covered separately by the token maths in the audit: jsdom has no layout.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import axe from 'axe-core';

const SHELL = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>KS-LEARN</title>' +
  `<style>${fs.readFileSync('src/ui/style.css', 'utf8')}</style></head><body><div id="app"></div></body></html>`;

// The app installs heartbeats that must outlive a page; in a test process they would keep the
// runner alive forever. They are tracked here and cleared when the file is done.
const timers = new Set();
const realSetInterval = globalThis.setInterval;
globalThis.setInterval = (fn, ms, ...args) => {
  const id = realSetInterval(fn, ms, ...args);
  timers.add(id);
  return id;
};
after(() => { for (const id of timers) clearInterval(id); });

async function boot() {
  const dom = new JSDOM(SHELL, { url: 'https://ks.test/', pretendToBeVisual: true, runScripts: 'outside-only' });
  const { window } = dom;
  for (const k of ['document', 'location', 'localStorage']) globalThis[k] = window[k];
  globalThis.window = window;
  globalThis.matchMedia = window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.scrollTo = () => {};
  globalThis.scrollTo = () => {};
  globalThis.__PWA__ = false;

  const { freshState, save } = await import('../src/core/store.js');
  const { makePin } = await import('../src/core/pin.js');
  const { grantConsent, makeGuardianToken } = await import('../src/core/consent.js');
  const { createAccount } = await import('../src/core/account.js');

  const now = new Date();
  const token = makeGuardianToken();
  const consent = grantConsent({
    guardianName: 'Asha Devi', relation: 'mother', age: 9, cls: 4,
    purposes: { readaloud: true }, token, typedToken: token.text,
  }, { now });
  assert.ok(consent.record, `consent fixture: ${consent.issues}`);
  const acc = await createAccount({ name: 'Asha Devi', passphrase: 'correct horse battery' }, { now, kdf: { slowRounds: 1000 } });
  const st = freshState();
  st.consent = consent.record;
  st.account = acc.account;
  st.profile = {
    name: 'Meera', cls: 4, ay0: now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1,
    lang: 'bi', dailyQ: 18, pin: makePin('1234'), off: [], autoRead: false,
    created: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  };
  save(window.localStorage, st);
  await import('../src/ui/app.js');
  await new Promise(r => setTimeout(r, 30));
  window.eval(axe.source);
  return window;
}

const window = await boot();
const opts = { rules: { 'color-contrast': { enabled: false } } };
const settle = () => new Promise(r => setTimeout(r, 20));

async function go(route) {
  window.location.hash = '#' + route;
  window.dispatchEvent(new window.HashChangeEvent('hashchange'));
  await settle();
}

async function scan(context = window.document.body) {
  const res = await window.axe.run(context, opts);
  return res.violations.map(v => `${v.id} (${v.impact}): ${v.help} :: ${v.nodes[0] && v.nodes[0].html.slice(0, 100)}`);
}

test('every core route has zero axe violations', async () => {
  for (const route of ['home', 'map', 'grow', 'labs', 'parent', 'wellbeing', 'quests', 'stories']) {
    await go(route);
    assert.ok(window.document.querySelector('#app').children.length > 0, `${route} rendered`);
    const found = await scan();
    assert.equal(found.length, 0, `route ${route}: ${found.join(' | ')}`);
  }
});

test('the parent gate asks for a PIN with a labelled field', async () => {
  await go('parent');
  const input = window.document.querySelector('#pin');
  assert.ok(input, 'PIN input exists');
  assert.ok((input.getAttribute('aria-label') || '').length > 3, 'PIN field has an accessible name');
});

test('a skill sheet is a real modal: labelled, focus inside, Tab wrapped, Escape closes', async () => {
  await go('map');
  const opener = window.document.querySelector('.sk-btn');
  assert.ok(opener, 'skill button rendered');
  opener.focus();
  opener.click();
  await settle();
  const dlg = window.document.querySelector('.sheet');
  assert.ok(dlg, 'sheet opened');
  assert.equal(dlg.getAttribute('role'), 'dialog');
  assert.equal(dlg.getAttribute('aria-modal'), 'true');
  assert.ok(dlg.getAttribute('aria-label'), 'dialog has an accessible name');
  assert.ok(dlg.contains(window.document.activeElement), 'focus moved into the dialog');
  const sheetFound = await scan(dlg);
  assert.equal(sheetFound.length, 0, sheetFound.join(' | '));

  // Tab from the last control wraps to the first, Shift+Tab from the first wraps to the last.
  const focusables = [...dlg.querySelectorAll('button, a[href]')];
  const first = focusables[0], last = focusables[focusables.length - 1];
  last.focus();
  dlg.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  assert.equal(window.document.activeElement, first, 'Tab wraps to the first control');
  dlg.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
  assert.equal(window.document.activeElement, last, 'Shift+Tab wraps to the last control');

  dlg.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await settle();
  assert.equal(window.document.querySelector('.sheet'), null, 'Escape closes the sheet');
  assert.equal(window.document.activeElement, opener, 'focus returns to the opener');
});

test('a nested sheet keeps Escape for the topmost dialog only', async () => {
  const { trapFocus } = await import('../src/ui/dialog.js');
  const host = window.document.createElement('div');
  host.innerHTML = '<div class="a"><button id="a1">a</button></div><div class="b"><button id="b1">b</button></div>';
  window.document.body.append(host);
  const a = host.querySelector('.a'), b = host.querySelector('.b');
  let closedA = 0, closedB = 0;
  const releaseA = trapFocus(a, { onClose: () => { closedA++; } });
  const releaseB = trapFocus(b, { onClose: () => { closedB++; } });
  b.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(closedB, 1);
  assert.equal(closedA, 0, 'the sheet underneath does not close');
  releaseB();
  a.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(closedA, 1, 'the sheet underneath takes over once the top one is released');
  releaseA();
  host.remove();
});
