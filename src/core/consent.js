// Verifiable parental consent (DPDP Act 2023), built to work with no network at all.
//
// A consent record is a small, self-checking document kept beside the learning data:
//   * purposes are separate and specific; two are essential, two are optional and off by default;
//   * processing happens on this device only, so no data processor is involved;
//   * the guardian proves an adult is present with a one-time token that must be read off
//     the screen and typed back (a signing ceremony), or with a token signed by the school
//     that issued the device (shared passcode, HMAC-SHA256);
//   * the record carries a digest over its canonical form, so any later edit is detectable;
//   * consent is re-checked every 12 months, and can be narrowed or withdrawn at any time.
//
// What this deliberately does NOT do: it does not pretend to verify an identity through
// DigiLocker. DigiLocker needs a network round-trip and this app is offline-first by design,
// so the school-token path is the offline equivalent: the secret is handed over in person.
import { sha256, hex } from './pin.js';

export const POLICY = {
  id: 'ks-learn-dpdp',
  version: '1.1',
  effective: '2026-11-17',
  // Fiduciary duties that hold for every purpose, stated once.
  retention: 'Kept in this browser on this device until the guardian erases it. Consent is renewed every 12 months.',
  grievance: 'Raise a grievance with the school or operator that provided this app. Under the DPDP Act the Data Fiduciary must respond within 30 days.',
  purposes: [
    {
      id: 'teach', essential: true,
      title: { en: 'Choose questions and teach', hi: 'प्रश्न चुनना और पढ़ाना' },
      what: { en: 'Nickname, class and subject choices pick the next question.', hi: 'उपनाम, कक्षा और विषय के अनुसार अगला प्रश्न चुना जाता है।' },
    },
    {
      id: 'memory', essential: true,
      title: { en: 'Remember what is mastered', hi: 'क्या सीखा, यह याद रखना' },
      what: { en: 'Answers and mastery scores schedule spaced revision on this device.', hi: 'उत्तर और महारत के अंक इसी डिवाइस पर दोहराव तय करते हैं।' },
    },
    {
      id: 'account', essential: true,
      title: { en: 'Keep a guardian account on this device', hi: 'इसी डिवाइस पर अभिभावक खाता रखना' },
      what: { en: 'A passphrase protects privacy settings and erasure. No email, no phone number, no cloud.', hi: 'पासफ़्रेज़ गोपनीयता सेटिंग और डेटा मिटाने को सुरक्षित रखता है। कोई ईमेल, फ़ोन या क्लाउड नहीं।' },
    },
    {
      id: 'readaloud', essential: false,
      title: { en: 'Read questions aloud', hi: 'प्रश्न ज़ोर से पढ़कर सुनाना' },
      what: { en: 'Uses the voice already installed on this device. No audio is recorded or sent.', hi: 'इस डिवाइस में पहले से मौजूद आवाज़ का उपयोग करता है। कोई ऑडियो रिकॉर्ड या भेजा नहीं जाता।' },
    },
    {
      id: 'voice', essential: false,
      title: { en: 'Speaking practice (on-device)', hi: 'बोलने का अभ्यास (डिवाइस पर)' },
      what: { en: 'Lets the learner answer out loud with on-device speech recognition. Audio stays in memory and is never stored.', hi: 'बच्चा डिवाइस पर ही वाक्-पहचान से बोलकर उत्तर दे सकता है। ऑडियो केवल स्मृति में रहता है, कभी सहेजा नहीं जाता।' },
    },
  ],
};
export const PURPOSE_IDS = POLICY.purposes.map(p => p.id);
export const ESSENTIAL_PURPOSES = POLICY.purposes.filter(p => p.essential).map(p => p.id);
export const OPTIONAL_PURPOSES = POLICY.purposes.filter(p => !p.essential).map(p => p.id);
export const RECONSENT_DAYS = 365;
export const RELATIONS = ['mother', 'father', 'guardian'];
export const AGE_BANDS = [
  { id: '6-9', min: 6, max: 9 }, { id: '10-12', min: 10, max: 12 },
  { id: '13-15', min: 13, max: 15 }, { id: '16-17', min: 16, max: 17 },
];
export const ageBand = age => (AGE_BANDS.find(b => age >= b.min && age <= b.max) || AGE_BANDS[0]).id;

