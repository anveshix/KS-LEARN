// Guardian account screens: register, sign in, recover, and manage.
//
// The account exists only on this device. There is no email field, no phone field and no
// "forgot password" link that calls a server — the recovery code printed at registration is
// the only way back. Every screen says that plainly, because a security promise the user
// cannot see is a promise the product is hiding.
import { h } from './dom.js';
import { L, ui } from '../core/i18n.js';
import {
  MIN_PASS, MAX_PASS, strength, createAccount, verifyPassphrase, recordLogin, recordFailure,
  loginWait, changePassphrase, useRecovery, rotateRecovery, setAppLock, accountSummary,
} from '../core/account.js';

const C = {
  kicker: L('Guardian account', 'अभिभावक खाता'),
  regTitle: L('Protect this device', 'इस डिवाइस को सुरक्षित रखें'),
  regLead: L('Create the guardian account. Only this account can change privacy settings, withdraw consent or erase data. It lives on this device: no email, no phone number, no cloud, nothing to verify online.', 'अभिभावक खाता बनाइए। केवल यही खाता गोपनीयता सेटिंग बदल सकता है, सहमति वापस ले सकता है या डेटा मिटा सकता है। यह इसी डिवाइस पर रहता है: कोई ईमेल, फ़ोन नंबर या क्लाउड नहीं।'),
  name: L('Your name on this device', 'इस डिवाइस पर आपका नाम'),
  namePh: L('For example: Asha Devi', 'जैसे: आशा देवी'),
  pass: L('Passphrase', 'पासफ़्रेज़'),
  passPh: L('At least 8 characters. A short sentence is easy to remember and hard to guess.', 'कम से कम 8 अक्षर। छोटा वाक्य याद रखना आसान और अनुमान लगाना कठिन होता है।'),
  confirm: L('Type it again', 'फिर से लिखिए'),
  show: L('Show', 'दिखाएँ'),
  hide: L('Hide', 'छिपाएँ'),
  create: L('Create the account', 'खाता बनाइए'),
  working: L('Securing the account…', 'खाता सुरक्षित किया जा रहा है…'),
  weak: L('This passphrase is too easy to guess.', 'यह पासफ़्रेज़ अनुमान लगाना बहुत आसान है।'),
  mismatch: L('The two passphrases do not match.', 'दोनों पासफ़्रेज़ मेल नहीं खाते।'),
  nameNeed: L('Please write a name of at least 2 characters.', 'कृपया कम से कम 2 अक्षरों का नाम लिखिए।'),
  strength0: L('Too easy', 'बहुत आसान'),
  strength1: L('Weak', 'कमज़ोर'),
  strength2: L('Okay', 'ठीक'),
  strength3: L('Strong', 'मज़बूत'),
  strength4: L('Very strong', 'बहुत मज़बूत'),
  recTitle: L('Save the recovery code', 'रिकवरी कोड सहेजिए'),
  recLead: L('This is the only way back if the passphrase is forgotten: the app cannot email it, because it has no email. Write it on paper and keep it somewhere private. It is shown once; after this screen only a hash remains.', 'यह फ़ोन या ईमेल से नहीं भेजा जा सकता, क्योंकि ऐप को आपका ईमेल नहीं पता। इसे कागज़ पर लिखकर सुरक्षित रखिए। यह केवल एक बार दिखता है; इसके बाद केवल उसका हैश रहता है।'),
  recCode: L('Recovery code', 'रिकवरी कोड'),
  recDownload: L('Save it as a file', 'फ़ाइल के रूप में सहेजें'),
  recCopy: L('Copy', 'कॉपी'),
  recCopied: L('Copied. Keep it private.', 'कॉपी हो गया। इसे निजी रखिए।'),
  recAck: L('I have written the recovery code down and kept it private.', 'मैंने रिकवरी कोड लिख लिया है और निजी रखा है।'),
  recNeed: L('Please tick the box after saving the code.', 'कोड सहेजने के बाद बॉक्स पर टिक कीजिए।'),
  recSaved: L('Recovery code saved.', 'रिकवरी कोड सहेज लिया।'),
  finish: L('Finish', 'पूरा करें'),
  loginTitle: L('Guardian sign in', 'अभिभावक साइन इन'),
  loginLead: L('Enter the passphrase for this device’s guardian account. Nothing is sent anywhere; the check happens here.', 'इस डिवाइस के अभिभावक खाते का पासफ़्रेज़ डालिए। कुछ भी कहीं नहीं भेजा जाता; जाँच यहीं होती है।'),
  signIn: L('Sign in', 'साइन इन'),
  checking: L('Checking…', 'जाँच हो रही है…'),
  wrong: L('That passphrase is not right.', 'पासफ़्रेज़ सही नहीं है।'),
  wait: L('Too many tries. Wait', 'बहुत कोशिशें। रुकिए'),
  seconds: L('seconds', 'सेकंड'),
  useRecovery: L('Forgotten the passphrase? Use the recovery code', 'पासफ़्रेज़ भूल गए? रिकवरी कोड लीजिए'),
  usePass: L('Use the passphrase instead', 'इसके बजाय पासफ़्रेज़ लीजिए'),
  recoveryTitle: L('Recover with the code', 'कोड से खाता वापस पाइए'),
  recoveryLead: L('Enter the recovery code you wrote down, then choose a new passphrase. The old code stops working and a new one is shown.', 'लिखा हुआ रिकवरी कोड डालिए, फिर नया पासफ़्रेज़ चुनिए। पुराना कोड बंद हो जाएगा और नया दिखेगा।'),
  code: L('Recovery code', 'रिकवरी कोड'),
  newPass: L('New passphrase', 'नया पासफ़्रेज़'),
  badCode: L('That code is not right.', 'कोड सही नहीं है।'),
  signedIn: L('Signed in as guardian', 'अभिभावक के रूप में साइन इन'),
  signedOut: L('Not signed in. The privacy actions need the passphrase.', 'साइन इन नहीं हैं। गोपनीयता कार्यों के लिए पासफ़्रेज़ चाहिए।'),
  signOut: L('Sign out', 'साइन आउट'),
  signInBtn: L('Sign in with the guardian account', 'अभिभावक खाते से साइन इन करें'),
  change: L('Change the passphrase', 'पासफ़्रेज़ बदलें'),
  current: L('Current passphrase', 'वर्तमान पासफ़्रेज़'),
  update: L('Update', 'बदलिए'),
  changed: L('Passphrase updated.', 'पासफ़्रेज़ बदल गया।'),
  wrongCurrent: L('The current passphrase is not right.', 'वर्तमान पासफ़्रेज़ सही नहीं है।'),
  recoveryBtn: L('Replace the recovery code', 'रिकवरी कोड बदलिए'),
  lockLabel: L('Ask for the passphrase when the app opens', 'ऐप खुलने पर पासफ़्रेज़ पूछें'),
  lockNote: L('Use this on a shared phone or tablet. The child then needs a guardian to open the app.', 'साझा फ़ोन या टैबलेट पर इसे चालू रखिए। तब बच्चे को ऐप खोलने के लिए अभिभावक चाहिए।'),
  lockOn: L('App lock is on.', 'ऐप लॉक चालू है।'),
  lockOff: L('App lock is off.', 'ऐप लॉक बंद है।'),
  created: L('Created', 'बनाया'),
  lastLogin: L('Last sign in', 'पिछला साइन इन'),
  logins: L('Sign-ins on this device', 'इस डिवाइस पर साइन इन'),
  method: L('Protection', 'सुरक्षा'),
  nameLabel: L('Name', 'नाम'),
  privacy: L('This account is not an online identity. It exists in this browser only, and is deleted with the learning data when you erase everything.', 'यह खाता ऑनलाइन पहचान नहीं है। यह केवल इसी ब्राउज़र में है और सब कुछ मिटाने पर सीखने के डेटा के साथ मिट जाता है।'),
  never: L('No email. No phone. No password sent to a server.', 'कोई ईमेल नहीं। कोई फ़ोन नहीं। कोई पासवर्ड सर्वर पर नहीं।'),
  close: L('Close', 'बंद करें'),
  minutesShort: L('min', 'मिनट'),
};

