// Browser test of the built files (needs Playwright; set PLAYWRIGHT_FROM to its install path if it is global).
// Covers: the parental-consent gate, setup validation, a mission, stop, parent lock + attempt limit,
// settings, backup/restore/undo, a tampered consent record, policy violations, network silence,
// and the installed PWA working offline.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(process.env.PLAYWRIGHT_FROM || import.meta.url)('playwright');

const FILE = 'file://' + resolve('dist/ks-learn.html');
const b = await chromium.launch();
const problems = [];
async function open(ctx, url) {
  const p = await ctx.newPage();
  await p.addLocatorHandler(p.locator('#cel-ok'), l => l.click()); // reward pop-up: the child taps OK
  p.on('pageerror', e => problems.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  p.on('request', r => { if (!/^(file|data|blob|http:\/\/127\.0\.0\.1)/.test(r.url())) problems.push('network: ' + r.url()); });
  await p.goto(url); await p.waitForSelector('#app > *:not(.boot)');
  return p;
}
const text = p => p.innerText('body');
const step = async (name, fn) => { await fn(); console.log('ok  ', name); };
// First run: notice -> guardian and purposes -> one-time token typed back -> receipt.
const registerGuardian = async (page, pass = 'Tulsi-leaf-2026') => {
  await page.waitForSelector('#reg-name');
  await page.fill('#reg-pass', pass); await page.fill('#reg-pass2', pass);
  await page.click('#reg-submit');
  await page.waitForSelector('#rec-code');
  await page.check('#rec-ack'); await page.click('#rec-done');
  await page.waitForSelector('#setup');
};
const onboard = async page => { await giveConsent(page); await registerGuardian(page); };
const giveConsent = async page => {
  await page.waitForSelector('#cg-ack');
  await page.check('#cg-ack'); await page.click('#onb-next');
  await page.fill('#cg-name', 'Asha Devi'); await page.selectOption('#cg-rel', 'mother'); await page.fill('#cg-age', '9');
  await page.check('#cg-attest'); await page.click('#onb-next');
  const token = (await page.innerText('#ct-token')).trim();
  await page.fill('#ct-in', token); await page.click('#ct-verify');
  await page.waitForSelector('#onb-done'); await page.click('#onb-done');
};

const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true });
let p = await open(ctx, FILE);

