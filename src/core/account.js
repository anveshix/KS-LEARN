// Guardian account: registration and login that never leaves the device.
//
// A professional privacy position for a children's app is not "collect an email and a
// password". It is: prove that a grown-up holds authority over this device, store nothing
// that identifies them, and send nothing anywhere. So this account has:
//   * no email, phone number, name server-side, or third-party identity provider;
//   * a passphrase stretched with PBKDF2-HMAC-SHA256 (210,000 rounds) through WebCrypto,
//     and a pure-JS 30,000-round SHA-256 fallback for contexts without SubtleCrypto;
//   * both derivations stored, so the same account opens in a browser with or without
//     WebCrypto (a file:// copy, an old WebView) without weakening the stored form;
//   * a one-time recovery code, stored only as a hash, for when the passphrase is forgotten;
//   * a local login audit, attempt throttling, and a strict sanitiser for storage/backups.
//
// The passphrase is never written down, never logged, and never compared with `===`.
import { sha256, hex, recordAttempt, lockedFor } from './pin.js';

export const MIN_PASS = 8;
export const MAX_PASS = 128;
export const MIN_NAME = 2;
export const MAX_NAME = 40;
export const PBKDF2_ROUNDS = 210000;   // OWASP 2023 guidance for PBKDF2-HMAC-SHA256
export const JS_ROUNDS = 30000;
export const MAX_AUDIT = 30;
export const RECOVERY_GROUPS = 4;
export const RECOVERY_GROUP_LEN = 4;
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32: no I, L, O, U
const enc = s => new TextEncoder().encode(s);

const nowIso = now => new Date(now.getTime()).toISOString();
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const isStamp = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(s);
const isHex = (s, n) => typeof s === 'string' && s.length === n && /^[0-9a-f]+$/.test(s);
const isId = s => typeof s === 'string' && /^ksa_[0-9a-f]{16,40}$/.test(s);