// ---------- text, bytes, hashing ----------
const enc = s => new TextEncoder().encode(s);
const cat = (a, b) => { const out = new Uint8Array(a.length + b.length); out.set(a); out.set(b, a.length); return out; };
const same = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || !a.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};
export function hmacSha256(key, message) {
  const k0 = typeof key === 'string' ? enc(key) : key;
  const k = k0.length > 64 ? sha256(k0) : k0;
  const ipad = new Uint8Array(64); ipad.fill(0x36);
  const opad = new Uint8Array(64); opad.fill(0x5c);
  for (let i = 0; i < k.length; i++) { ipad[i] ^= k[i]; opad[i] ^= k[i]; }
  const msg = typeof message === 'string' ? enc(message) : message;
  return hex(sha256(cat(opad, sha256(cat(ipad, msg)))));
}

// Key order is not part of the meaning of a record: canonical() fixes it before hashing.
export function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  return `{${Object.keys(v).sort().filter(k => v[k] !== undefined)
    .map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
}
const withoutDigest = r => { const { digest, ...rest } = r; return rest; };
export const digestOf = record => hex(sha256(`ksc1|${canonical(withoutDigest(record))}`));
export const verificationCode = record => (record && typeof record.digest === 'string'
  ? record.digest.slice(0, 8).toUpperCase().replace(/(.{4})(.{4})/, '$1-$2') : '');

// ---------- one-time guardian token ----------
// Read aloud, written down, typed back: it proves an adult was at the screen for this step,
// not merely that someone tapped "Next".
const WORDS = ['aam', 'kite', 'lotus', 'tiger', 'monsoon', 'peacock', 'rangoli', 'diya', 'jalebi', 'banyan',
  'koel', 'river', 'mango', 'parrot', 'chai', 'laddoo', 'bullock', 'coconut', 'bazaar', 'holi',
  'cricket', 'basil', 'thali', 'puppet', 'tandoor', 'village', 'temple', 'scooter', 'papad', 'gulmohar',
  'tulsi', 'mehndi'];
const randomInt = (n, rand) => {
  if (rand && typeof rand.getRandomValues === 'function') {
    const b = new Uint32Array(1); rand.getRandomValues(b); return b[0] % n;
  }
  return Math.floor(Math.random() * n);
};
export const normalizeToken = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
// -> { text, words: [w,w,w], code: '4821', hash }
export function makeGuardianToken(rand = globalThis.crypto) {
  const pick = () => WORDS[randomInt(WORDS.length, rand)];
  const words = [pick(), pick(), pick()];
  const code = String(1000 + randomInt(9000, rand));
  const text = `${words.join('-')}-${code}`;
  return { text, words, code, hash: hex(sha256(`kst|${normalizeToken(text)}`)) };
}
export const tokenMatches = (typed, token) => !!token && !!token.hash
  && same(hex(sha256(`kst|${normalizeToken(typed)}`)), token.hash);

// ---------- school-issued token ----------
// A school that sets up the device hands the guardian a token file and a passcode in person.
// Only the passcode holder can mint a token; the app verifies it offline.
const b64u = {
  encode: text => {
    let bin = ''; for (const byte of enc(text)) bin += String.fromCharCode(byte);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  decode: text => {
    const s = String(text).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  },
};
export const schoolKey = passcode => hex(sha256(`ks-learn-school|${String(passcode).trim()}`));
const SCHOOL_TOKEN = /^KST1\.([A-Za-z0-9_-]{20,2000})\.([0-9a-f]{64})$/;
export const maxSchoolToken = 4096;

export function signSchoolToken(payload, passcode) {
  const body = b64u.encode(canonical(payload));
  return `KST1.${body}.${hmacSha256(schoolKey(passcode), body)}`;
}
// -> { ok, payload, issues[] }. Never throws.
export function verifySchoolToken(token, passcode, now = new Date()) {
  const issues = [];
  const text = typeof token === 'string' ? token.trim() : '';
  if (!text || text.length > maxSchoolToken) return { ok: false, payload: null, issues: ['format'] };
  if (!/^\S{6,64}$/.test(String(passcode || '').trim())) return { ok: false, payload: null, issues: ['passcode'] };
  const m = SCHOOL_TOKEN.exec(text);
  if (!m) return { ok: false, payload: null, issues: ['format'] };
  if (!same(hmacSha256(schoolKey(passcode), m[1]), m[2])) return { ok: false, payload: null, issues: ['signature'] };
  let payload;
  try { payload = JSON.parse(b64u.decode(m[1])); } catch { return { ok: false, payload: null, issues: ['format'] }; }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { ok: false, payload: null, issues: ['format'] };
  if (payload.v !== 1) issues.push('version');
  if (typeof payload.school !== 'string' || !payload.school.trim() || payload.school.length > 80) issues.push('school');
  const issued = Date.parse(payload.issuedAt), expires = Date.parse(payload.expiresAt);
  if (!Number.isFinite(issued) || Math.abs(now.getTime() - issued) > 400 * 864e5) issues.push('issuedAt');
  if (!Number.isFinite(expires) || expires < now.getTime()) issues.push('expired');
  if (typeof payload.nonce !== 'string' || payload.nonce.length < 8 || payload.nonce.length > 80) issues.push('nonce');
  return { ok: issues.length === 0, payload, issues };
}

// ---------- the record ----------
const isoNow = d => new Date(d.getTime()).toISOString();
export const dateOnly = d => isoNow(d).slice(0, 10);
const addDays = (d, n) => { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + n); return x; };
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const validStamp = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(s);

function cleanPurposes(input) {
  const out = {};
  for (const id of PURPOSE_IDS) out[id] = ESSENTIAL_PURPOSES.includes(id) ? true : input && input[id] === true;
  return out;
}
const newId = (rand = globalThis.crypto) => {
  const b = new Uint8Array(12);
  if (rand && typeof rand.getRandomValues === 'function') rand.getRandomValues(b);
  else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
  return 'ksc_' + hex(b);
};

// Builds a signed-off record. The caller has already checked the verification token.
export function createConsent(input, { now = new Date(), rand = globalThis.crypto } = {}) {
  const age = Math.min(17, Math.max(5, Math.round(+input.age || 0)));
  const record = {
    v: 1, id: newId(rand), policy: POLICY.version,
    grantedAt: isoNow(now), reconsentBy: dateOnly(addDays(now, RECONSENT_DAYS)),
    guardian: { name: clean(input.guardianName, 60), relation: RELATIONS.includes(input.relation) ? input.relation : 'guardian' },
    child: { age, ageBand: ageBand(age), class: Math.min(12, Math.max(1, Math.round(+input.class || 4))) },
    purposes: cleanPurposes(input.purposes),
    verification: {
      method: input.method === 'school-token' ? 'school-token' : 'guardian-token',
      level: input.method === 'school-token' ? 'issuer-signed' : 'guardian-ceremony',
      ref: clean(input.method === 'school-token' ? input.school : input.tokenHash, 80),
      at: isoNow(now),
    },
    status: 'granted',
    audit: [{ at: isoNow(now), action: 'granted', note: input.method === 'school-token' ? 'school token verified' : 'one-time token transcribed' }],
  };
  record.digest = digestOf(record);
  return record;
}
export function verifyConsent(record, now = new Date()) {
  const issues = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) return { ok: false, state: 'missing', issues: ['missing'] };
  if (record.v !== 1) issues.push('version');
  if (typeof record.id !== 'string' || !/^ksc_[0-9a-f]{16,40}$/.test(record.id)) issues.push('id');
  if (!validStamp(record.grantedAt)) issues.push('grantedAt');
  if (!validDate(record.reconsentBy)) issues.push('reconsentBy');
  if (!record.guardian || typeof record.guardian.name !== 'string' || !clean(record.guardian.name, 60) || !RELATIONS.includes(record.guardian.relation)) issues.push('guardian');
  if (!record.child || !Number.isInteger(record.child.age) || record.child.age < 5 || record.child.age > 17) issues.push('child');
  if (!record.purposes || typeof record.purposes !== 'object') issues.push('purposes');
  else for (const id of ESSENTIAL_PURPOSES) if (record.purposes[id] !== true) issues.push(`purpose.${id}`);
  if (!record.verification || !['guardian-token', 'school-token'].includes(record.verification.method)) issues.push('verification');
  if (typeof record.digest !== 'string' || !same(digestOf(record), record.digest)) issues.push('digest');
  if (record.status !== 'granted' && record.status !== 'withdrawn') issues.push('status');
  if (issues.length) return { ok: false, state: 'invalid', issues };

  if (record.status === 'withdrawn') return { ok: false, state: 'withdrawn', issues: ['withdrawn'], record };
  if (record.policy !== POLICY.version) return { ok: false, state: 'reconsent', issues: ['policy'], record };
  const today = dateOnly(now);
  if (record.reconsentBy < today) return { ok: false, state: 'reconsent', issues: ['expired'], record };
  return { ok: true, state: 'valid', issues: [], record };
}

// Narrowing or widening an optional purpose is a fresh consent decision and is audited.
export function setPurposes(record, purposes, now = new Date()) {
  const check = verifyConsent(record, now);
  if (!check.ok) return { ok: false, record, issues: check.issues };
  const next = { ...record, purposes: cleanPurposes(purposes) };
  const changed = PURPOSE_IDS.filter(id => !!next.purposes[id] !== !!record.purposes[id]);
  next.audit = [...(Array.isArray(record.audit) ? record.audit : []), { at: isoNow(now), action: 'purposes', note: changed.length ? changed.map(id => `${id}:${next.purposes[id] ? 'on' : 'off'}`).join(',') : 'none' }];
  next.digest = digestOf(next);
  return { ok: true, record: next, issues: [] };
}
export function renewConsent(record, { method = 'guardian-token', ref = '', now = new Date() } = {}) {
  const base = record && typeof record === 'object' ? record : {};
  const next = {
    ...base, v: 1, policy: POLICY.version, grantedAt: isoNow(now),
    reconsentBy: dateOnly(addDays(now, RECONSENT_DAYS)),
    verification: { method: method === 'school-token' ? 'school-token' : 'guardian-token', level: method === 'school-token' ? 'issuer-signed' : 'guardian-ceremony', ref: clean(ref, 80), at: isoNow(now) },
    status: 'granted',
    audit: [...(Array.isArray(base.audit) ? base.audit : []), { at: isoNow(now), action: 'renewed', note: method }],
  };
  next.digest = digestOf(next);
  return next;
}
// A renewal keeps the record's identity and history: same id, new verification, new copy of
// guardian/child/purpose fields as entered this time, and an audit line for every renewal.
export function renewRecord(previous, fresh, now = new Date()) {
  const next = {
    ...previous, v: 1, policy: POLICY.version,
    guardian: { ...fresh.guardian }, child: { ...fresh.child }, purposes: { ...fresh.purposes },
    grantedAt: isoNow(now), reconsentBy: dateOnly(addDays(now, RECONSENT_DAYS)),
    verification: { ...fresh.verification, at: isoNow(now) }, status: 'granted',
    audit: [...(Array.isArray(previous.audit) ? previous.audit : []), { at: isoNow(now), action: 'renewed', note: fresh.verification.method }],
  };
  next.digest = digestOf(next);
  return next;
}
// Correcting a factual detail (the child moved up a class) is a right, not a new consent.
// Only the child's age band and class can move here, and the change is audited.
export function setChildDetails(record, { cls, age } = {}, now = new Date()) {
  if (!record || record.status !== 'granted' || typeof record !== 'object') return record;
  const next = { ...record, child: { ...record.child } };
  if (Number.isFinite(+cls) && +cls >= 1) next.child.class = Math.min(12, Math.round(+cls));
  if (Number.isFinite(+age) && +age >= 5 && +age <= 17) { next.child.age = Math.round(+age); next.child.ageBand = ageBand(next.child.age); }
  if (next.child.class === record.child.class && next.child.age === record.child.age) return record;
  next.audit = [...(Array.isArray(record.audit) ? record.audit : []), { at: isoNow(now), action: 'details', note: `class ${next.child.class}, age ${next.child.age}` }];
  next.digest = digestOf(next);
  return next;
}
export function withdrawConsent(record, now = new Date(), note = '') {
  const next = { ...record, status: 'withdrawn', audit: [...(Array.isArray(record.audit) ? record.audit : []), { at: isoNow(now), action: 'withdrawn', note: clean(note, 120) }] };
  next.digest = digestOf(next);
  return next;
}
export const purposeOn = (record, id) => !!(record && record.status === 'granted' && record.purposes && record.purposes[id] === true);

// A receipt a guardian can keep or a school can check: the document plus its own verification code.
export function receiptText(record, now = new Date()) {
  return JSON.stringify({
    app: 'ks-learn', kind: 'parental-consent-receipt', text: 'Keep this file. It is the consent record held on the child’s device.',
    verificationCode: verificationCode(record), digest: record && record.digest,
    policy: { id: POLICY.id, version: POLICY.version, effective: POLICY.effective },
    record, checkedAt: isoNow(now),
  }, null, 2);
}

// ---------- untrusted input ----------
// Storage and backups are untrusted. Rebuild the record field by field, keeping `digest`
// intact so verifyConsent() can still report a tampered record instead of trusting it.
export function sanitizeConsent(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.v !== 1) return null;
  const id = typeof raw.id === 'string' && /^ksc_[0-9a-f]{16,40}$/.test(raw.id) ? raw.id : null;
  const guardian = raw.guardian && typeof raw.guardian === 'object' ? raw.guardian : {};
  const child = raw.child && typeof raw.child === 'object' ? raw.child : {};
  const name = clean(guardian.name, 60);
  if (!id || !name || !validStamp(raw.grantedAt) || !validDate(raw.reconsentBy)) return null;
  const rawAge = Math.round(+child.age);
  const age = Number.isFinite(rawAge) ? Math.min(17, Math.max(5, rawAge)) : 9;
  const purposes = {};
  for (const pid of PURPOSE_IDS) purposes[pid] = ESSENTIAL_PURPOSES.includes(pid) ? true : !!(raw.purposes && raw.purposes[pid] === true);
  const v = raw.verification && typeof raw.verification === 'object' ? raw.verification : {};
  const audit = (Array.isArray(raw.audit) ? raw.audit : []).slice(-20)
    .filter(a => a && typeof a === 'object' && validStamp(a.at) && ['granted', 'renewed', 'purposes', 'withdrawn', 'details'].includes(a.action))
    .map(a => ({ at: a.at, action: a.action, note: clean(a.note, 120) }));
  return {
    v: 1, id, policy: clean(raw.policy, 16) || POLICY.version,
    grantedAt: raw.grantedAt, reconsentBy: raw.reconsentBy,
    guardian: { name, relation: RELATIONS.includes(guardian.relation) ? guardian.relation : 'guardian' },
    child: { age, ageBand: ageBand(age), class: Math.min(12, Math.max(1, Math.round(+child.class || 4))) },
    purposes,
    verification: {
      method: v.method === 'school-token' ? 'school-token' : 'guardian-token',
      level: v.level === 'issuer-signed' ? 'issuer-signed' : 'guardian-ceremony',
      ref: clean(v.ref, 80), at: validStamp(v.at) ? v.at : raw.grantedAt,
    },
    status: raw.status === 'withdrawn' ? 'withdrawn' : 'granted',
    audit,
    digest: typeof raw.digest === 'string' && /^[0-9a-f]{64}$/.test(raw.digest) ? raw.digest : '',
  };
}

// One entry point used by the UI: it refuses to mint a record unless the chosen
// verification actually succeeded. The UI never has to remember that rule.
export function grantConsent(input, { now = new Date(), rand = globalThis.crypto } = {}) {
  const issues = [];
  const guardianName = clean(input && input.guardianName, 60);
  if (!guardianName) issues.push('guardianName');
  const relation = input && input.relation;
  if (!RELATIONS.includes(relation)) issues.push('relation');
  const age = Math.round(+((input && input.age) || 0));
  if (!(age >= 5 && age <= 17)) issues.push('age');
  const method = input && input.method === 'school-token' ? 'school-token' : 'guardian-token';
  let school = '', tokenHash = '';
  if (method === 'school-token') {
    const checked = verifySchoolToken(input.schoolToken, input.passcode, now);
    if (!checked.ok) issues.push(...checked.issues.map(i => `school.${i}`));
    else { school = clean(checked.payload.school, 60); tokenHash = clean(checked.payload.nonce, 80); }
  } else {
    if (!tokenMatches(input.typedToken, input.token)) issues.push('token');
    tokenHash = input.token && input.token.hash;
  }
  if (issues.length) return { ok: false, record: null, issues };
  const record = createConsent({ guardianName, relation, age, class: input.cls, purposes: input.purposes, method, school, tokenHash }, { now, rand });
  return { ok: true, record, issues: [] };
}