let consentRecord;
await step('consent gate: notice must be acknowledged, purposes are separate, the token must be typed back', async () => {
  await p.click('#onb-next');
  assert.ok(await p.isVisible('#cg-err'), 'the notice cannot be skipped');
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('kslearn.v2') || '{}').consent), null, 'no record before consent');
  await giveConsent(p);
  await p.waitForSelector('#reg-name');
  consentRecord = await p.evaluate(() => JSON.parse(localStorage.getItem('kslearn.v2')).consent);
  assert.equal(consentRecord.guardian.name, 'Asha Devi');
  assert.equal(consentRecord.purposes.teach, true);
  assert.equal(consentRecord.purposes.memory, true);
  assert.equal(consentRecord.purposes.voice, false, 'optional purposes start off');
  assert.match(consentRecord.digest, /^[0-9a-f]{64}$/);
  assert.match(consentRecord.verification.method, /guardian-token/);
  assert.match(consentRecord.verification.ref, /^[0-9a-f]{64}$/, 'only the token hash is stored');
});
await step('guardian account: only stretched hashes are stored, never the passphrase', async () => {
  await registerGuardian(p);
  const acc = await p.evaluate(() => JSON.parse(localStorage.getItem('kslearn.v2')).account);
  assert.equal(acc.name, 'Asha Devi');
  assert.equal(acc.kdf.fast.i, 210000);
  assert.equal(acc.kdf.slow.i, 30000);
  assert.match(acc.kdf.fast.h, /^[0-9a-f]{64}$/);
  assert.match(acc.recovery.kdf.s, /^[0-9a-f]{32}$/);
  assert.equal(acc.requireUnlock, false);
  const raw = await p.evaluate(() => localStorage.getItem('kslearn.v2'));
  assert.ok(!raw.includes('Tulsi-leaf-2026'), 'passphrase never reaches storage');
});
await step('setup refuses a blank name and a short PIN', async () => {
  await p.fill('#f-name', '   '); await p.fill('#f-pin', '1234'); await p.evaluate(() => document.querySelector('#setup').requestSubmit());
  assert.ok(await p.isVisible('#f-err'));
  await p.fill('#f-name', 'Asha'); await p.fill('#f-pin', '12'); await p.evaluate(() => { const f = document.querySelector('#setup'); f.noValidate = true; f.requestSubmit(); });
  assert.ok(await p.isVisible('#f-err'));
  await p.fill('#f-pin', '1234'); await p.click('#setup button[type=submit]'); await p.waitForSelector('.mission');
});
await step('PIN is stored salted, never in clear', async () => {
  const raw = await p.evaluate(() => localStorage.getItem('kslearn.v2'));
  const pin = JSON.parse(raw).profile.pin;
  assert.equal(pin.v, 2); assert.equal(pin.h.length, 64); assert.ok(!raw.includes('"1234"') && !raw.includes('p:1234'));
});
const answerOnce = async () => {
  if (await p.$('.lesson')) { await p.click('#go'); return false; }
  const inp = await p.$('#ans');
  if (inp) { await inp.fill('7'); await p.click('.answer-row .btn'); }
  else if (await p.$('.w-order')) { while (await p.$('.ord-bank .tile-btn:not([disabled])')) await p.click('.ord-bank .tile-btn:not([disabled])'); await p.click('.answer-row .btn'); }
  else if (await p.$('.w-match')) { while (await p.$('.m-col:first-child .tile-btn:not(.paired)')) { await p.click('.m-col:first-child .tile-btn:not(.paired)'); await p.click('.m-col:last-child .tile-btn:not(.paired)'); } await p.click('.answer-row .btn'); }
  else await p.click('.opt');
  // A miss is never red: the card shows a hint and offers the easier question (Hint -> Scaffold -> Retry -> Reward).
  await p.waitForSelector('.feedback.good, .feedback.try'); await p.click('.q .actions .btn.primary');
  return true;
};
await step('stop mid-mission returns home and keeps progress', async () => {
  await p.click('.mission .btn.primary');
  let n = 0; while (n < 3) if (await answerOnce()) n++;
  await p.click('.qhead .btn'); await p.waitForSelector('.mission');
  const mq = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('kslearn.v2')).days)[0].mq);
  assert.ok(mq >= 1 && mq <= 3, 'only graded answers count towards the mission'); assert.match(await text(p), new RegExp(`${18 - mq} questions`));
});
await step('full mission completes and is marked done', async () => {
  await p.click('.mission .btn.primary');
  for (let i = 0; i < 300 && !(await p.$('.card.done')); i++) await answerOnce();
  await p.click('.card.done .btn.primary'); await p.waitForSelector('.mission.complete');
  const d = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('kslearn.v2')).days)[0]);
  assert.equal(d.done, true); assert.equal(d.mq, 18);
});
await step('guidance loop: a miss shows a hint, then an easier question, then a retry; nothing is red', async () => {
  await p.click('a[href="#home"]').catch(() => {}); await p.waitForSelector('.strand.s-s');
  await p.click('.strand.s-s'); let seenTry = false;
  for (let i = 0; i < 40 && !seenTry; i++) {
    if (await p.$('.lesson')) { await p.click('#go'); continue; }
    await p.click(`.opt[data-i="${i % 3}"]`);
    await p.waitForSelector('.feedback.good, .feedback.try');
    if (await p.$('.feedback.try')) {
      seenTry = true;
      const t = await p.$eval('.feedback.try', e => e.textContent);
      assert.ok(!/wrong|incorrect|गलत/i.test(t), 'no harsh wording'); assert.ok(await p.$('.feedback.try .hint'), 'a hint is shown');
      assert.equal(await p.$$eval('.opt.right', e => e.length), 0, 'the answer is not revealed yet');
      assert.equal(await p.$$eval('.opt.wrong, .feedback.bad', e => e.length), 0, 'no red wrong state');
      await p.click('.q .actions .btn.primary'); await p.waitForSelector('.card.guide');          // scaffold
      await p.click('.opt'); await p.waitForSelector('.feedback.good, .feedback.try'); await p.click('.q .actions .btn.primary');
      if (await p.$('.eyebrow:has-text("🪜")')) { await p.click('.opt'); await p.waitForSelector('.feedback.good, .feedback.try'); await p.click('.q .actions .btn.primary'); } // optional second level
      await p.waitForSelector('.card.guide .eyebrow:has-text("🔁")');                           // retry of the original
      await p.click('.opt'); await p.waitForSelector('.feedback.good, .feedback.try'); await p.click('.q .actions .btn.primary');
    } else await p.click('.q .actions .btn.primary');
  }
  assert.ok(seenTry, 'a miss happened and the loop ran');
  await p.click('.qhead .btn'); await p.waitForSelector('.mission');
});
await step('keyboard shortcut ignores Ctrl/Alt combos', async () => {
  await p.click('.strand'); if (await p.$('.lesson')) await p.click('#go');
  if (await p.$('.opt')) { await p.keyboard.press('Control+a'); await p.keyboard.press('Alt+b'); assert.equal(await p.$('.feedback.good, .feedback.bad'), null); }
  await p.click('.qhead .btn'); await p.waitForSelector('.mission');
});
const unlock = async pin => { await p.fill('#pin', pin); await p.click('form .btn.primary'); };
await step('parent area: wrong PINs lock it, right PIN is refused while locked', async () => {
  await p.click('a[href="#parent"]'); await p.waitForSelector('#pin');
  for (let i = 0; i < 5; i++) await unlock('0000');
  assert.match(await p.innerText('#pinerr'), /Wait before trying again/);
  await unlock('1234'); assert.ok(await p.$('#pin'), 'still locked');
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('kslearn.v2')); s.lock = { f: 0, until: 0 }; localStorage.setItem('kslearn.v2', JSON.stringify(s)); });
  await p.reload(); await p.waitForSelector('#pin'); await unlock('1234'); await p.waitForSelector('#s-lang');
});
await step('parent area locks itself when left', async () => {
  await p.click('a[href="#home"]'); await p.waitForSelector('.mission'); await p.click('a[href="#parent"]');
  await p.waitForSelector('#pin'); await unlock('1234'); await p.waitForSelector('#s-lang');
});
let backup;
await step('settings save; backup downloads as a file', async () => {
  await p.selectOption('#s-lang', 'hi'); await p.click('form:has(#s-lang) button[type=submit]'); await p.waitForSelector('#s-lang');
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('kslearn.v2')).profile.lang), 'hi');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('section:has(#b-file) .btn.primary')]);
  backup = readFileSync(await dl.path(), 'utf8');
  assert.equal(JSON.parse(backup).app, 'ks-learn');
});
await step('restore needs two taps, rejects junk, and can be undone', async () => {
  await p.fill('#b-text', '{"app":"ks-learn","state":{"v":2,"skills":{},"profile":{"name":"<script>alert(1)</script>"}}}');
  await p.click('section:has(#b-file) > .btn'); assert.ok(await p.$('#b-text'), 'junk refused');
  const other = JSON.parse(backup); other.state.stars = 4242; other.state.profile.name = '<img src=x onerror=alert(1)>';
  await p.fill('#b-text', JSON.stringify(other));
  await p.click('section:has(#b-file) > .btn'); assert.ok(await p.isVisible('section:has(#b-file) .warn'));
  await p.click('section:has(#b-file) > .btn'); await p.waitForSelector('.mission');
  assert.match(await text(p), /4242/); assert.match(await text(p), /<img src=x onerror=a/); assert.equal(await p.$('img'), null, 'markup in a name stays text');
  await p.click('a[href="#parent"]'); await unlock('1234'); await p.waitForSelector('#s-lang');
  await p.click('section:has(#b-file) .btn.ghost'); await p.waitForSelector('.mission');
  assert.doesNotMatch(await text(p), /4242/);
});
await step('damaged storage is set aside, not overwritten', async () => {
  await p.evaluate(() => localStorage.setItem('kslearn.v2', '{"v":2,"skills":'));
  await p.reload(); await onboard(p);
  assert.equal(await p.evaluate(() => localStorage.getItem('kslearn.v2.damaged')), '{"v":2,"skills":');
});
await step('dark theme and 320px width render without horizontal scroll', async () => {
  const c2 = await b.newContext({ viewport: { width: 320, height: 640 }, colorScheme: 'dark' }), q = await open(c2, FILE);
  await onboard(q);
  await q.fill('#f-name', 'A'); await q.fill('#f-pin', '1111'); await q.click('#setup button[type=submit]'); await q.waitForSelector('.mission');
  for (const h of ['#home', '#map']) { await q.goto(FILE + h); await q.waitForTimeout(150); assert.ok(await q.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'overflow at ' + h); }
  await c2.close();
});
await ctx.close();