function same(a, b) { // constant-time compare for derived hashes
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || !a.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const randomBytes = (n, rand = globalThis.crypto) => {
  const b = new Uint8Array(n);
  if (rand && typeof rand.getRandomValues === 'function') rand.getRandomValues(b);
  else for (let i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256);
  return b;
};
export const subtleAvailable = () => !!(globalThis.crypto && globalThis.crypto.subtle
  && typeof globalThis.crypto.subtle.deriveBits === 'function' && typeof globalThis.crypto.subtle.importKey === 'function');

async function pbkdf2(password, saltHex, rounds) {
  const key = await globalThis.crypto.subtle.importKey('raw', enc(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc(saltHex), iterations: rounds }, key, 256);
  return hex(new Uint8Array(bits));
}
// Fallback with the same shape as pin.js: hash(salt | hash(salt | passphrase)) repeated.
// Slower per round than native PBKDF2, hence fewer rounds; still a memoryless KDF, not a toy.
export function jsStretch(password, saltHex = hex(randomBytes(16)), rounds = JS_ROUNDS) {
  const prefix = enc(`ks-account|${saltHex}|`);
  let h = sha256(enc(`ks-account|${saltHex}|${password}`));
  const buf = new Uint8Array(prefix.length + 32);
  buf.set(prefix);
  for (let i = 0; i < rounds; i++) { buf.set(h, prefix.length); h = sha256(buf); }
  return { s: saltHex, i: rounds, h: hex(h) };
}

// Both derivations share one salt so the record stays small and comparable.
// `fastRounds`/`slowRounds` exist for tests and benchmarks; the app never passes them, and
// sanitizeAccount() refuses anything below 10,000 / 1,000 rounds when a record comes back in.
export async function makeKdf(passphrase, { saltHex = hex(randomBytes(16)), fastRounds = PBKDF2_ROUNDS, slowRounds = JS_ROUNDS } = {}) {
  const salt = saltHex;
  const fastIters = Math.max(10000, Math.round(+fastRounds || PBKDF2_ROUNDS));
  const slowIters = Math.max(1000, Math.round(+slowRounds || JS_ROUNDS));
  let fast = null;
  if (subtleAvailable()) {
    // A browser can expose SubtleCrypto and still refuse to derive (policy, quota, old build):
    // the record then carries the JS derivation alone, which still verifies elsewhere.
    try { fast = { i: fastIters, alg: 'pbkdf2-sha256', h: await pbkdf2(String(passphrase), salt, fastIters) }; }
    catch { fast = null; }
  }
  const slow = jsStretch(String(passphrase), salt, slowIters);
  return { v: 1, s: salt, fast, slow };
}
export async function verifyPassphrase(passphrase, kdf) {
  if (!kdf || typeof kdf !== 'object' || !isHex(kdf.s, 32)) return false;
  const pw = String(passphrase == null ? '' : passphrase);
  if (!pw || pw.length > MAX_PASS) return false;
  if (kdf.fast && isHex(kdf.fast.h, 64) && subtleAvailable() && kdf.fast.i >= 10000) {
    try { if (same(await pbkdf2(pw, kdf.s, kdf.fast.i), kdf.fast.h)) return true; } catch { /* fall through */ }
  }
  if (kdf.slow && isHex(kdf.slow.h, 64) && kdf.slow.i >= 1000) {
    return same(jsStretch(pw, kdf.s, kdf.slow.i).h, kdf.slow.h);
  }
  return false;
}

// ---------- passphrase quality ----------
const COMMON = ['password', 'passw0rd', '12345678', '12341234', 'qwerty', 'letmein', 'iloveyou',
  'admin123', 'india123', 'bharat123', 'school12', 'child123', 'krishna', 'ganesh', 'aadhaar'];
export const strength = passphrase => {
  const s = String(passphrase == null ? '' : passphrase);
  const issues = [];
  const lower = s.toLowerCase();
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(s)).length;
  if (s.length < MIN_PASS) issues.push('length');
  if (s.length > MAX_PASS) issues.push('long');
  if (s && /^\d+$/.test(s)) issues.push('digits');
  if (s && /^(.)\1+$/.test(s)) issues.push('repeat');
  if (COMMON.some(c => lower.includes(c))) issues.push('common');
  if (/\s{2,}/.test(s)) issues.push('spaces');
  let score = 0;
  if (s.length >= MIN_PASS) score++;
  if (s.length >= 10) score++;
  if (classes >= 2) score++;
  if (classes >= 3) score++;
  if (issues.includes('common') || issues.includes('digits') || issues.includes('repeat')) score = Math.min(score, 1);
  return { score: Math.max(0, Math.min(4, score)), issues, ok: s.length >= MIN_PASS && !issues.some(i => i !== 'long') && score >= 2 };
};

// ---------- recovery code ----------
const randomChar = () => ALPHABET[randomBytes(1)[0] % ALPHABET.length];
export const normalizeRecovery = s => String(s == null ? '' : s).toUpperCase().replace(/[^0-9A-Z]/g, '')
  .replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
export function makeRecoveryCode() {
  const chars = Array.from({ length: RECOVERY_GROUPS * RECOVERY_GROUP_LEN }, randomChar);
  const raw = chars.join('');
  return { raw, text: chars.join('').replace(new RegExp(`(.{${RECOVERY_GROUP_LEN}})(?=.)`, 'g'), '$1-') };
}

