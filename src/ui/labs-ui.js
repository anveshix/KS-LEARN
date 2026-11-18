// Curiosity Labs screens: a shelf of labs, then one lab with a 3D stage, its controls and
// three questions. Everything is local, and the screen tears down cleanly when the route
// changes (no animation loop left running behind another page).
import { L } from '../core/i18n.js';
import { LABS } from '../content/labs.js';
import { labById, labsFor, checkLabStep, markSeen, markDone, noteLabTry, labProgress, labSummary, LAB_STARS } from '../core/labs.js';
import { buildScene } from './labs-scenes.js';
import { createRenderer, clamp } from './gl.js';

const LABEL = {
  title: L('Curiosity Labs', 'जिज्ञासा लैब'),
  intro: L('Turn a shape, warm a pond, spin the Earth and open a plant. These are small models built on this device — nothing is downloaded and nothing is sent anywhere.',
    'आकार घुमाओ, तालाब गरम करो, पृथ्वी घुमाओ और पौधा खोलो। ये छोटे मॉडल इसी डिवाइस पर बने हैं — कुछ डाउनलोड नहीं होता और कहीं भेजा नहीं जाता।'),
  open: L('Open lab', 'लैब खोलो'),
  again: L('Open again', 'फिर खोलो'),
  newLab: L('New', 'नया'),
  started: L('Started', 'शुरू किया'),
  explored: L('Explored', 'देख लिया'),
  back: L('All labs', 'सभी लैब'),
  notice: L('What to notice', 'क्या देखना है'),
  question: L('Question', 'प्रश्न'),
  of: L('of', 'में से'),
  next: L('Next question', 'अगला प्रश्न'),
  finish: L('Finish lab', 'लैब पूरी करो'),
  retry: L('Try again', 'फिर कोशिश करो'),
  tryAgain: L('Look again, then choose another answer.', 'फिर देखो, फिर दूसरा उत्तर चुनो।'),
  correct: L('Yes!', 'हाँ!'),
  complete: L('Lab explored', 'लैब देख ली'),
  completeNote: L('You looked closely, tried your ideas and finished all three questions. Come back any time; the model will be here.',
    'तुमने ध्यान से देखा, अपने विचार आज़माए और तीनों प्रश्न पूरे किए। जब चाहो लौट आना; मॉडल यहीं रहेगा।'),
  firstStars: L('First time: +3 stars', 'पहली बार: +3 सितारे'),
  practise: L('Practise this skill', 'यह कौशल अभ्यास करो'),
  fallback: L('This device cannot draw the 3D view, but the model still works: use the controls and answer from what you can see and read.',
    'यह डिवाइस 3D दृश्य नहीं बना सकता, पर मॉडल फिर भी काम करता है: बटन चलाओ और जो दिखे व पढ़ो उससे उत्तर दो।'),
  rotateHint: L('Drag, or use the arrow keys, to turn the model. Pinch or +/- to zoom.',
    'मॉडल घुमाने के लिए खींचो या तीर कुंजियाँ दबाओ। ज़ूम के लिए पिंच या +/- दबाओ।'),
  stars: L('star', 'सितारा'),
  doneLine: L('labs explored', 'लैब देखी'),
};

const MODEL_DEFAULT = { shapes: { shape: 'cube' }, water: { heat: 0.4 }, earth: { hour: 12 }, plant: { part: 'none' } };
const VIEW = {
  shapes: { radius: 6.6, target: [0, 1.0, 0], phi: 1.03 },
  water: { radius: 7.8, target: [0, 1.2, 0], phi: 1.05 },
  earth: { radius: 8.4, target: [0, 1.0, 0], phi: 1.1 },
  plant: { radius: 7.2, target: [0, 1.5, 0], phi: 1.0 },
};
const SHAPE_NAME = {
  cube: L('Cube', 'घन'), cuboid: L('Cuboid', 'घनाभ'), cylinder: L('Cylinder', 'बेलन'),
  cone: L('Cone', 'शंकु'), sphere: L('Sphere', 'गोला'),
};
const PLANT_PART = {
  none: L('Whole plant', 'पूरा पौधा'), leaf: L('Leaf', 'पत्ती'), stem: L('Stem', 'तना'),
  flower: L('Flower', 'फूल'), root: L('Roots', 'जड़ें'),
};

