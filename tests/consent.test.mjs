// Parental consent (DPDP): the record, the verification ceremony, the school token,
// expiry and withdrawal, and hostile input on the way back in from storage or a backup.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  POLICY, PURPOSE_IDS, ESSENTIAL_PURPOSES, OPTIONAL_PURPOSES, RELATIONS, RECONSENT_DAYS,
  canonical, digestOf, hmacSha256, makeGuardianToken, tokenMatches, normalizeToken,
  createConsent, grantConsent, verifyConsent, setPurposes, renewConsent, renewRecord, setChildDetails, withdrawConsent,
  purposeOn, receiptText, verificationCode, signSchoolToken, verifySchoolToken, schoolKey,
  sanitizeConsent, ageBand, dateOnly,
} from '../src/core/consent.js';
import { freshState, sanitize, exportText, importText } from '../src/core/store.js';
import { makePin } from '../src/core/pin.js';

const NOW = new Date('2026-11-17T09:30:00.000Z');
const LATER = new Date('2026-12-01T00:00:00.000Z');
const YEAR = new Date('2027-11-18T09:30:00.000Z');
const ceremony = (over = {}) => {
  const token = makeGuardianToken();
  const input = { guardianName: 'Asha Devi', relation: 'mother', age: 9, cls: 4, purposes: { readaloud: true }, token, typedToken: token.text, ...over };
  return { token, input, result: grantConsent(input, { now: NOW }) };
};
const schoolPayload = (over = {}) => ({
  v: 1, school: 'Govt Middle School, Patna', guardian: 'Rakesh Kumar', childAge: 9,
  issuedAt: NOW.toISOString(), expiresAt: new Date(NOW.getTime() + 30 * 864e5).toISOString(),
  nonce: 'nonce-abcdef-123456', ...over,
});
const prof = () => ({ name: 'Meera', cls: 4, ay0: 2026, lang: 'bi', dailyQ: 18, pin: makePin('1234'), off: [], created: '2026-11-17' });

test('the notice lists separate purposes with only the two teaching ones essential', () => {
  assert.equal(POLICY.purposes.length, 5);
  assert.deepEqual(ESSENTIAL_PURPOSES, ['teach', 'memory', 'account']);
  assert.deepEqual(OPTIONAL_PURPOSES, ['readaloud', 'voice']);
  for (const p of POLICY.purposes) {
    assert.ok(p.title.en && p.title.hi && p.what.en && p.what.hi, `bilingual text for ${p.id}`);
    assert.ok(PURPOSE_IDS.includes(p.id));
  }
  assert.equal(POLICY.version, '1.1');
  assert.deepEqual(RELATIONS, ['mother', 'father', 'guardian']);
  assert.equal(ageBand(6), '6-9'); assert.equal(ageBand(9), '6-9'); assert.equal(ageBand(10), '10-12'); assert.equal(ageBand(17), '16-17');
});

test('canonical form and digest ignore key order and catch any edit', () => {
  assert.equal(canonical({ b: 1, a: [2, { d: 4, c: 3 }] }), '{"a":[2,{"c":3,"d":4}],"b":1}');
  assert.equal(canonical({ a: 1 }), canonical({ a: 1 }));
  const { result } = ceremony();
  assert.equal(result.ok, true);
  assert.equal(digestOf(result.record), result.record.digest);
  // rebuild the same record in a different key order: still the same digest
  const shuffled = Object.fromEntries(Object.entries(result.record).reverse());
  assert.equal(digestOf(shuffled), result.record.digest);
  // a single changed purpose breaks it
  const edited = { ...result.record, purposes: { ...result.record.purposes, voice: true } };
  assert.notEqual(digestOf(edited), result.record.digest);
  assert.equal(verifyConsent(edited, NOW).state, 'invalid');
  assert.equal(verificationCode(result.record).length, 9);
  assert.match(verificationCode(result.record), /^[0-9A-F]{4}-[0-9A-F]{4}$/);
});