const s = v => ui(v, 'bi');
const KEY = { 0: C.strength0, 1: C.strength1, 2: C.strength2, 3: C.strength3, 4: C.strength4 };

const brandBar = env => h('header', { class: 'onb-brand' },
  env.brand ? env.brand() : h('span', { class: 'wordmark' }, 'KS', h('i', {}, '-'), 'LEARN'));

function strengthMeter(passEl) {
  const bars = h('div', { class: 'pw-bars', 'aria-hidden': 'true' }, [0, 1, 2, 3].map(() => h('i', {})));
  const label = h('p', { class: 'pw-label muted small', 'aria-live': 'polite' });
  const update = () => {
    const st = strength(passEl.value);
    bars.className = 'pw-bars score-' + st.score;
    [...bars.children].forEach((b, i) => { b.className = i < st.score ? 'on' : ''; });
    label.textContent = s(KEY[st.score]) + (st.issues.includes('length') ? ` · ${MIN_PASS}+` : '');
  };
  passEl.addEventListener('input', update);
  update();
  return { el: h('div', { class: 'pw-meter' }, bars, label), update };
}

function passField(id, label, autocomplete, hint) {
  const input = h('input', { id, type: 'password', autocomplete, maxlength: String(MAX_PASS), 'aria-describedby': hint ? `${id}-hint` : false });
  const show = h('button', { class: 'btn ghost small pw-show', type: 'button', 'aria-label': s(C.show), onclick: () => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    show.textContent = s(hidden ? C.hide : C.show);
  } }, s(C.show));
  return { input, el: h('div', { class: 'field' }, h('label', { for: id }, s(label)),
    h('div', { class: 'pw-row' }, input, show), hint ? h('p', { class: 'muted small', id: `${id}-hint` }, s(hint)) : null) };
}

