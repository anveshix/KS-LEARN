// Panchakosha wellbeing screens: a five-petal wheel of layers, a live screen-time bar,
// and a break that is actually done rather than dismissed. The breathing circle is driven
// by one clock, so the animation, the countdown and the reward all agree.
import { L } from '../core/i18n.js';
import {
  PANCHAKOSHA, KOSHA_IDS, koshaById, BREATH_PHASES, BREATH_CYCLES, BREATH_TOTAL_MS,
  LIMIT_CHOICES, summary, ensureWellbeing, tick, setLimit, noteBreak, noteLayer, clock,
} from '../core/wellbeing.js';
import { trapFocus } from './dialog.js';

const B = {
  title: L('The five layers', 'पाँच परतें'),
  backGrow: L('Grow', 'बढ़ो'),
  intro: L('Panchakosha is an old way of looking at a person: a body, a breath, a mind, a way of understanding, and a layer of joy underneath. Tap a layer to take that kind of pause. None of this is a score.', 'पंचकोश व्यक्ति को देखने का एक पुराना तरीका है: शरीर, साँस, मन, समझ, और उसके नीचे आनंद की परत। किसी परत को दबाओ और वैसा विराम लो। यह कोई अंक नहीं है।'),
  wheel: L('Five layers around you. Choose one.', 'तुम्हारे चारों ओर पाँच परतें। एक चुनो।'),
  you: L('You', 'तुम'),
  takeBreak: L('Take a pause', 'विराम लो'),
  breatheNow: L('Breathe with me', 'मेरे साथ साँस लो'),
  moveNow: L('Move a little', 'थोड़ा हिलो'),
  rhythm: L('Today on this device', 'आज इस डिवाइस पर'),
  used: L('of active use', 'सक्रिय उपयोग'),
  left: L('until a pause', 'विराम तक'),
  due: L('Time for a pause. Your eyes and your back will thank you.', 'विराम का समय। आँखें और पीठ दोनों कहेंगी — धन्यवाद।'),
  fine: L('Nothing to do. The pause is just a habit, not a rule.', 'कुछ करना ज़रूरी नहीं। विराम एक आदत है, नियम नहीं।'),
  breaksToday: L('pauses today', 'आज के विराम'),
  breaksAll: L('pauses altogether', 'कुल विराम'),
  pauseDue: L('A pause is due', 'विराम का समय'),
  pauseBody: L('You have been learning with your eyes close to a screen. Nothing is wrong, and nothing is lost. A short pause resets the timer and gives your attention somewhere to land.', 'तुम कुछ देर से स्क्रीन के पास आँखें रखकर सीख रहे हो। कुछ गलत नहीं हुआ, कुछ खोया नहीं। छोटा विराम समय को फिर से शुरू करता है और ध्यान को आराम देता है।'),
  later: L('A little later', 'थोड़ी देर बाद'),
  laterNote: L('I will ask again after a while. Keep going.', 'कुछ देर बाद फिर पूछूँगा। पढ़ते रहो।'),
  breatheTitle: L('Four in, two hold, six out', 'चार लो, दो रोको, छह छोड़ो'),
  breatheHint: L('Let the circle lead. Breathe in as it grows, hold while it waits, and breathe out as it shrinks. Three rounds.', 'गोले को चलने दो। बढ़ने पर साँस लो, रुकने पर रोको, छोटे होने पर छोड़ो। तीन चक्कर।'),
  in: L('Breathe in', 'साँस लो'),
  hold: L('Hold', 'रोको'),
  out: L('Breathe out', 'साँस छोड़ो'),
  stop: L('Stop for now', 'अभी रोक दो'),
  round: L('round', 'चक्कर'),
  breatheDone: L('Three rounds. Your breath is a little slower.', 'तीन चक्कर। साँस थोड़ी धीमी हो गई।'),
  moveTitle: L('Move, stretch, drink', 'हिलो, खिंचो, पानी पियो'),
  moveHint: L('Tick each one as you do it. It takes about a minute, and it is not exercise — just coming back to your body.', 'जो करो, उस पर निशान लगाओ। लगभग एक मिनट, यह व्यायाम नहीं — बस शरीर में लौटना है।'),
  moveDone: L('My body moved', 'मेरा शरीर हिला'),
  didAll: L('Tick all three first.', 'पहले तीनों पर निशान लगाओ।'),
  paused: L('You paused.', 'तुमने विराम लिया।'),
  feelNow: L('How does your body feel now?', 'अभी शरीर को कैसा लग रहा है?'),
  lighter: L('Lighter', 'हल्का'), same: L('About the same', 'लगभग वैसा ही'), heavy: L('Still heavy', 'अभी भी भारी'),
  lighterSay: L('Good. Carry that into the next question.', 'अच्छा। इसे अगले प्रश्न में साथ ले चलो।'),
  sameSay: L('That is honest. One pause does not have to change everything.', 'यह सच्चाई है। एक विराम से सब कुछ बदलना ज़रूरी नहीं।'),
  heavySay: L('Thank you for noticing. Tell a grown-up you trust if it stays heavy; that is what they are for.', 'ध्यान देने के लिए धन्यवाद। अगर भारीपन रहे तो किसी भरोसेमंद बड़े को बताओ; वे इसी के लिए हैं।'),
  back: L('Back to it', 'फिर से शुरू'),
  timerNote: L('The timer counts only active use, and a long gap counts as rest. There is no punishment for stopping or for coming back after days away.', 'समय केवल सक्रिय उपयोग गिनता है, और लंबा अंतराल आराम माना जाता है। रुकने या कई दिन बाद लौटने पर कोई दंड नहीं।'),
  layerVisited: L('You spent a moment with this layer', 'तुमने इस परत के साथ थोड़ा समय बिताया'),
  chooseFeeling: L('Name it, and it gets a little smaller.', 'नाम दो, और यह थोड़ा छोटा हो जाता है।'),
  thinkNote: L('There is no correct answer here, and nobody is marking it. Noticing what you value is the whole point.', 'यहाँ कोई सही उत्तर नहीं, कोई अंक नहीं दे रहा। यह देखना ही पूरी बात है कि तुम्हें क्या महत्वपूर्ण लगता है।'),
  sparkNote: L('Hold it for one breath before you go back.', 'वापस जाने से पहले एक साँस तक इसे मन में रखो।'),
  joyReply: L('That is a real good thing. It still counts on a hard day.', 'यह सच में अच्छी बात है। कठिन दिन में भी यह गिनी जाती है।'),
  wheelHint: L('Tap the small circles.', 'छोटे गोलों को दबाओ।'),
  growCard: L('Calm and pause', 'शांत और विराम'),
  growLine: L('Five kinds of pause, a gentle timer, and a breathing circle.', 'पाँच तरह के विराम, एक सौम्य समय, और साँस का गोला'),
  open: L('Open the five layers', 'पाँच परतें खोलो'),
  parentTitle: L('Daily rhythm', 'दैनिक लय'),
  parentLine: L('This is a nudge, not a lock. The child can always keep learning; the timer only asks for a pause and then starts again. Changing it is behind your PIN, as with everything on this page.', 'यह टोकना है, ताला नहीं। बच्चा कभी भी सीखता रह सकता है; समय केवल विराम माँगता है और फिर फिर से शुरू होता है। इसे बदलना आपके पिन के पीछे है, इस पृष्ठ की बाकी चीज़ों की तरह।'),
  parentLimit: L('Pause after', 'विराम इसके बाद'),
  minutes: L('minutes', 'मिनट'),
  parentToday: L('active minutes today', 'आज सक्रिय मिनट'),
  parentBreaks: L('pauses taken', 'लिए गए विराम'),
  parentLayers: L('layer moments', 'परत के क्षण'),
  set: L('Set', 'सेट'),
  saved: L('Rhythm saved.', 'लय सहेज ली।'),
};

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = n => String(n).padStart(2, '0');