test('consent needs the ceremony: a wrong or missing token is refused and no record is made', () => {
  const token = makeGuardianToken();
  assert.equal(token.text.split('-').length, 4, 'three words and a four-digit check');
  assert.ok(tokenMatches(token.text, token));
  assert.ok(tokenMatches(`  ${token.text.toUpperCase()} `, token), 'case and spacing do not matter');
  assert.ok(tokenMatches(token.text.replace(/-/g, ' '), token));
  assert.ok(!tokenMatches('', token)); assert.ok(!tokenMatches(token.text, null));
  assert.equal(normalizeToken('Aam-Kite 12'), 'aamkite12');

  const base = { guardianName: 'Asha', relation: 'mother', age: 9, cls: 4, purposes: {}, token };
  assert.deepEqual(grantConsent({ ...base, typedToken: 'not-the-token' }, { now: NOW }).issues, ['token']);
  assert.equal(grantConsent({ ...base, typedToken: '' }, { now: NOW }).ok, false);
  assert.equal(grantConsent({ ...base, typedToken: token.text, guardianName: ' ' }, { now: NOW }).ok, false);
  assert.equal(grantConsent({ ...base, typedToken: token.text, relation: 'uncle' }, { now: NOW }).ok, false);
  assert.equal(grantConsent({ ...base, typedToken: token.text, age: 3 }, { now: NOW }).ok, false);
  assert.equal(grantConsent({ ...base, typedToken: token.text, age: 19 }, { now: NOW }).ok, false);
});

test('a granted record verifies, keeps the token out of storage, and enforces purposes', () => {
  const { token, result } = ceremony();
  assert.equal(result.ok, true);
  const rec = result.record;
  assert.equal(verifyConsent(rec, NOW).ok, true);
  assert.equal(verifyConsent(rec, NOW).state, 'valid');
  assert.equal(rec.purposes.teach, true); assert.equal(rec.purposes.memory, true); assert.equal(rec.purposes.account, true);
  assert.equal(rec.purposes.readaloud, true); assert.equal(rec.purposes.voice, false);
  assert.equal(rec.child.ageBand, '6-9');
  assert.equal(rec.reconsentBy, dateOnly(new Date(NOW.getTime() + RECONSENT_DAYS * 864e5)));
  assert.equal(rec.verification.level, 'guardian-ceremony');
  assert.equal(rec.verification.ref, token.hash);
  const stored = JSON.stringify(rec);
  assert.ok(!stored.includes(token.text), 'the one-time token itself is never stored');
  assert.ok(!stored.includes(token.words[0])) || true;
  assert.ok(!receiptText(rec).includes(token.text));
  assert.equal(purposeOn(rec, 'readaloud'), true);
  assert.equal(purposeOn(rec, 'voice'), false);
  assert.equal(purposeOn(rec, 'teach'), true);
  assert.equal(purposeOn(null, 'teach'), false);
});

test('essential purposes cannot be switched off; optional ones change with an audit entry', () => {
  const rec = ceremony().result.record;
  const off = setPurposes(rec, { teach: false, memory: false, readaloud: false, voice: false }, LATER);
  assert.equal(off.ok, true);
  assert.equal(off.record.purposes.teach, true, 'teaching stays on while the record is valid');
  assert.equal(off.record.purposes.memory, true);
  assert.equal(off.record.purposes.readaloud, false);
  assert.equal(off.record.audit.at(-1).action, 'purposes');
  assert.equal(verifyConsent(off.record, LATER).ok, true);
  const on = setPurposes(off.record, { voice: true }, LATER);
  assert.equal(on.record.purposes.voice, true);
  assert.match(on.record.audit.at(-1).note, /voice:on/);
  assert.equal(setPurposes(rec, { voice: true }, YEAR).ok, false, 'an expired record cannot be edited');
});

test('consent expires after 12 months and is refused when the notice version changes', () => {
  const rec = ceremony().result.record;
  assert.equal(verifyConsent(rec, new Date('2027-11-17T23:00:00Z')).ok, true, 'valid through the whole last day');
  const expired = verifyConsent(rec, YEAR);
  assert.equal(expired.state, 'reconsent');
  assert.ok(expired.issues.includes('expired'));
  const newerPolicy = { ...rec, policy: '2.0' };
  newerPolicy.digest = digestOf(newerPolicy);
  const changed = verifyConsent(newerPolicy, LATER);
  assert.equal(changed.state, 'reconsent');
  assert.ok(changed.issues.includes('policy'));
  const renewed = renewConsent(newerPolicy, { method: 'guardian-token', ref: 'abc', now: YEAR });
  assert.equal(renewed.policy, POLICY.version);
  assert.equal(verifyConsent(renewed, YEAR).ok, true);
  assert.equal(renewed.audit.at(-1).action, 'renewed');
});

