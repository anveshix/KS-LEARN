// Guardian account: passphrase stretching, recovery codes, the login audit, storage hardening.
// The account is the only credential in the app, so these tests are the "can a child or a
// curious adult get past the privacy gate" tests as much as they are unit tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_PASS, PBKDF2_ROUNDS, JS_ROUNDS, strength, jsStretch, makeKdf, verifyPassphrase,
  createAccount, changePassphrase, useRecovery, rotateRecovery, recordLogin, recordFailure,
  loginWait, setAppLock, renameAccount, sanitizeAccount, accountSummary, normalizeRecovery,
  makeRecoveryCode, subtleAvailable,
} from '../src/core/account.js';
import { sha256, hex, recordAttempt, lockedFor } from '../src/core/pin.js';
import { freshState, sanitize, exportText, importText } from '../src/core/store.js';
import { makePin } from '../src/core/pin.js';

const PASS = 'Tulsi-leaf-2026';
const NEWPASS = 'Neem-leaf-2027';
// Test rounds sit at the sanitiser's floor, so the suite checks the mechanism, not the clock.
const FAST = { fastRounds: 10000, slowRounds: 1000 };
const OPTS = { kdf: FAST };
const account = async (over = {}) => {
  const res = await createAccount({ name: 'Asha Devi', passphrase: PASS, ...over }, { kdf: FAST });
  assert.equal(res.ok, true, JSON.stringify(res.issues));
  return res;
};
const prof = () => ({ name: 'Meera', cls: 4, ay0: 2026, lang: 'bi', dailyQ: 18, pin: makePin('1234'), off: [], created: '2026-11-17' });

test('passphrase quality refuses the obvious and accepts a short sentence', () => {
  for (const bad of ['', 'short', '12345678', 'aaaaaaaa', 'password1', 'qwertyui', 'india12345']) {
    assert.equal(strength(bad).ok, false, bad);
  }
  assert.equal(strength('Tulsi-leaf-2026').ok, true);
  assert.equal(strength('नीम की पत्ती 2027').ok, true, 'a Hindi passphrase of enough length is fine');
  assert.equal(strength('x'.repeat(129)).issues.includes('long'), true);
  assert.equal(strength('        ').issues.includes('spaces'), true);
  assert.ok(strength('Tulsi-leaf-2026').score >= 3);
  assert.ok(MIN_PASS >= 8);
});

test('passphrases are stretched, never stored, and verified in constant-time compare', async () => {
  const { account: acc } = await createAccount({ name: 'Asha Devi', passphrase: PASS }); // production rounds
  const json = JSON.stringify(acc);
  assert.ok(!json.includes(PASS));
  assert.match(acc.kdf.s, /^[0-9a-f]{32}$/);
  assert.equal(acc.kdf.fast.i, PBKDF2_ROUNDS);
  assert.equal(acc.kdf.slow.i, JS_ROUNDS);
  assert.ok(acc.kdf.fast.i >= 200000 && acc.kdf.slow.i >= 20000);
  assert.match(acc.kdf.fast.h, /^[0-9a-f]{64}$/);
  assert.match(acc.kdf.slow.h, /^[0-9a-f]{64}$/);
  assert.equal(await verifyPassphrase(PASS, acc.kdf), true);
  assert.equal(await verifyPassphrase('Tulsi-leaf-2025', acc.kdf), false);
  assert.equal(await verifyPassphrase('', acc.kdf), false);
  assert.equal(await verifyPassphrase(PASS, null), false);
  assert.equal(await verifyPassphrase(PASS, { s: 'zz' }), false);
  assert.equal(await verifyPassphrase(PASS, { ...acc.kdf, s: 'f'.repeat(32) }), false, 'a swapped salt does not verify');
  // the two devices with the same passphrase produce different records
  const { account: b } = await createAccount({ name: 'Asha Devi', passphrase: PASS });
  assert.notEqual(acc.kdf.s, b.kdf.s);
  assert.notEqual(acc.kdf.fast.h, b.kdf.fast.h);
});