// ---------- account ----------
export async function createAccount({ name, passphrase, requireUnlock = false }, { now = new Date(), rand = globalThis.crypto, kdf: kdfOpts } = {}) {
  const issues = [];
  const display = clean(name, MAX_NAME);
  if (display.length < MIN_NAME) issues.push('name');
  const quality = strength(passphrase);
  if (!quality.ok) issues.push(...quality.issues.map(i => `pass.${i}`));
  if (issues.length) return { ok: false, account: null, recoveryCode: null, issues };

  const kdf = await makeKdf(passphrase, kdfOpts);
  const recovery = makeRecoveryCode();
  const account = {
    v: 1, id: 'ksa_' + hex(randomBytes(12)), name: display,
    created: nowIso(now), kdf,
    recovery: { kdf: await makeKdf(recovery.raw, kdfOpts) },
    requireUnlock: requireUnlock === true,
    lastLoginAt: null, loginCount: 0,
    audit: [{ at: nowIso(now), action: 'created', note: 'device-local account' }],
    lock: { f: 0, until: 0 },
  };
  return { ok: true, account, recoveryCode: recovery.text, issues: [] };
}

export async function changePassphrase(account, current, next, { now = new Date(), kdf: kdfOpts } = {}) {
  if (!(await verifyPassphrase(current, account && account.kdf))) return { ok: false, account, issues: ['current'] };
  const quality = strength(next);
  if (!quality.ok) return { ok: false, account, issues: quality.issues.map(i => `pass.${i}`) };
  const updated = {
    ...account, kdf: await makeKdf(next, kdfOpts),
    audit: [...account.audit, { at: nowIso(now), action: 'passphrase', note: 'changed by guardian' }],
  };
  return { ok: true, account: updated, issues: [] };
}

// Forgotten passphrase: the recovery code is the only way back in, and it is replaced on use.
export async function useRecovery(account, code, next, { now = new Date(), kdf: kdfOpts } = {}) {
  if (!account || !account.recovery || !(await verifyPassphrase(normalizeRecovery(code), account.recovery.kdf))) {
    return { ok: false, account, recoveryCode: null, issues: ['code'] };
  }
  const quality = strength(next);
  if (!quality.ok) return { ok: false, account, recoveryCode: null, issues: quality.issues.map(i => `pass.${i}`) };
  const fresh = makeRecoveryCode();
  const updated = {
    ...account, kdf: await makeKdf(next, kdfOpts),
    recovery: { kdf: await makeKdf(fresh.raw, kdfOpts) },
    lock: { f: 0, until: 0 },
    audit: [...account.audit, { at: nowIso(now), action: 'recovered', note: 'recovery code used; passphrase replaced' }],
  };
  return { ok: true, account: updated, recoveryCode: fresh.text, issues: [] };
}

// A new recovery code invalidates the old one. The caller must already be authenticated.
export async function rotateRecovery(account, { now = new Date(), kdf: kdfOpts } = {}) {
  const fresh = makeRecoveryCode();
  const updated = {
    ...account, recovery: { kdf: await makeKdf(fresh.raw, kdfOpts) },
    audit: [...account.audit, { at: nowIso(now), action: 'recovery', note: 'recovery code replaced' }],
  };
  return { ok: true, account: updated, recoveryCode: fresh.text };
}

export function recordLogin(account, { now = new Date(), method = 'passphrase' } = {}) {
  return {
    ...account, lastLoginAt: nowIso(now), loginCount: Math.min(1e6, (account.loginCount || 0) + 1),
    lock: { f: 0, until: 0 },
    audit: [...account.audit, { at: nowIso(now), action: 'login', note: method }].slice(-MAX_AUDIT),
  };
}
export function recordFailure(account, nowMs) {
  return { ...account, lock: recordAttempt(account.lock, false, nowMs) };
}
export const loginWait = (account, nowMs) => lockedFor(account && account.lock, nowMs);
export function setAppLock(account, on, now = new Date()) {
  if (account.requireUnlock === (on === true)) return account;
  return {
    ...account, requireUnlock: on === true,
    audit: [...account.audit, { at: nowIso(now), action: 'applock', note: on === true ? 'app lock on' : 'app lock off' }].slice(-MAX_AUDIT),
  };
}
export function renameAccount(account, name) {
  const display = clean(name, MAX_NAME);
  return display.length >= MIN_NAME ? { ...account, name: display } : account;
}

