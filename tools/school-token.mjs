#!/usr/bin/env node
// Mints a school-issued parental consent token for KS-LEARN.
//
// The school (or the NGO / teacher who sets up the device) runs this, gives the guardian the
// token and tells them the passcode in person. The app checks the token offline; the passcode
// is the only secret and it is never stored by the app.
//
//   node tools/school-token.mjs --school "Govt Middle School, Patna" --guardian "Asha Devi" \
//        --age 9 --passcode "in-person-secret" --days 30 --out consent-token.txt
import { writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { signSchoolToken } from '../src/core/consent.js';

const args = process.argv.slice(2);
const opt = (name, fallback = '') => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const fail = message => { console.error(`school-token: ${message}`); process.exit(1); };

const school = opt('school').trim();
const guardian = opt('guardian').trim();
const age = Number(opt('age', '9'));
const passcode = opt('passcode');
const days = Number(opt('days', '30'));
const out = opt('out');

if (!school || school.length > 80) fail('--school is required (up to 80 characters)');
if (!guardian || guardian.length > 60) fail('--guardian is required (up to 60 characters)');
if (!Number.isInteger(age) || age < 6 || age > 17) fail('--age must be a whole number between 6 and 17');
if (!passcode || passcode.trim().length < 6 || passcode.trim().length > 64) fail('--passcode must be 6 to 64 characters');
if (!Number.isFinite(days) || days < 1 || days > 400) fail('--days must be between 1 and 400');

const now = new Date();
const payload = {
  v: 1,
  school, guardian, childAge: age,
  issuedAt: now.toISOString(),
  expiresAt: new Date(now.getTime() + Math.round(days) * 864e5).toISOString(),
  nonce: randomBytes(16).toString('hex'),
};
const token = signSchoolToken(payload, passcode);
const sheet = [
  'KS-LEARN — parental consent token',
  '',
  `School:    ${school}`,
  `Guardian:  ${guardian}`,
  `Child age: ${age}`,
  `Issued:    ${payload.issuedAt}`,
  `Expires:   ${payload.expiresAt}`,
  '',
  'Give the guardian this token (paste it on the app’s consent screen) and tell them the',
  'passcode in person. The passcode is not written on this sheet.',
  '',
  token,
  '',
].join('\n');

if (out) { writeFileSync(out, sheet, { mode: 0o600 }); console.log(`written to ${out}`); }
else console.log(sheet);