test('the pure-JS fallback verifies a record made without WebCrypto', async () => {
  const salt = 'ab'.repeat(16);
  const slow = jsStretch(PASS, salt, 2000);
  assert.equal(slow.h, jsStretch(PASS, salt, 2000).h);
  assert.notEqual(slow.h, jsStretch(PASS + 'x', salt, 2000).h);
  assert.equal(await verifyPassphrase(PASS, { v: 1, s: salt, fast: null, slow }), true);
  assert.equal(await verifyPassphrase('nope', { v: 1, s: salt, fast: null, slow }), false);
  // a record that carries both is still checked against the stronger one when available
  const both = await makeKdf(PASS, { saltHex: salt });
  assert.equal(await verifyPassphrase(PASS, both), true);
  assert.equal(subtleAvailable(), typeof subtleAvailable() === 'boolean');
});

test('registration refuses weak input and keeps the recovery code out of storage', async () => {
  assert.equal((await createAccount({ name: 'A', passphrase: PASS })).ok, false, 'name too short');
  assert.equal((await createAccount({ name: 'Asha', passphrase: '12345678' })).ok, false, 'weak passphrase');
  const { account: acc, recoveryCode } = await account();
  assert.match(recoveryCode, /^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/);
  assert.ok(!JSON.stringify(acc).includes(recoveryCode.replace(/-/g, '')));
  assert.ok(!JSON.stringify(acc).includes(normalizeRecovery(recoveryCode)));
  assert.match(acc.recovery.kdf.s, /^[0-9a-f]{32}$/);
  assert.equal(acc.requireUnlock, false);
  assert.equal(acc.loginCount, 0);
  assert.equal(acc.audit[0].action, 'created');
  assert.equal(normalizeRecovery('abcd-efgh'), 'ABCDEFGH');
  assert.equal(normalizeRecovery('O0I1LU'), '00111V');
  assert.match(makeRecoveryCode().text, /^[0-9A-Z]{4}-/);
});

test('changing the passphrase requires the current one and invalidates the old', async () => {
  const { account: acc } = await account();
  const wrong = await changePassphrase(acc, 'not-the-pass', NEWPASS, OPTS);
  assert.equal(wrong.ok, false);
  assert.deepEqual(wrong.issues, ['current']);
  const weak = await changePassphrase(acc, PASS, '12345678', OPTS);
  assert.equal(weak.ok, false);
  const ok = await changePassphrase(acc, PASS, NEWPASS, OPTS);
  assert.equal(ok.ok, true);
  assert.equal(await verifyPassphrase(PASS, ok.account.kdf), false);
  assert.equal(await verifyPassphrase(NEWPASS, ok.account.kdf), true);
  assert.equal(ok.account.id, acc.id);
  assert.equal(ok.account.recovery.kdf.s, acc.recovery.kdf.s, 'the recovery code is untouched');
  assert.equal(ok.account.audit.at(-1).action, 'passphrase');
});

test('the recovery code is a one-time way back in and is replaced after use', async () => {
  const { account: acc, recoveryCode } = await account();
  const wrong = await useRecovery(acc, 'AAAA-BBBB-CCCC-DDDD', NEWPASS, OPTS);
  assert.equal(wrong.ok, false);
  assert.deepEqual(wrong.issues, ['code']);
  const weak = await useRecovery(acc, recoveryCode, 'short', OPTS);
  assert.equal(weak.ok, false);
  const ok = await useRecovery(acc, recoveryCode.toLowerCase(), NEWPASS, OPTS);
  assert.equal(ok.ok, true);
  assert.notEqual(ok.recoveryCode, recoveryCode);
  assert.equal(await verifyPassphrase(NEWPASS, ok.account.kdf), true);
  const replay = await useRecovery(ok.account, recoveryCode, 'Banyan-leaf-2028', OPTS);
  assert.equal(replay.ok, false, 'the used code is dead');
  const fresh = await useRecovery(ok.account, ok.recoveryCode, 'Banyan-leaf-2028', OPTS);
  assert.equal(fresh.ok, true);
  assert.equal(fresh.account.audit.at(-1).action, 'recovered');

  const rotated = await rotateRecovery(ok.account, OPTS);
  assert.equal(rotated.ok, true);
  assert.equal((await useRecovery(rotated.account, ok.recoveryCode, 'Peepal-leaf-2029', OPTS)).ok, false, 'rotation kills the old code');
  assert.equal((await useRecovery(rotated.account, rotated.recoveryCode, 'Peepal-leaf-2029', OPTS)).ok, true);
});