export function createWellbeingUI(ctx) {
  const { getState, h, mount, go, header, nav, persist, toast, today, u, t, settleNow, celebrate } = ctx;
  let refreshTimer = null, sheet = null, breath = null, lastAsk = 0, visitNoted = new Set(), panelLayer = 'prana';

  let releaseSheet = () => {};
  function clearSheet() {
    if (breath) { try { breath(); } catch { /* already stopped */ } breath = null; }
    releaseSheet(); releaseSheet = () => {};
    if (sheet) { sheet.remove(); sheet = null; }
  }
  function stop() {
    clearInterval(refreshTimer); refreshTimer = null;
    visitNoted = new Set();
    clearSheet();
  }

  const state = () => getState();
  const nowMs = () => Date.now();
  function ensureDay() {
    const st = state(), before = st.wellbeing && st.wellbeing.day;
    const w = ensureWellbeing(st, today());
    if (before !== w.day) persist();
    return w;
  }

  // ---------- the live bar ----------
  function barWith(sm) {
    const pct = Math.min(100, Math.round((sm.activeMs / sm.limitMs) * 100));
    return h('div', { class: 'wb-bar' + (sm.due ? ' due' : ''), role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': u(B.used) },
      h('i', { style: `width:${pct}%` }),
      h('span', { class: 'wb-bar-n' }, u(B.used)));
  }

  function rhythmCard() {
    const sm = summary(state());
    const usedMin = Math.round(sm.activeMs / 60000);
    const line = h('p', { class: sm.due ? 'wb-due-line' : 'muted small' }, u(sm.due ? B.due : B.fine));
    const left = h('b', { class: 'wb-left' }, sm.due ? u(B.due) : `${clock(sm.remainingMs)} ${u(B.left)}`);
    const card = h('section', { class: 'card wb-rhythm' },
      h('div', { class: 'eyebrow' }, `⏳ ${u(B.rhythm)}`),
      h('div', { class: 'wb-clock-row' }, left, h('span', { class: 'muted small' }, `${usedMin} ${u(B.minutes)} ${u(B.used)}`)),
      barWith(sm),
      h('div', { class: 'wb-counts' },
        h('span', {}, h('b', {}, String(sm.breaksToday)), ` ${u(B.breaksToday)}`),
        h('span', {}, h('b', {}, String(sm.breaks)), ` ${u(B.breaksAll)}`)),
      line,
      h('div', { class: 'actions wrap-row' },
        h('button', { class: 'btn primary', onclick: () => openBreak('prana') }, `🌬️ ${u(B.breatheNow)}`),
        h('button', { class: 'btn ghost', onclick: () => openBreak('anna') }, `🌿 ${u(B.moveNow)}`)),
      h('p', { class: 'muted small wb-timer-note' }, u(B.timerNote)));
    return { card, update: () => {
      const s = summary(state()), p = Math.min(100, Math.round((s.activeMs / s.limitMs) * 100));
      const bar = card.querySelector('.wb-bar');
      if (bar) { bar.classList.toggle('due', s.due); bar.setAttribute('aria-valuenow', String(p)); const fill = bar.querySelector('i'); if (fill) fill.style.width = p + '%'; }
      left.textContent = s.due ? u(B.due) : `${clock(s.remainingMs)} ${u(B.left)}`;
      line.textContent = u(s.due ? B.due : B.fine);
      line.className = s.due ? 'wb-due-line' : 'muted small';
      const nums = card.querySelectorAll('.wb-counts b');
      if (nums[0]) nums[0].textContent = String(s.breaksToday);
      if (nums[1]) nums[1].textContent = String(s.breaks);
    } };
  }

  // ---------- the wheel ----------
  function wheel(onPick) {
    const st = state(), w = ensureDay();
    const stage = h('div', { class: 'wb-wheel', role: 'group', 'aria-label': u(B.wheel) });
    const hub = h('div', { class: 'wb-hub', 'aria-hidden': 'true' }, h('span', {}, '🧘'), h('small', {}, u(B.you)));
    stage.append(hub);
    KOSHA_IDS.forEach((id, i) => {
      const k = koshaById(id), angle = (-90 + i * 72) * Math.PI / 180;
      const x = 50 + Math.cos(angle) * 37, y = 50 + Math.sin(angle) * 37;
      const n = (w.layers[id] || 0);
      const btn = h('button', {
        class: 'wb-node' + (id === panelLayer ? ' on' : ''), type: 'button',
        style: `left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;--kosha:${k.color}`,
        'aria-label': `${t(k.name)} — ${t(k.sanskrit)}`,
        onclick: () => { panelLayer = id; stage.querySelectorAll('.wb-node').forEach(b => b.classList.toggle('on', b === btn)); onPick(id); },
      }, h('span', { class: 'wb-node-ico', 'aria-hidden': 'true' }, k.icon), h('span', { class: 'wb-node-n' }, t(k.name)));
      if (n) n > 0 && btn.append(h('span', { class: 'wb-node-dot', title: `${n} ×` }, String(n)));
      stage.append(btn);
    });
    return stage;
  }

  // ---------- one layer's pause ----------
  function layerPanel(id, refresh) {
    const k = koshaById(id) || koshaById('prana');
    const box = h('section', { class: 'card wb-panel', 'aria-live': 'polite', style: `--kosha:${k.color}` });
    const visited = () => {
      if (visitNoted.has(id)) return;
      visitNoted.add(id);
      noteLayer(state(), id, { day: today() });
      persist();
      refresh && refresh();
    };
    const head = h('div', { class: 'wb-panel-head' },
      h('span', { class: 'wb-panel-ico', 'aria-hidden': 'true', style: `--kosha:${k.color}` }, k.icon),
      h('div', {}, h('div', { class: 'eyebrow' }, t(k.sanskrit)), h('h2', {}, t(k.name))));
    const prompt = h('p', { class: 'wb-prompt' }, h('b', {}, '“'), t(k.prompt), h('b', {}, '”'));
    box.append(head, h('p', { class: 'muted' }, t(k.line)), prompt);

    if (id === 'anna') {
      const steps = k.steps.map((s, i) => h('button', { class: 'wb-step', type: 'button', 'aria-pressed': 'false' },
        h('span', { class: 'wb-step-n' }, String(i + 1)), h('span', {}, t(s))));
      const goBtn = h('button', { class: 'btn primary', disabled: true, onclick: () => {
        noteBreak(state(), { day: today(), layer: 'anna' });
        persist();
        const r = settleNow();
        if (r.badges.length || r.levelUp) celebrate(r);
        const after = afterNodes();
        box.replaceChildren(...after.nodes,
          h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: () => viewWellbeing() }, u(B.back))));
      } }, u(B.moveDone));
      const sync = () => {
        const done = [...steps].filter(b => b.getAttribute('aria-pressed') === 'true').length;
        goBtn.disabled = done < steps.length;
        goBtn.textContent = done < steps.length ? u(B.didAll) : u(B.moveDone);
      };
      steps.forEach(b => b.addEventListener('click', () => {
        b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        b.classList.toggle('on');
        if (b.getAttribute('aria-pressed') === 'true') visited();
        sync();
      }));
      box.append(h('div', { class: 'wb-steps' }, steps), sync === null ? null : h('p', { class: 'muted small' }, u(B.moveHint)), h('div', { class: 'actions' }, goBtn));
    }

    if (id === 'prana') {
      box.append(
        h('p', { class: 'small wb-breath-note' }, u(B.breatheHint)),
        h('div', { class: 'actions' }, h('button', { class: 'btn primary big', onclick: () => { visited(); openBreak('prana'); } }, `🌬️ ${u(B.breatheNow)}`)));
    }

    if (id === 'mano') {
      const reply = h('p', { class: 'wb-reply', 'aria-live': 'polite' }, u(B.chooseFeeling));
      const row = h('div', { class: 'wb-chips' }, k.feelings.map(f => h('button', {
        class: 'wb-chip', type: 'button', onclick: ev => {
          row.querySelectorAll('.wb-chip').forEach(b => b.classList.remove('on'));
          ev.currentTarget.classList.add('on');
          reply.textContent = t(f.reply);
          visited();
        },
      }, h('span', { 'aria-hidden': 'true' }, f.icon), ' ', t(f.label))));
      box.append(row, reply);
    }

    if (id === 'vijnana') {
      const reply = h('p', { class: 'wb-reply', 'aria-live': 'polite' }, u(B.thinkNote));
      const list = h('div', { class: 'wb-options' }, k.options.map(o => h('button', {
        class: 'wb-option', type: 'button', onclick: ev => {
          list.querySelectorAll('.wb-option').forEach(b => b.classList.remove('on'));
          ev.currentTarget.classList.add('on');
          reply.textContent = u(B.layerVisited);
          visited();
        },
      }, t(o))));
      box.append(list, reply);
    }

    if (id === 'ananda') {
      const reply = h('p', { class: 'wb-reply', 'aria-live': 'polite' }, u(B.sparkNote));
      const row = h('div', { class: 'wb-chips' }, k.sparks.map(s => h('button', {
        class: 'wb-chip', type: 'button', onclick: ev => {
          row.querySelectorAll('.wb-chip').forEach(b => b.classList.remove('on'));
          ev.currentTarget.classList.add('on');
          reply.textContent = u(B.joyReply);
          visited();
        },
      }, t(s))));
      box.append(row, reply);
    }

    return box;
  }

  // The same reflection is used inline (after a body pause) and inside the break sheet.
  function afterNodes() {
    const reply = h('p', { class: 'wb-reply', 'aria-live': 'polite' }, '');
    const choice = (label, say) => h('button', { class: 'wb-chip', type: 'button', onclick: () => { reply.textContent = say; } }, label);
    return {
      reply,
      nodes: [
        h('div', { class: 'wb-done-ico', 'aria-hidden': 'true' }, '🌿'),
        h('div', { class: 'eyebrow' }, u(B.paused)),
        h('h2', {}, u(B.feelNow)),
        h('div', { class: 'wb-chips' },
          choice(u(B.lighter), u(B.lighterSay)), choice(u(B.same), u(B.sameSay)), choice(u(B.heavy), u(B.heavySay))),
        reply,
      ],
    };
  }

  // ---------- break overlay ----------
  function promptBreak() {
    if (sheet) return;
    const sm = summary(state());
    const body = h('section', { class: 'card wb-break-card' },
      h('div', { class: 'eyebrow' }, `⏳ ${u(B.pauseDue)}`),
      h('h2', {}, u(B.due)),
      h('p', {}, u(B.pauseBody)),
      h('div', { class: 'wb-prompt-orb', 'aria-hidden': 'true' }, h('i', {})),
      h('div', { class: 'actions wrap-row' },
        h('button', { class: 'btn primary big', onclick: () => openBreak('prana') }, `🌬️ ${u(B.breatheNow)}`),
        h('button', { class: 'btn', onclick: () => openBreak('anna') }, `🌿 ${u(B.moveNow)}`),
        h('button', { class: 'btn ghost', onclick: () => { close(); toast(u(B.laterNote)); } }, u(B.later))),
      h('p', { class: 'muted small' }, u(B.timerNote)));
    sheet = h('div', { class: 'sheet wb-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': u(B.pauseDue) }, body);
    document.body.append(sheet);
    releaseSheet = trapFocus(sheet, { onClose: () => close(), initial: body.querySelector('.btn.primary') });
  }

  function close() { clearSheet(); }

  function showAfter() {
    if (!sheet) return;
    const body = sheet.querySelector('.wb-break-card');
    if (!body) return;
    const after = afterNodes();
    body.replaceChildren(...after.nodes,
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: () => { close(); renderIfHere(); } }, u(B.back))));
  }

  function renderIfHere() {
    const r = (location.hash || '#home').slice(1);
    if (r === 'wellbeing') viewWellbeing();
    else if (r === 'quests') go('quests'); // same route, fresh render: the calm ring may have filled
  }

  function openBreak(mode) {
    clearSheet();
    const breathing = mode !== 'anna';
    const card = h('section', { class: 'card wb-break-card' });
    if (breathing) {
      const orb = h('div', { class: 'wb-orb' + (reducedMotion() ? ' still' : ''), 'aria-hidden': 'true' }, h('i', {}), h('b', { class: 'wb-orb-n' }, '4'));
      const phase = h('div', { class: 'wb-phase', 'aria-live': 'polite' }, u(B.in));
      const dots = h('div', { class: 'wb-dots' }, Array.from({ length: BREATH_CYCLES }, () => h('i', {})));
      const stopBtn = h('button', { class: 'btn ghost', onclick: () => { close(); renderIfHere(); } }, u(B.stop));
      card.append(
        h('div', { class: 'eyebrow' }, `🌬️ ${u(B.breatheTitle)}`),
        h('p', { class: 'muted small' }, u(B.breatheHint)),
        h('div', { class: 'wb-orb-stage' }, orb, h('div', { class: 'wb-orb-caption' }, phase)),
        dots, h('div', { class: 'actions' }, stopBtn));
      sheet = h('div', { class: 'sheet wb-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': u(B.breatheTitle) }, card);
      document.body.append(sheet);
      releaseSheet = trapFocus(sheet, { onClose: () => { close(); renderIfHere(); }, initial: card.querySelector('.btn') });
      startBreath(orb, phase, dots);
    } else {
      const steps = koshaById('anna').steps.map((s, i) => h('button', { class: 'wb-step', type: 'button', 'aria-pressed': 'false' },
        h('span', { class: 'wb-step-n' }, String(i + 1)), h('span', {}, t(s))));
      const goBtn = h('button', { class: 'btn primary big', disabled: true }, u(B.moveDone));
      steps.forEach(b => b.addEventListener('click', () => {
        b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        b.classList.toggle('on');
        goBtn.disabled = steps.filter(x => x.getAttribute('aria-pressed') === 'true').length < steps.length;
      }));
      goBtn.addEventListener('click', () => {
        noteBreak(state(), { day: today(), layer: 'anna' });
        persist();
        const r = settleNow();
        if (r.badges.length || r.levelUp) celebrate(r);
        showAfter();
      });
      card.append(
        h('div', { class: 'eyebrow' }, `🌿 ${u(B.moveTitle)}`),
        h('p', { class: 'muted small' }, u(B.moveHint)),
        h('div', { class: 'wb-steps' }, steps),
        h('div', { class: 'actions' }, goBtn,
          h('button', { class: 'btn ghost', onclick: () => { close(); renderIfHere(); } }, u(B.stop))));
      sheet = h('div', { class: 'sheet wb-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': u(B.moveTitle) }, card);
      document.body.append(sheet);
      releaseSheet = trapFocus(sheet, { onClose: () => { close(); renderIfHere(); }, initial: steps[0] });
      goBtn.disabled = true;
    }
  }

  // One clock for the animation, the number, the phase text and the end of the break.
  function startBreath(orb, phaseEl, dots) {
    const totalPhase = BREATH_PHASES.reduce((a, p) => a + p.seconds, 0) * 1000;
    const started = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const still = reducedMotion();
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn => setTimeout(fn, 40));
    const caf = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout;
    let id = 0, done = false;

    const paint = () => {
      if (done) return;
      const at = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;
      if (at >= BREATH_TOTAL_MS) { finish(); return; }
      const cycle = Math.floor(at / totalPhase), within = at % totalPhase;
      let phase = 0, local = within;
      if (within >= 6000) { phase = 2; local = within - 6000; }
      else if (within >= 4000) { phase = 1; local = within - 4000; }
      const ms = phase === 0 ? 4000 : phase === 1 ? 2000 : 6000;
      const p = phase === 0 ? local / 4000 : phase === 1 ? 1 : 1 - local / 6000;
      const scale = 0.6 + 0.4 * p;
      if (!still) orb.style.transform = `scale(${scale.toFixed(3)})`;
      orb.classList.toggle('out', phase === 2);
      const left = Math.ceil((ms - local) / 1000);
      const num = orb.querySelector('.wb-orb-n');
      if (num) num.textContent = String(Math.max(1, left));
      phaseEl.textContent = `${u(phase === 0 ? B.in : phase === 1 ? B.hold : B.out)} · ${cycle + 1}/${BREATH_CYCLES}`;
      [...dots.children].forEach((d, i) => d.classList.toggle('on', i < cycle));
      id = raf(paint);
    };

    const finish = () => {
      if (done) return;
      done = true;
      noteBreak(state(), { day: today(), layer: 'prana' });
      persist();
      const r = settleNow();
      showAfter();
      if (r.badges.length || r.levelUp) celebrate(r);
    };

    breath = () => { done = true; caf(id); };
    paint();
  }

  // ---------- page ----------
  function viewWellbeing() {
    stop();
    ensureDay();
    const st = state();
    const pulse = rhythmCard();
    const panelBox = h('div', {});
    const refresh = () => {
      pulse.update();
      const chip = document.querySelector('.wb-visits');
      if (chip) chip.textContent = layerLine();
    };
    const layerLine = () => {
      const w = ensureWellbeing(state(), today());
      const parts = KOSHA_IDS.map(id => `${koshaById(id).icon} ${w.layers[id] || 0}`);
      return `${u(B.parentLayers)}: ${parts.join(' · ')}`;
    };
    const panel = layerPanel(panelLayer, refresh);
    panelBox.append(panel);
    const stage = wheel(id => { panelBox.replaceChildren(layerPanel(id, refresh)); });
    const card = h('section', { class: 'card wb-wheel-card' },
      h('div', { class: 'eyebrow' }, `🪷 ${u(B.title)}`),
      h('p', { class: 'muted small' }, u(B.intro)),
      h('p', { class: 'muted small' }, u(B.wheelHint)),
      stage,
      h('p', { class: 'muted small wb-visits' }, layerLine()));
    const head = h('section', { class: 'card' },
      h('button', { class: 'btn ghost small', onclick: () => go('grow') }, `← ${u(B.backGrow)}`),
      h('h1', {}, `🌱 ${u(B.growCard)}`),
      h('p', {}, u(B.growLine)));
    mount(header(), h('main', { class: 'wrap narrow' }, head, pulse.card, card, panelBox), nav('grow'));
    refreshTimer = setInterval(() => { pulse.update(); }, 1000);
  }

  // ---------- cards used elsewhere ----------
  function homeTile() {
    ensureWellbeing(state(), today());
    const sm = summary(state());
    return h('section', { class: 'card tile b-half wb-tile' },
      h('div', { class: 'eyebrow' }, `🌬️ ${u(B.title)}`),
      h('span', { class: 'big-ico', 'aria-hidden': 'true' }, '🪷'),
      h('div', { class: 'big-n' }, String(sm.breaksToday)),
      h('small', { class: 'muted' }, u(B.breaksToday)),
      h('button', { class: 'btn small', onclick: () => go('wellbeing') }, u(B.open)));
  }

  function growCard() {
    ensureWellbeing(state(), today());
    const sm = summary(state());
    return h('section', { class: 'card grow-card wb-grow' },
      h('div', { class: 'grow-ico', 'aria-hidden': 'true' }, '🪷'),
      h('div', { class: 'grow-body' },
        h('div', { class: 'eyebrow' }, u(B.rhythm)),
        h('h2', {}, u(B.growCard)),
        h('p', { class: 'muted small' }, u(B.growLine)),
        h('small', { class: 'muted' }, `${Math.round(sm.activeMs / 60000)} ${u(B.minutes)} · ${sm.breaksToday} ${u(B.breaksToday)}`)),
      h('button', { class: 'btn', onclick: () => go('wellbeing') }, u(B.open)));
  }

  function parentCard() {
    const st = state(), w = ensureDay(), sm = summary(st);
    const buttons = LIMIT_CHOICES.map(m => h('button', {
      class: 'btn small' + (w.limitMin === m ? ' primary' : ''), 'aria-pressed': w.limitMin === m ? 'true' : 'false',
      onclick: () => {
        setLimit(st, m); persist(); toast(u(B.saved));
        buttons.forEach(b => b.classList.remove('primary'));
        // Re-find this button after the toast; no remount, so the parent stays where they are.
        const idx = LIMIT_CHOICES.indexOf(m);
        if (buttons[idx]) { buttons[idx].classList.add('primary'); buttons[idx].setAttribute('aria-pressed', 'true'); }
        buttons.forEach((b, i) => { if (i !== idx) b.setAttribute('aria-pressed', 'false'); });
      },
    }, `${m} ${u(B.minutes)}`));
    const layerLine = KOSHA_IDS.map(id => `${koshaById(id).icon} ${w.layers[id] || 0}`).join(' · ');
    return h('section', { class: 'card wb-parent' },
      h('div', { class: 'eyebrow' }, `⏳ ${u(B.parentTitle)}`),
      h('p', { class: 'muted small' }, u(B.parentLine)),
      h('div', { class: 'wb-parent-stats' },
        h('div', {}, h('b', {}, String(Math.round(sm.activeMs / 60000))), h('small', {}, u(B.parentToday))),
        h('div', {}, h('b', {}, String(sm.breaksToday)), h('small', {}, u(B.parentBreaks))),
        h('div', {}, h('b', {}, String(sm.breaks)), h('small', {}, u(B.breaksAll)))),
      h('div', { class: 'wb-limit' }, h('span', {}, `${u(B.parentLimit)}:`), h('div', { class: 'actions wrap-row' }, buttons)),
      h('p', { class: 'muted small' }, `${u(B.parentLayers)}: ${layerLine}`));
  }

  // ---------- heartbeat ----------
  // The app calls this on a slow interval. Only child screens count, and only while the
  // page is visible; a hidden tab is rest, not screen time.
  function beat(active) {
    const st = state();
    if (!st.profile) return;
    const sm = tick(st, { day: today(), now: nowMs(), active: !!active && !document.hidden });
    if (active && sm.due && !sheet && nowMs() - lastAsk > 120000) { lastAsk = nowMs(); promptBreak(); }
  }

  return { viewWellbeing, stop, beat, openBreak, homeTile, growCard, parentCard, summary: () => summary(state()) };
}