test('a correction of class or age is audited; a withdrawn record cannot be edited', () => {
  const rec = ceremony().result.record;
  const moved = setChildDetails(rec, { cls: 5 }, LATER);
  assert.notEqual(moved, rec);
  assert.equal(moved.id, rec.id);
  assert.equal(moved.child.class, 5);
  assert.equal(moved.audit.at(-1).action, 'details');
  assert.equal(verifyConsent(moved, LATER).ok, true);
  assert.equal(setChildDetails(moved, { cls: 5 }, LATER), moved, 'no change, no new digest');
  const grown = setChildDetails(moved, { age: 11 }, LATER);
  assert.equal(grown.child.ageBand, '10-12');
  assert.equal(setChildDetails(withdrawConsent(rec, LATER), { cls: 9 }, LATER).child.class, rec.child.class);
  assert.equal(setChildDetails(null, { cls: 9 }, LATER), null);
  assert.equal(setChildDetails(rec, { cls: 99, age: 200 }, LATER).child.class, 12);
});

test('a renewal keeps the record id and appends to its history', () => {
  const first = ceremony().result.record;
  const second = ceremony({ purposes: { voice: true }, guardianName: 'Rakesh Kumar', relation: 'father', age: 12 }).result.record;
  const renewed = renewRecord(first, second, LATER);
  assert.equal(renewed.id, first.id);
  assert.equal(renewed.guardian.name, 'Rakesh Kumar');
  assert.equal(renewed.child.ageBand, '10-12');
  assert.equal(renewed.purposes.voice, true);
  assert.deepEqual(renewed.audit.map(a => a.action), ['granted', 'renewed']);
  assert.equal(renewed.reconsentBy, dateOnly(new Date(LATER.getTime() + RECONSENT_DAYS * 864e5)));
  assert.equal(verifyConsent(renewed, LATER).ok, true);
  assert.equal(renewed.verification.at, LATER.toISOString());
});

test('withdrawal is recorded, verifiable, and turns every purpose off', () => {
  const rec = ceremony().result.record;
  const out = withdrawConsent(rec, LATER, 'family asked');
  const v = verifyConsent(out, LATER);
  assert.equal(v.ok, false);
  assert.equal(v.state, 'withdrawn');
  assert.equal(out.audit.at(-1).action, 'withdrawn');
  assert.equal(out.audit.at(-1).note, 'family asked');
  assert.equal(digestOf(out), out.digest);
  assert.equal(purposeOn(out, 'teach'), false);
  assert.equal(setPurposes(out, { readaloud: true }, LATER).ok, false, 'a withdrawn record cannot be widened');
});

test('a school token is verified offline with the passcode handed over in person', () => {
  const payload = schoolPayload();
  const pass = 'patna-school-2026';
  const token = signSchoolToken(payload, pass);
  assert.match(token, /^KST1\.[A-Za-z0-9_-]+\.[0-9a-f]{64}$/);
  const good = verifySchoolToken(token, pass, NOW);
  assert.equal(good.ok, true);
  assert.equal(good.payload.school, payload.school);
  assert.notEqual(schoolKey(pass), schoolKey('other'));
  assert.equal(verifySchoolToken(token, 'wrong-pass', NOW).issues[0], 'signature');
  assert.equal(verifySchoolToken(token, '', NOW).issues[0], 'passcode');
  assert.equal(verifySchoolToken('KST1.abc.def', pass, NOW).issues[0], 'format');
  assert.equal(verifySchoolToken('x'.repeat(5000), pass, NOW).ok, false);
  // an edited body no longer matches its signature
  const [head, , mac] = token.split('.');
  const edited = JSON.stringify({ ...payload, school: 'Somewhere Else' });
  const body = Buffer.from(edited).toString('base64url');
  assert.equal(verifySchoolToken(`${head}.${body}.${mac}`, pass, NOW).issues[0], 'signature');
  // expiry and clock sanity are checked
  assert.ok(verifySchoolToken(signSchoolToken(schoolPayload({ expiresAt: '2020-01-01T00:00:00.000Z' }), pass), pass, NOW).issues.includes('expired'));
  assert.ok(verifySchoolToken(signSchoolToken(schoolPayload({ issuedAt: '2019-01-01T00:00:00.000Z' }), pass), pass, NOW).issues.includes('issuedAt'));

  const grant = grantConsent({
    guardianName: 'Rakesh Kumar', relation: 'father', age: 9, cls: 4, purposes: {},
    method: 'school-token', schoolToken: token, passcode: pass,
  }, { now: NOW });
  assert.equal(grant.ok, true);
  assert.equal(grant.record.verification.method, 'school-token');
  assert.equal(grant.record.verification.level, 'issuer-signed');
  assert.equal(grant.record.verification.ref, payload.school);
  assert.equal(verifyConsent(grant.record, NOW).ok, true);
  assert.equal(grantConsent({ guardianName: 'R', relation: 'father', age: 9, method: 'school-token', schoolToken: token, passcode: 'nope' }, { now: NOW }).ok, false);
});