test('logins and failures are recorded, throttled, and summarised without hashes', async () => {
  const { account: acc } = await account();
  let a = recordLogin(acc, { method: 'passphrase' });
  assert.equal(a.loginCount, 1);
  assert.equal(a.audit.at(-1).action, 'login');
  assert.ok(a.lastLoginAt);
  for (let i = 0; i < 5; i++) a = recordFailure(a, 1000);
  assert.ok(loginWait(a, 1000) >= 60, 'five failures start the wait');
  assert.equal(recordLogin(a, {}).lock.f, 0, 'a successful sign in clears the wait');
  let lock = { f: 0, until: 0 };
  for (let i = 0; i < 5; i++) lock = recordAttempt(lock, false, 1000);
  assert.equal(lock.f, 5);
  assert.ok(lockedFor(lock, 1000) >= 60, 'five wrong tries impose a wait');

  const summary = accountSummary(a);
  assert.equal(summary.name, 'Asha Devi');
  assert.ok(!JSON.stringify(summary).includes(a.kdf.slow.h));
  assert.ok(!JSON.stringify(summary).includes(a.kdf.fast.h));
  assert.equal(accountSummary(null), null);
  assert.match(summary.method, /PBKDF2/);
});

test('app lock and renaming are explicit, audited, and bounded', async () => {
  const { account: acc } = await account();
  const on = setAppLock(acc, true);
  assert.equal(on.requireUnlock, true);
  assert.equal(on.audit.at(-1).action, 'applock');
  assert.equal(setAppLock(on, true), on, 'no change, no new audit line');
  const off = setAppLock(on, false);
  assert.equal(off.requireUnlock, false);
  assert.equal(renameAccount(acc, '  Rakesh   Kumar ').name, 'Rakesh Kumar');
  assert.equal(renameAccount(acc, ' ').name, 'Asha Devi', 'a blank name is refused');
});

test('hostile account records are rebuilt field by field and fall back to no account', async () => {
  const { account: acc } = await account();
  const evil = JSON.parse(JSON.stringify(acc));
  evil.name = '<img src=x onerror=alert(1)>';
  evil.kdf.fast.i = 1e12; evil.kdf.slow.i = 5;
  evil.kdf.fast.alg = 'md5';
  evil.lock = { f: -3, until: 'tomorrow' };
  evil.audit = [{ at: 'yesterday', action: 'login' }, { at: acc.created, action: 'login', note: 'x'.repeat(500) }, { at: acc.created, action: 'hacked' }, 'junk'];
  evil.passphrase = PASS; evil.extra = true;
  const cleaned = sanitizeAccount(evil);
  assert.equal(cleaned.name, '<img src=x onerror=alert(1)>');
  assert.equal(cleaned.kdf.fast.i, 2e6);
  assert.equal(cleaned.kdf.slow.i, 1000);
  assert.equal(cleaned.kdf.fast.alg, 'pbkdf2-sha256');
  assert.deepEqual(cleaned.lock, { f: 0, until: 0 });
  assert.equal(cleaned.audit.length, 1);
  assert.equal(cleaned.audit[0].note.length, 80);
  assert.equal(cleaned.passphrase, undefined);
  assert.equal(cleaned.extra, undefined);
  const minimal = await makeKdf(PASS, { saltHex: 'ab'.repeat(16), ...FAST });
  assert.equal(await verifyPassphrase(PASS, minimal), true, 'a record at the round floor still opens');
  for (const bad of [null, 5, 'x', [], {}, { v: 1 }, { ...acc, v: 2 }, { ...acc, id: 'nope' }, { ...acc, kdf: null }, { ...acc, recovery: null }]) {
    assert.equal(sanitizeAccount(bad), null);
  }
});

test('the account rides in the backup, and a profile without one is simply no account', async () => {
  const st = freshState();
  st.profile = prof();
  const { account: acc } = await account();
  st.account = acc;
  const back = importText(exportText(st));
  assert.equal(back.account.name, 'Asha Devi');
  assert.equal(await verifyPassphrase(PASS, back.account.kdf), true);
  assert.equal(sanitize({ ...st, account: { hacked: true } }).account, null);
  assert.equal(sanitize({ ...st, account: undefined }).account, null);
  assert.equal(freshState().account, null);
});

test('KDF output is stable for the same salt and never plain SHA-256 of the passphrase', async () => {
  const salt = 'cd'.repeat(16);
  const slow = jsStretch(PASS, salt, 1500);
  assert.equal(slow.h, jsStretch(PASS, salt, 1500).h);
  assert.notEqual(slow.h, hex(sha256(PASS)));
  assert.notEqual(jsStretch(PASS, salt, 1500).h, jsStretch(PASS, 'ef'.repeat(16), 1500).h);
});