export function createLabsUI(ctx) {
  const { getState, h, mount, go, header, nav, persist, toast, confetti, today, t, u, currentClass, startSkill } = ctx;
  let cleanup = null;

  function stopLab() {
    if (!cleanup) return;
    const fn = cleanup; cleanup = null;
    try { fn(); } catch { /* the view is going away anyway */ }
  }

  function shelfCard(lab) {
    const prog = labProgress(getState(), lab.id);
    const status = prog.done ? LABEL.explored : prog.seen ? LABEL.started : LABEL.newLab;
    return h('section', { class: `card lab-card${prog.done ? ' done' : ''}` },
      h('div', { class: 'lab-ico', 'aria-hidden': 'true' }, lab.icon),
      h('div', { class: 'lab-body' },
        h('div', { class: 'eyebrow' }, `${u(L('Class', 'कक्षा'))} ${lab.grade} · ${u(status)}`),
        h('h2', {}, t(lab.title)),
        h('p', { class: 'muted small' }, t(lab.blurb))),
      h('button', { class: 'btn primary', onclick: () => go('labs/' + lab.id) }, u(prog.done ? LABEL.again : LABEL.open)));
  }

  function viewLabs() {
    stopLab();
    const state = getState();
    const labs = labsFor(currentClass());
    const sum = labSummary(state, LABS);
    const intro = h('section', { class: 'card' },
      h('h1', {}, u(LABEL.title)),
      h('p', {}, u(LABEL.intro)),
      h('p', { class: 'muted small' }, `${sum.done}/${sum.total} ${u(LABEL.doneLine)} · ${u(L('Runs offline on this device', 'इसी डिवाइस पर ऑफ़लाइन चलता है'))}`));
    mount(header(), h('main', { class: 'wrap' }, intro, h('div', { class: 'labs-grid' }, labs.map(shelfCard))), nav('labs'));
  }

  function viewLab(id) {
    stopLab();
    const lab = labById(id);
    if (!lab) { go('labs'); return; }
    const state = getState();
    const day = today();
    markSeen(state, lab.id, day); persist();
    const model = { ...(MODEL_DEFAULT[lab.scene] || {}) };
    const view = { ...(VIEW[lab.scene] || VIEW.shapes), theta: 0.82, radius: (VIEW[lab.scene] || VIEW.shapes).radius, phi: (VIEW[lab.scene] || VIEW.shapes).phi };
    const motionOK = !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    let auto = motionOK;

    const canvas = h('canvas', { class: 'lab-canvas', role: 'img', 'aria-label': t(lab.alt), tabindex: '0' });
    const fallback = h('p', { class: 'lab-fallback muted small', hidden: true }, u(LABEL.fallback));
    const stage = h('div', { class: 'lab-stage' }, canvas, h('div', { class: 'lab-badge', 'aria-hidden': 'true' }, lab.icon));
    const controls = h('div', { class: 'lab-controls' });
    const stepsBox = h('section', { class: 'card lab-steps', 'aria-live': 'polite' });
    const controlCard = h('section', { class: 'card' }, h('div', { class: 'eyebrow' }, u(lab.control)), controls, h('p', { class: 'muted small lab-nudge' }, u(LABEL.rotateHint)));
    const head = h('section', { class: 'card' },
      h('button', { class: 'btn ghost small', onclick: () => go('labs') }, `← ${u(LABEL.back)}`),
      h('h1', {}, t(lab.title)),
      h('p', {}, t(lab.blurb)),
      h('p', { class: 'lab-notice' }, h('b', {}, `${u(LABEL.notice)}: `), t(lab.notice)));
    mount(header(), h('main', { class: 'wrap narrow' }, head, stage, fallback, controlCard, stepsBox), nav('labs'));

    let renderer = null;
    try { renderer = createRenderer(canvas); } catch { renderer = null; }
    if (!renderer) { fallback.hidden = false; stage.classList.add('no3d'); }
    let scene = buildScene(lab.scene, model);
    renderer && renderer.setScene(scene);

    const dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    function fit() {
      const width = Math.max(280, Math.min(720, Math.round((stage.clientWidth || 640))));
      canvas.width = Math.round(width * dpr * (renderer && renderer.mode === 'canvas2d' ? 0.8 : 1));
      canvas.height = Math.round(width * 0.75 * dpr * (renderer && renderer.mode === 'canvas2d' ? 0.8 : 1));
      renderer && renderer.resize();
      draw(performance.now());
    }
    function rebuild() {
      scene = buildScene(lab.scene, model);
      renderer && renderer.setScene(scene);
      draw(performance.now());
    }
    function draw(ts) {
      if (!renderer) return;
      try { renderer.draw({ theta: view.theta, phi: view.phi, radius: view.radius, target: view.target }, motionOK ? ts / 1000 : 0, dpr); } catch { /* keep the screen usable */ }
    }

    // ---------- controls ----------
    const chip = (label, on, fn) => {
      const b = h('button', { class: 'btn small' + (on ? ' primary' : ''), type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick: fn }, u(label));
      return b;
    };
    function paintControls() {
      controls.replaceChildren();
      if (lab.scene === 'shapes') {
        for (const key of Object.keys(SHAPE_NAME)) {
          controls.append(chip(SHAPE_NAME[key], model.shape === key, () => { model.shape = key; paintControls(); rebuild(); }));
        }
        controls.append(h('span', { class: 'muted small' }, u(L('Drag the shape to see its faces', 'फलक देखने के लिए आकार घुमाओ'))));
      } else if (lab.scene === 'water') {
        const out = h('output', { class: 'lab-out' }, `${Math.round(model.heat * 100)}%`);
        const range = h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(model.heat * 100)), 'aria-label': u(lab.control) });
        range.addEventListener('input', () => { model.heat = +range.value / 100; out.textContent = `${range.value}%`; rebuild(); });
        controls.append(h('div', { class: 'lab-range' }, range, out));
      } else if (lab.scene === 'earth') {
        const out = h('output', { class: 'lab-out' }, clock(model.hour));
        const range = h('input', { type: 'range', min: '0', max: '24', step: '0.5', value: String(model.hour), 'aria-label': u(lab.control) });
        range.addEventListener('input', () => { model.hour = +range.value; out.textContent = clock(model.hour); rebuild(); });
        controls.append(h('div', { class: 'lab-range' }, range, out));
      } else {
        for (const key of Object.keys(PLANT_PART)) {
          controls.append(chip(PLANT_PART[key], model.part === key, () => { model.part = key; paintControls(); rebuild(); }));
        }
      }
    }
    paintControls();

    // ---------- turn and zoom ----------
    let drag = null;
    const onDown = e => {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      auto = false;
      try { canvas.setPointerCapture(e.pointerId); } catch { /* older browsers */ }
    };
    const onMove = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      view.theta -= dx * 0.008;
      view.phi = clamp(view.phi + dy * 0.006, 0.25, 1.45);
      draw(performance.now());
    };
    const onUp = e => { if (drag && e.pointerId === drag.id) drag = null; };
    const onWheel = e => { e.preventDefault(); view.radius = clamp(view.radius + Math.sign(e.deltaY) * 0.5, 4.2, 14); draw(performance.now()); };
    const onKey = e => {
      const step = 0.12;
      if (e.key === 'ArrowLeft') { view.theta += step; auto = false; draw(performance.now()); e.preventDefault(); }
      if (e.key === 'ArrowRight') { view.theta -= step; auto = false; draw(performance.now()); e.preventDefault(); }
      if (e.key === 'ArrowUp') { view.phi = clamp(view.phi - step, 0.25, 1.45); draw(performance.now()); e.preventDefault(); }
      if (e.key === 'ArrowDown') { view.phi = clamp(view.phi + step, 0.25, 1.45); draw(performance.now()); e.preventDefault(); }
      if (e.key === '+' || e.key === '=') { view.radius = clamp(view.radius - 0.6, 4.2, 14); draw(performance.now()); e.preventDefault(); }
      if (e.key === '-' || e.key === '_') { view.radius = clamp(view.radius + 0.6, 4.2, 14); draw(performance.now()); e.preventDefault(); }
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('keydown', onKey);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', fit);

    // ---------- questions ----------
    let stepIndex = 0;
    function renderStep() {
      stepsBox.replaceChildren();
      if (stepIndex >= lab.steps.length) return finishLab();
      const step = lab.steps[stepIndex];
      const fb = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
      const actions = h('div', { class: 'actions' });
      const opts = h('div', { class: 'options' });
      let solved = false;
      step.options.forEach((opt, i) => {
        const b = h('button', { class: 'opt', type: 'button', onclick: () => choose(i) }, h('span', { class: 'key' }, 'ABCDE'[i]), h('span', {}, t(opt)));
        opts.append(b);
      });
      function choose(i) {
        if (solved) return;
        const res = checkLabStep(lab, stepIndex, i);
        if (!res.valid) return;
        const buttons = [...opts.querySelectorAll('.opt')];
        if (res.ok) {
          solved = true;
          buttons.forEach((b, k) => { b.disabled = true; if (k === i) b.classList.add('right'); });
          fb.className = 'feedback good';
          fb.replaceChildren(h('p', { class: 'verdict' }, `✅ ${u(LABEL.correct)}`), h('p', {}, t(step.why)));
          actions.replaceChildren(h('button', { class: 'btn primary big', onclick: () => { stepIndex++; renderStep(); } }, u(stepIndex + 1 >= lab.steps.length ? LABEL.finish : LABEL.next)));
        } else {
          noteLabTry(getState(), lab.id); persist();
          buttons[i].classList.add('miss');
          fb.className = 'feedback try';
          fb.replaceChildren(h('p', { class: 'verdict' }, `🤔 ${u(LABEL.tryAgain)}`), h('p', { class: 'hint' }, t(res.hint)));
        }
      }
      stepsBox.append(
        h('div', { class: 'eyebrow' }, `${u(LABEL.question)} ${stepIndex + 1} ${u(LABEL.of)} ${lab.steps.length}`),
        h('h2', {}, t(step.q)), opts, fb, actions);
      opts.querySelector('.opt')?.focus({ preventScroll: true });
    }

    function finishLab() {
      const first = markDone(getState(), lab.id, today());
      if (first) { getState().stars = (getState().stars || 0) + LAB_STARS; }
      persist();
      if (first) { confetti(30); toast(`+${LAB_STARS} ⭐`); }
      stepsBox.replaceChildren(
        h('div', { class: 'eyebrow' }, u(LABEL.complete)),
        h('h2', {}, t(lab.title)),
        h('p', {}, u(LABEL.completeNote)),
        first && h('p', { class: 'badge-line' }, h('span', { class: 'star-pop' }, `+${LAB_STARS} ⭐`), ' ', u(LABEL.firstStars)),
        h('div', { class: 'actions' },
          h('button', { class: 'btn primary', onclick: () => go('labs') }, u(LABEL.back)),
          lab.skill && h('button', { class: 'btn', onclick: () => startSkill(lab.skill) }, u(LABEL.practise))));
    }
    renderStep();

    // ---------- animation loop ----------
    let raf = 0, last = 0;
    const t0 = performance.now();
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (ts - last < 33) return;              // ~30 fps is plenty and saves battery
      last = ts;
      if (auto && motionOK && lab.scene === 'shapes') view.theta += 0.006;
      draw(ts);
    }
    fit();
    if (renderer) raf = requestAnimationFrame(frame);

    cleanup = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', fit);
      renderer && renderer.dispose && renderer.dispose();
      renderer = null;
    };
  }

  return { viewLabs, viewLab, stopLab };
}

function clock(hour) {
  const h24 = ((hour % 24) + 24) % 24;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(Math.floor(h12)).padStart(2, '0')}:${h24 % 1 ? '30' : '00'} ${h24 < 12 ? 'AM' : 'PM'}`;
}