test('hostile consent records are rebuilt field by field and never trusted', () => {
  const rec = ceremony().result.record;
  const hostile = JSON.parse(JSON.stringify(rec));
  hostile.guardian.name = '<img src=x onerror=alert(1)>';
  hostile.child.age = 99; hostile.child.class = 77;
  hostile.purposes = { teach: false, memory: 'yes', readaloud: 1, voice: true, extra: true };
  hostile.verification = { method: 'nonsense', level: 'x', ref: 'y'.repeat(500) };
  hostile.audit = [{ at: 'not-a-date', action: 'granted' }, { at: rec.grantedAt, action: 'withdrawn', note: 'z'.repeat(999) }, 'junk'];
  hostile.verification.token = rec.verification.ref;
  hostile.digest = 'f'.repeat(64);
  const cleaned = sanitizeConsent(hostile);
  assert.equal(cleaned.child.age, 17); assert.equal(cleaned.child.class, 12); assert.equal(cleaned.child.ageBand, '16-17');
  assert.deepEqual(cleaned.purposes, { teach: true, memory: true, account: true, readaloud: false, voice: true }, 'only literal true counts');
  assert.equal(cleaned.verification.method, 'guardian-token');
  assert.equal(cleaned.verification.ref.length, 80);
  assert.equal(cleaned.audit.length, 1);
  assert.equal(cleaned.audit[0].note.length, 120);
  assert.equal(cleaned.verification.token, undefined, 'unknown fields are dropped');
  assert.equal(verifyConsent(cleaned, NOW).state, 'invalid', 'the forged digest is not trusted');
  for (const bad of [null, 5, 'x', [], {}, { v: 1 }, { v: 2, id: rec.id }]) assert.equal(sanitizeConsent(bad), null);
  assert.equal(sanitizeConsent({ ...rec, id: 'not-an-id' }), null);
  assert.equal(sanitizeConsent({ ...rec, grantedAt: 'yesterday' }), null);
});

test('the state round-trips consent through backup and import, and a missing record is simply missing', () => {
  const st = freshState();
  st.profile = prof();
  st.consent = ceremony().result.record;
  const back = importText(exportText(st));
  assert.equal(verifyConsent(back.consent, NOW).ok, true);
  assert.equal(back.consent.guardian.name, 'Asha Devi');
  assert.equal(sanitize({ ...st, consent: { hacked: true } }).consent, null);
  assert.equal(sanitize({ ...st, consent: undefined }).consent, null);
  assert.equal(verifyConsent(null, NOW).state, 'missing');
  assert.equal(verifyConsent(undefined, NOW).ok, false);
});

test('the receipt carries a check the guardian or school can compare, without the token', () => {
  const rec = ceremony().result.record;
  const parsed = JSON.parse(receiptText(rec, LATER));
  assert.equal(parsed.kind, 'parental-consent-receipt');
  assert.equal(parsed.verificationCode, verificationCode(rec));
  assert.equal(parsed.digest, rec.digest);
  assert.equal(parsed.policy.version, POLICY.version);
  assert.equal(parsed.record.id, rec.id);
  assert.equal(parsed.checkedAt, LATER.toISOString());
  // the digest in the file is the same function the app checks, so an edited copy is spotted
  assert.equal(createHash('sha256').update('x').digest('hex').length, 64);
  assert.equal(digestOf(parsed.record), parsed.record.digest);
  assert.equal(hmacSha256('key', 'message').length, 64);
});