// ---------- untrusted input ----------
export function sanitizeAccount(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.v !== 1) return null;
  if (!isId(raw.id) || !isStamp(raw.created)) return null;
  const name = clean(raw.name, MAX_NAME);
  if (name.length < MIN_NAME) return null;
  const kdf = (raw.kdf && typeof raw.kdf === 'object') ? raw.kdf : null;
  if (!kdf || !isHex(kdf.s, 32)) return null;
  const fast = kdf.fast && typeof kdf.fast === 'object'
    ? { i: Math.min(2e6, Math.max(10000, Math.round(+kdf.fast.i || PBKDF2_ROUNDS))), alg: 'pbkdf2-sha256', h: isHex(kdf.fast.h, 64) ? kdf.fast.h : '' }
    : null;
  const slow = kdf.slow && typeof kdf.slow === 'object'
    ? { i: Math.min(2e6, Math.max(1000, Math.round(+kdf.slow.i || JS_ROUNDS))), h: isHex(kdf.slow.h, 64) ? kdf.slow.h : '' }
    : null;
  if ((!fast || !fast.h) && (!slow || !slow.h)) return null;
  const rec = raw.recovery && typeof raw.recovery === 'object' ? raw.recovery : null;
  const rkdf = rec && rec.kdf && typeof rec.kdf === 'object' ? rec.kdf : null;
  if (!rkdf || !isHex(rkdf.s, 32)) return null;
  const rFast = rkdf.fast && typeof rkdf.fast === 'object'
    ? { i: Math.min(2e6, Math.max(10000, Math.round(+rkdf.fast.i || PBKDF2_ROUNDS))), alg: 'pbkdf2-sha256', h: isHex(rkdf.fast.h, 64) ? rkdf.fast.h : '' } : null;
  const rSlow = rkdf.slow && typeof rkdf.slow === 'object'
    ? { i: Math.min(2e6, Math.max(1000, Math.round(+rkdf.slow.i || JS_ROUNDS))), h: isHex(rkdf.slow.h, 64) ? rkdf.slow.h : '' } : null;
  if ((!rFast || !rFast.h) && (!rSlow || !rSlow.h)) return null;
  const audit = (Array.isArray(raw.audit) ? raw.audit : []).slice(-MAX_AUDIT)
    .filter(a => a && typeof a === 'object' && isStamp(a.at) && ['created', 'login', 'passphrase', 'recovered', 'recovery', 'rename', 'applock'].includes(a.action))
    .map(a => ({ at: a.at, action: a.action, note: clean(a.note, 80) }));
  const lock = raw.lock && typeof raw.lock === 'object'
    ? { f: Math.min(1000, Math.max(0, Math.round(+raw.lock.f || 0))), until: Math.min(8.64e15, Math.max(0, Math.round(+raw.lock.until || 0))) }
    : { f: 0, until: 0 };
  return {
    v: 1, id: raw.id, name, created: raw.created,
    kdf: { v: 1, s: kdf.s, fast, slow },
    recovery: { kdf: { v: 1, s: rkdf.s, fast: rFast, slow: rSlow } },
    requireUnlock: raw.requireUnlock === true,
    lastLoginAt: isStamp(raw.lastLoginAt) ? raw.lastLoginAt : null,
    loginCount: Math.min(1e6, Math.max(0, Math.round(+raw.loginCount || 0))),
    audit, lock,
  };
}

// What the guardian sees about the account. Never includes a hash.
export function accountSummary(account) {
  if (!account) return null;
  return {
    id: account.id, name: account.name, created: account.created,
    method: account.kdf.fast && account.kdf.fast.h ? 'PBKDF2-SHA256 · 210,000 rounds + fallback' : 'SHA-256 fallback',
    lastLoginAt: account.lastLoginAt, loginCount: account.loginCount,
    requireUnlock: account.requireUnlock,
    events: account.audit.slice(-6).map(a => ({ at: a.at, action: a.action })),
  };
}