const errorNode = (id, cls = 'notice-line') => h('p', { class: cls, id, role: 'alert', hidden: true });
const fail = (node, message) => { node.textContent = message; node.hidden = false; node.scrollIntoView({ block: 'nearest' }); };

function recoverySheet(code, onDone) {
  const ack = h('input', { type: 'checkbox', id: 'rec-ack' });
  const err = errorNode('rec-err');
  const body = h('section', { class: 'card sheet-body account-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': s(C.recTitle) },
    h('p', { class: 'eyebrow' }, s(C.kicker)),
    h('h2', {}, s(C.recTitle)),
    h('p', {}, s(C.recLead)),
    h('output', { class: 'token', id: 'rec-code' }, code),
    h('div', { class: 'actions wrap-row' },
      h('button', { class: 'btn small', type: 'button', id: 'rec-download', onclick: () => {
        env.offerFile(`ks-learn-recovery-${new Date().toISOString().slice(0, 10)}.txt`,
          `KS-LEARN guardian account recovery code\n\nCode: ${code}\n\nKeep this private. Anyone with this code can replace the passphrase on the device that holds the account.\nThere is no online reset: this paper copy is the only way back.\n`);
        env.toast(s(C.recSaved));
      } }, s(C.recDownload)),
      h('button', { class: 'btn small', type: 'button', onclick: async e => {
        try { await navigator.clipboard.writeText(code); e.currentTarget.textContent = s(C.recCopied); }
        catch { env.toast(s(C.recDownload)); }
      } }, s(C.recCopy))),
    h('label', { class: 'check-row', for: 'rec-ack' }, ack, h('span', {}, s(C.recAck))), err,
    h('button', { class: 'btn primary big', id: 'rec-done', onclick: () => {
      if (!ack.checked) return fail(err, s(C.recNeed));
      sheet.remove(); onDone();
    } }, s(C.finish)));
  const sheet = h('div', { class: 'sheet' }, body);
  sheet.addEventListener('click', e => { if (e.target === sheet) { /* closing without acknowledging would lose the code */ sheet.classList.add('shake'); setTimeout(() => sheet.classList.remove('shake'), 400); } });
  sheet.addEventListener('keydown', e => { if (e.key === 'Escape') e.preventDefault(); });
  document.body.append(sheet);
  document.getElementById('rec-done').focus();
  return sheet;
}

