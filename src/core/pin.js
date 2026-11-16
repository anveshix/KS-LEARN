// Parent PIN: salted, stretched hash plus an attempt limiter.
// This is a child lock, not strong security: a 4-digit PIN stored on the device can
// always be brute-forced by someone with developer tools. It is never stored in clear.
const K = new Uint32Array(64), H0 = new Uint32Array(8);
{ // SHA-256 constants: fractional parts of the cube/square roots of the first primes
  let n = 0;
  for (let c = 2; n < 64; c++) {
    let prime = true; for (let d = 2; d * d <= c; d++) if (c % d === 0) { prime = false; break; }
    if (!prime) continue;
    if (n < 8) H0[n] = (Math.sqrt(c) % 1) * 2 ** 32;
    K[n++] = (Math.cbrt(c) % 1) * 2 ** 32;
  }
}
const rotr = (x, n) => (x >>> n) | (x << (32 - n));
const utf8 = s => new TextEncoder().encode(s);

export function sha256(bytes) {
  if (typeof bytes === 'string') bytes = utf8(bytes);
  const len = bytes.length, total = ((len + 9 + 63) >> 6) << 6, m = new Uint8Array(total), dv = new DataView(m.buffer);
  m.set(bytes); m[len] = 0x80; dv.setUint32(total - 8, Math.floor(len / 2 ** 29)); dv.setUint32(total - 4, (len << 3) >>> 0);
  const h = new Uint32Array(H0), w = new Uint32Array(64);
  for (let o = 0; o < total; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  const out = new Uint8Array(32), odv = new DataView(out.buffer);
  h.forEach((v, i) => odv.setUint32(i * 4, v));
  return out;
}
export const hex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');

const ROUNDS = 4000;
export const validPin = pin => /^\d{4,8}$/.test(String(pin));
function stretch(pin, salt, rounds) {
  let h = sha256(`ks-learn|${salt}|${pin}`);
  const s = utf8(salt), buf = new Uint8Array(32 + s.length); buf.set(s, 32);
  for (let i = 0; i < rounds; i++) { buf.set(h); h = sha256(buf); }
  return hex(h);
}
export function randomSalt(rand = globalThis.crypto) {
  const b = new Uint8Array(16); rand.getRandomValues(b); return hex(b);
}
// -> { v: 2, s: salt, n: rounds, h: hash }
export const makePin = (pin, salt = randomSalt()) => ({ v: 2, s: salt, n: ROUNDS, h: stretch(String(pin), salt, ROUNDS) });

function same(a, b) { // constant-time string compare
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
// Accepts the current record and the two formats written by app versions before 2.1.
export function verifyPin(pin, rec) {
  pin = String(pin);
  if (rec && typeof rec === 'object' && rec.v === 2) return same(stretch(pin, rec.s, rec.n), rec.h);
  if (typeof rec === 'string' && rec.startsWith('p:')) return same('p:' + pin, rec);
  if (typeof rec === 'string') return same(hex(sha256('ks-learn:' + pin)), rec);
  return false;
}
export const needsUpgrade = rec => !(rec && typeof rec === 'object' && rec.v === 2);

// Attempt limiter. lock = { f: consecutive failures, until: epoch ms }
export const LOCK_AFTER = 5;
export const lockedFor = (lock, nowMs) => Math.max(0, Math.ceil((((lock && lock.until) || 0) - nowMs) / 1000));
export function recordAttempt(lock, ok, nowMs) {
  if (ok) return { f: 0, until: 0 };
  const f = ((lock && lock.f) || 0) + 1;
  const over = f - LOCK_AFTER;
  return { f, until: over >= 0 ? nowMs + Math.min(15 * 60, 60 * 2 ** over) * 1000 : 0 };
}