// PWA: serve dist/pwa locally, install the service worker, then go offline and reload.
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = createServer((req, res) => {
  const path = join('dist/pwa', decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\.\.+/g, ''));
  const f = path.endsWith('/') || path === 'dist/pwa' ? join(path, 'index.html') : path;
  if (!existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}/`;
const c3 = await b.newContext();
await step('PWA installs a service worker and opens offline', async () => {
  // localhost is http, so register by hand exactly as the app does on https
  const q = await open(c3, base);
  await onboard(q);
  await q.fill('#f-name', 'A'); await q.fill('#f-pin', '1111'); await q.click('#setup button[type=submit]'); await q.waitForSelector('.mission');
  await q.evaluate(() => navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready));
  await q.waitForFunction(() => navigator.serviceWorker.controller || navigator.serviceWorker.ready.then(r => !!r.active));
  await q.reload(); await q.waitForSelector('.mission');
  await new Promise(r => srv.close(r)); srv.closeAllConnections?.();
  await c3.setOffline(true);
  await q.reload(); await q.waitForSelector('.mission');
  assert.match(await q.innerText('body'), /mission/i);
});
await step('a tampered consent record closes the learning screens until a guardian re-consents', async () => {
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('kslearn.v2')); s.consent.purposes.voice = true; localStorage.setItem('kslearn.v2', JSON.stringify(s)); });
  await p.reload(); await p.waitForSelector('#rc-form');
  assert.match(await text(p), /does not match its own verification code/);
  await p.fill('#rc-pin', '1234'); await p.click('#rc-form button[type=submit]');
  await p.waitForSelector('#cg-attest');
  await p.check('#cg-attest'); await p.click('#onb-next');
  await p.fill('#ct-in', (await p.innerText('#ct-token')).trim()); await p.click('#ct-verify');
  await p.waitForSelector('#onb-done'); await p.click('#onb-done');
  await p.waitForSelector('.bento');
  const fresh = await p.evaluate(() => JSON.parse(localStorage.getItem('kslearn.v2')).consent);
  assert.equal(fresh.verification.method, 'guardian-token');
  assert.equal(fresh.purposes.voice, false);
  assert.match(fresh.digest, /^[0-9a-f]{64}$/);
});
await step('the guardian passphrase signs in and out of the privacy actions', async () => {
  await p.click('a[href="#parent"]'); await p.waitForSelector('#pin');
  await p.fill('#pin', '1234'); await p.click('form .btn.primary'); await p.waitForSelector('#acc-auth');
  assert.match(await p.innerText('#acc-chip'), /not signed in/i);
  await p.click('#acc-auth'); await p.waitForSelector('#login-pass');
  await p.fill('#login-pass', 'Tulsi-leaf-2026'); await p.click('#login-submit');
  await p.waitForSelector('#acc-chip:has-text("Signed in")', { timeout: 15000 });
  const acc = await p.evaluate(() => JSON.parse(localStorage.getItem('kslearn.v2')).account);
  assert.ok(acc.loginCount >= 1 && acc.audit.some(a => a.action === 'login'));
  await p.click('#acc-auth'); await p.waitForSelector('.mission');
});
await c3.close(); await b.close();
const real = problems.filter(x => !/ERR_INTERNET_DISCONNECTED|ERR_CONNECTION_REFUSED/.test(x));
for (const x of real) console.error('PROBLEM', x);
console.log(real.length ? `${real.length} problem(s)` : 'e2e passed');
process.exit(real.length ? 1 : 0);