export function createAccountFlow(env) {
  const state = () => env.getState();
  const account = () => state().account;

  function mountGate(view) {
    env.mount(h('main', { class: 'wrap narrow onboarding', id: 'acc-gate' }, brandBar(env), h('div', { class: 'onb-stage' }, view)));
    window.scrollTo(0, 0);
  }

  // ---------- register ----------
  function register() {
    const consentName = state().consent && state().consent.guardian ? state().consent.guardian.name : '';
    const name = h('input', { id: 'reg-name', maxlength: '40', autocomplete: 'name', value: consentName, placeholder: s(C.namePh) });
    const pass = passField('reg-pass', C.pass, 'new-password', C.passPh);
    const again = passField('reg-pass2', C.confirm, 'new-password');
    const meter = strengthMeter(pass.input);
    const err = errorNode('reg-err');
    const btn = h('button', { class: 'btn primary big', id: 'reg-submit', type: 'submit' }, s(C.create));
    const form = h('form', { class: 'card onb-card' },
      h('p', { class: 'eyebrow' }, s(C.kicker)),
      h('h1', {}, s(C.regTitle)),
      h('p', { class: 'lead' }, s(C.regLead)),
      h('label', { for: 'reg-name' }, s(C.name)), name,
      pass.el, meter.el, again.el, err, btn);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.hidden = true;
      if (name.value.trim().length < 2) return fail(err, s(C.nameNeed));
      if (pass.input.value !== again.input.value) return fail(err, s(C.mismatch));
      const quality = strength(pass.input.value);
      if (!quality.ok) return fail(err, s(C.weak));
      btn.disabled = true; btn.textContent = s(C.working);
      let result;
      try { result = await createAccount({ name: name.value, passphrase: pass.input.value }); }
      catch { result = { ok: false, issues: ['kdf'] }; }
      if (!result.ok) { btn.disabled = false; btn.textContent = s(C.create); return fail(err, s(C.weak)); }
      env.setAccount(result.account);
      showRecovery(result.recoveryCode, () => env.onRegistered(result.account));
    });
    mountGate(form);
    name.focus();
  }

  function showRecovery(code, onDone) {
    recoverySheet(code, () => { env.toast(s(C.recSaved)); onDone(); });
  }

  // ---------- sign in ----------
  function login() {
    const pass = passField('login-pass', C.pass, 'current-password', null);
    const err = errorNode('login-err');
    const btn = h('button', { class: 'btn primary big', id: 'login-submit', type: 'submit' }, s(C.signIn));
    const form = h('form', { class: 'card onb-card', id: 'login-form' },
      h('p', { class: 'eyebrow' }, s(C.kicker)),
      h('h1', {}, s(C.loginTitle)),
      h('p', { class: 'lead' }, s(C.loginLead)),
      pass.el, err, btn);

    const rCode = h('input', { id: 'rec-input', autocomplete: 'one-time-code', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': s(C.code), placeholder: 'XXXX-XXXX-XXXX-XXXX' });
    const rNew = passField('rec-new', C.newPass, 'new-password', C.passPh);
    const rNew2 = passField('rec-new2', C.confirm, 'new-password');
    const rMeter = strengthMeter(rNew.input);
    const rErr = errorNode('rec-login-err');
    const rBtn = h('button', { class: 'btn primary big', id: 'rec-submit', type: 'submit' }, s(C.signIn));
    const rForm = h('form', { class: 'card onb-card', id: 'rec-form', hidden: true },
      h('p', { class: 'eyebrow' }, s(C.kicker)),
      h('h1', {}, s(C.recoveryTitle)),
      h('p', { class: 'lead' }, s(C.recoveryLead)),
      h('label', { for: 'rec-input' }, s(C.code)), rCode,
      rNew.el, rMeter.el, rNew2.el, rErr, rBtn);

    let busy = false;
    const finishLogin = async (kind = 'passphrase') => {
      const next = recordLogin(account(), { method: kind });
      env.setAccount(next);
      env.setSession(true);
      env.onLogin(next);
    };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (busy) return;
      const wait = loginWait(account(), Date.now());
      if (wait > 0) return fail(err, `${s(C.wait)} ${wait} ${s(C.seconds)}`);
      busy = true; err.hidden = true; btn.disabled = true; btn.textContent = s(C.checking);
      let ok = false;
      try { ok = await verifyPassphrase(pass.input.value, account().kdf); } catch { ok = false; }
      busy = false; btn.disabled = false; btn.textContent = s(C.signIn);
      if (ok) return finishLogin('passphrase');
      env.setAccount(recordFailure(account(), Date.now()));
      pass.input.value = '';
      const after = loginWait(account(), Date.now());
      fail(err, after > 0 ? `${s(C.wait)} ${after} ${s(C.seconds)}` : s(C.wrong));
      pass.input.focus();
    });
    rForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (busy) return;
      rErr.hidden = true;
      if (rNew.input.value !== rNew2.input.value) return fail(rErr, s(C.mismatch));
      if (!strength(rNew.input.value).ok) return fail(rErr, s(C.weak));
      busy = true; rBtn.disabled = true; rBtn.textContent = s(C.checking);
      let res;
      try { res = await useRecovery(account(), rCode.value, rNew.input.value); }
      catch { res = { ok: false, issues: ['code'] }; }
      busy = false; rBtn.disabled = false; rBtn.textContent = s(C.signIn);
      if (!res.ok) { rCode.value = ''; return fail(rErr, res.issues.includes('code') ? s(C.badCode) : s(C.weak)); }
      env.setAccount(res.account);
      showRecovery(res.recoveryCode, () => finishLogin('recovery'));
    });

    const toggle = h('button', { class: 'btn ghost small', type: 'button', id: 'login-recovery', onclick: () => {
      form.hidden = !form.hidden; rForm.hidden = !rForm.hidden;
      toggle.textContent = s(form.hidden ? C.usePass : C.useRecovery);
      (form.hidden ? rCode : pass.input).focus();
    } }, s(C.useRecovery));

    const view = h('section', {}, form, rForm, h('div', { class: 'actions' }, toggle), h('p', { class: 'muted small account-note' }, s(C.never)));
    mountGate(view);
    pass.input.focus();
  }

  // ---------- manage (Parent area) ----------
  function card() {
    const rec = account();
    if (!rec) return null;
    const summary = accountSummary(rec);
    const signedIn = env.getSession();
    const chip = h('span', { class: 'chip ' + (signedIn ? 'chip-ok' : 'chip-warn'), id: 'acc-chip' }, s(signedIn ? C.signedIn : C.signedOut));

    const row = (label, value) => h('div', { class: 'kv' }, h('span', {}, s(label)), h('b', {}, value));
    const signBtn = h('button', { class: 'btn small', id: 'acc-auth', onclick: () => {
      if (signedIn) { env.setSession(false); env.signOut(); return; }
      env.go('login');
    } }, s(signedIn ? C.signOut : C.signInBtn));

    const lock = h('input', { type: 'checkbox', id: 'acc-lock', checked: rec.requireUnlock, onchange: e => {
      const on = e.currentTarget.checked;
      env.setAccount(setAppLock(account(), on));
      env.toast(s(on ? C.lockOn : C.lockOff));
      env.render();
    } });

    // Change passphrase: disclosed only when needed, so the card stays short.
    const cur = passField('acc-current', C.current, 'current-password');
    const fresh = passField('acc-new', C.newPass, 'new-password', C.passPh);
    const fresh2 = passField('acc-new2', C.confirm, 'new-password');
    const meter = strengthMeter(fresh.input);
    const chErr = errorNode('acc-err');
    const chBtn = h('button', { class: 'btn small', id: 'acc-change-submit', type: 'submit' }, s(C.update));
    const chForm = h('form', { class: 'form' },
      cur.el, fresh.el, meter.el, fresh2.el, chErr, chBtn);
    chForm.addEventListener('submit', async e => {
      e.preventDefault();
      chErr.hidden = true;
      if (fresh.input.value !== fresh2.input.value) return fail(chErr, s(C.mismatch));
      if (!strength(fresh.input.value).ok) return fail(chErr, s(C.weak));
      chBtn.disabled = true;
      let res;
      try { res = await changePassphrase(account(), cur.input.value, fresh.input.value); }
      catch { res = { ok: false, issues: ['current'] }; }
      chBtn.disabled = false;
      if (!res.ok) return fail(chErr, res.issues.includes('current') ? s(C.wrongCurrent) : s(C.weak));
      env.setAccount(res.account); env.toast(s(C.changed)); env.render();
    });

    const recBtn = h('button', { class: 'btn small', id: 'acc-newrecovery', disabled: !signedIn, onclick: async () => {
      const res = await rotateRecovery(account());
      env.setAccount(res.account);
      showRecovery(res.recoveryCode, () => env.render());
    } }, s(C.recoveryBtn));

    return h('section', { class: 'card account-card' },
      h('div', { class: 'row' }, h('div', {}, h('div', { class: 'eyebrow' }, s(C.kicker)), h('h2', {}, summary.name)), chip),
      h('div', { class: 'kv-list' },
        row(C.created, summary.created.slice(0, 10)),
        row(C.lastLogin, summary.lastLoginAt ? summary.lastLoginAt.slice(0, 16).replace('T', ' ') : '—'),
        row(C.logins, String(summary.loginCount)),
        row(C.method, summary.method)),
      h('label', { class: 'check-row', for: 'acc-lock' }, lock,
        h('span', {}, h('b', {}, s(C.lockLabel)), h('small', { class: 'muted block' }, s(C.lockNote)))),
      h('div', { class: 'actions wrap-row' }, signBtn, signedIn && recBtn),
      h('details', { class: 'policy-details' }, h('summary', {}, s(C.change)), chForm),
      h('p', { class: 'muted small' }, s(C.privacy)));
  }

  return { register, login, card };
}
