// Curiosity Labs: content, questions, progress, sanitiser, geometry and the software renderer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, BY_ID } from '../src/content/index.js';
import { LABS, LAB_SCENES, validateLabs, labsFor, labById, checkLabStep, markSeen, markDone, noteLabTry, labProgress, labSummary, LAB_STARS } from '../src/core/labs.js';
import { freshState, sanitize, exportText, importText } from '../src/core/store.js';
import {
  mat4, box, plane, cylinder, cone, sphere, normalMatrix, orbitCamera, projectPoint,
  createRenderer, transform, clamp,
} from '../src/ui/gl.js';
import { buildScene, SHAPE_KEYS } from '../src/ui/labs-scenes.js';
import { makePin } from '../src/core/pin.js';

const profile = () => ({ name: 'Aarav', cls: 4, ay0: 2026, lang: 'bi', dailyQ: 18, off: [], pin: makePin('1234', 'ef'.repeat(16)), created: '2026-11-16' });

test('lab content is complete, bilingual and answerable', () => {
  assert.deepEqual(validateLabs(LABS, BY_ID), []);
  assert.ok(LABS.length >= 4);
  assert.equal(new Set(LABS.map(l => l.id)).size, LABS.length);
  for (const lab of LABS) {
    assert.ok(LAB_SCENES.includes(lab.scene));
    assert.equal(lab.steps.length, 3, `${lab.id} has three questions`);
    assert.ok(lab.grade >= 3 && lab.grade <= 9);
    if (lab.skill) assert.ok(BY_ID[lab.skill], `${lab.id} points at a real skill`);
    for (const step of lab.steps) {
      assert.ok(step.options.length >= 2 && step.options.length <= 4);
      assert.ok(Number.isInteger(step.answer));
      assert.ok(step.hint.en && step.hint.hi && step.why.en && step.why.hi);
    }
  }
  assert.equal(labById('labs.water').scene, 'water');
  assert.equal(labById('nope'), null);
});

test('class selection shows this class and one ahead, never further', () => {
  const cls4 = labsFor(4).map(l => l.id), cls9 = labsFor(9).map(l => l.id);
  assert.ok(cls4.length >= 3);
  assert.ok(labsFor(4).every(l => l.grade <= 5));
  assert.ok(labsFor(3).every(l => l.grade <= 4));
  assert.equal(cls9.length, LABS.length, 'a class 9 learner sees every lab');
  assert.deepEqual(labsFor(4).map(l => l.grade), [...labsFor(4).map(l => l.grade)].sort((a, b) => a - b));
});

test('questions grade strictly and explain without shaming', () => {
  for (const lab of LABS) for (let i = 0; i < lab.steps.length; i++) {
    const step = lab.steps[i];
    const right = checkLabStep(lab, i, step.answer);
    assert.deepEqual({ valid: right.valid, ok: right.ok }, { valid: true, ok: true });
    assert.equal(right.why, step.why);
    for (let k = 0; k < step.options.length; k++) {
      const r = checkLabStep(lab, i, k);
      assert.equal(r.valid, true);
      assert.equal(r.ok, k === step.answer);
      if (k !== step.answer) assert.equal(r.hint, step.hint);
    }
    for (const bad of [-1, 1.5, 'x', null, undefined, {}, step.options.length]) assert.equal(checkLabStep(lab, i, bad).valid, false, `${lab.id} rejects ${String(bad)}`);
  }
  assert.equal(checkLabStep(LABS[0], 99, 0).valid, false);
  assert.equal(checkLabStep(null, 0, 0).valid, false);
});

test('progress: seen once, completed once, tries counted and bounded', () => {
  const st = freshState();
  assert.deepEqual(labProgress(st, 'labs.water'), { seen: null, done: null, tries: 0 });
  markSeen(st, 'labs.water', '2026-11-17');
  markSeen(st, 'labs.water', '2026-11-18');
  assert.equal(labProgress(st, 'labs.water').seen, '2026-11-17', 'first seen date is kept');
  assert.equal(markDone(st, 'labs.water', '2026-11-18'), true);
  assert.equal(markDone(st, 'labs.water', '2026-11-19'), false, 'only the first completion is rewarded');
  assert.equal(labProgress(st, 'labs.water').done, '2026-11-18');
  for (let i = 0; i < 5; i++) noteLabTry(st, 'labs.water');
  assert.equal(labProgress(st, 'labs.water').tries, 5);
  assert.equal(markSeen(st, 'not-a-lab', '2026-11-17'), null);
  assert.equal(markDone(st, 'not-a-lab', '2026-11-17'), false);
  assert.equal(noteLabTry(st, 'not-a-lab'), 0);
  const sum = labSummary(st);
  assert.equal(sum.total, LABS.length); assert.equal(sum.done, 1);
  assert.equal(LAB_STARS, 3);
});

test('the lab record is sanitised on load and survives a backup round trip', () => {
  const raw = freshState(); raw.profile = profile();
  raw.labs = {
    'labs.water': { seen: '2026-11-17', done: '2026-11-17', tries: 2 },
    'labs.unknown': { seen: '2026-11-17', done: '2026-11-17', tries: 9 },
    'evil': { seen: '2026-11-17' },
    'labs.earth': { seen: '<script>', done: 42, tries: -3 },
    'labs.plant': 'nope',
  };
  const st = sanitize(raw);
  assert.deepEqual(Object.keys(st.labs).sort(), ['labs.earth', 'labs.water']);
  assert.deepEqual(st.labs['labs.water'], { tries: 2, seen: '2026-11-17', done: '2026-11-17' });
  assert.deepEqual(st.labs['labs.earth'], { tries: 0 }, 'bad dates are dropped, not repaired into junk');
  const back = importText(exportText(st));
  assert.deepEqual(back.labs, st.labs);
  assert.deepEqual(Object.keys(sanitize({ ...raw, labs: null }).labs), []);
  assert.deepEqual(Object.keys(sanitize({ ...raw, labs: [] }).labs), []);
});

test('every mesh is finite, indexed and correctly normalised', () => {
  const meshes = {
    box: box(2, 1, 3), plane: plane(4, 4), cylinder: cylinder(1, 2, 12),
    cone: cone(1, 2, 12), sphere: sphere(1.25, 10, 14),
  };
  for (const [name, m] of Object.entries(meshes)) {
    assert.ok(m.positions.length > 0 && m.positions.length % 3 === 0, name);
    assert.equal(m.normals.length, m.positions.length, `${name}: a normal per vertex`);
    assert.equal(m.indices.length % 3, 0, `${name}: triangles`);
    assert.ok(m.indices.length >= 6, name);
    const verts = m.positions.length / 3;
    for (const v of m.positions) assert.ok(Number.isFinite(v), `${name}: finite vertex`);
    for (let i = 0; i < m.indices.length; i++) assert.ok(m.indices[i] < verts, `${name}: index in range`);
    for (let i = 0; i < m.normals.length; i += 3) {
      const l = Math.hypot(m.normals[i], m.normals[i + 1], m.normals[i + 2]);
      assert.ok(Math.abs(l - 1) < 1e-4, `${name}: unit normal`);
    }
  }
  assert.deepEqual(SHAPE_KEYS, ['cube', 'cuboid', 'cylinder', 'cone', 'sphere']);
});

test('matrix maths: identity, camera distance, inverse-transpose normals, projection', () => {
  const id = mat4.identity();
  assert.deepEqual(Array.from(mat4.multiply(id, id)), Array.from(id));
  const cam = orbitCamera({ theta: 1, phi: 1.2, radius: 8, target: [0, 1, 0] });
  assert.ok(Math.abs(Math.hypot(cam.eye[0], cam.eye[1] - 1, cam.eye[2]) - 8) < 1e-6);
  assert.equal(clamp(99, 2.2, 24), 24);
  const moved = transform(mat4.translation(2, 3, 4), [1, 1, 1]);
  assert.deepEqual(moved.slice(0, 3), [3, 4, 5]);
  const s = normalMatrix(mat4.multiply(mat4.scaling(2, 4, 0.5), mat4.identity()));
  assert.ok(Math.abs(s[0] - 0.5) < 1e-6 && Math.abs(s[4] - 0.25) < 1e-6 && Math.abs(s[8] - 2) < 1e-6, 'scaled normals invert');
  const p = projectPoint({ theta: 0.8, phi: 1.1, radius: 7, target: [0, 1, 0] }, [0, 1, 0], 400, 300);
  assert.ok(Math.abs(p.x - 200) < 1e-6 && Math.abs(p.y - 150) < 1e-6 && p.visible);
});

test('every lab scene builds for every control setting', () => {
  const variants = {
    shapes: SHAPE_KEYS.map(shape => ({ shape })),
    water: [{ heat: 0 }, { heat: 0.5 }, { heat: 1 }],
    earth: [{ hour: 0 }, { hour: 6 }, { hour: 12 }, { hour: 23.5 }],
    plant: ['none', 'leaf', 'stem', 'flower', 'root'].map(part => ({ part })),
  };
  for (const [name, models] of Object.entries(variants)) for (const model of models) {
    const sc = buildScene(name, model);
    assert.equal(sc.name, name);
    assert.ok(sc.parts.length >= 2, `${name} ${JSON.stringify(model)}`);
    assert.equal(sc.light.length, 3);
    assert.ok(Math.abs(Math.hypot(...sc.light) - 1) < 1e-6, `${name}: unit light`);
    for (const part of sc.parts) {
      assert.equal(part.mesh.positions.length, part.mesh.normals.length);
      assert.equal(part.model.length, 16);
      assert.equal(part.color.length, 3);
      assert.ok(part.color.every(c => c >= 0 && c <= 1));
      for (const v of part.model) assert.ok(Number.isFinite(v));
    }
    for (const pts of sc.points) {
      assert.equal(pts.positions.length, pts.seeds.length * 3);
      assert.ok(pts.seeds.every(v => v >= 0 && v <= 1));
      assert.ok(Number.isFinite(pts.speed) && pts.span > 0);
      for (const v of pts.positions) assert.ok(Number.isFinite(v));
    }
  }
  assert.ok(buildScene('shapes', { shape: 'cone' }).parts[1].mesh.indices.length > buildScene('shapes', { shape: 'cube' }).parts[1].mesh.indices.length);
  assert.equal(buildScene('nonsense', {}).name, 'shapes', 'an unknown scene falls back safely');
});

test('the software renderer draws the scene, with finite coordinates, when there is no WebGL', () => {
  const drawn = { fill: 0, arc: 0, bad: 0 };
  const ctx = {
    fillStyle: '#000', setTransform() {}, clearRect() {},
    beginPath() {}, closePath() {}, fill() { drawn.fill++; },
    arc() { drawn.arc++; },
    moveTo(x, y) { if (!Number.isFinite(x) || !Number.isFinite(y)) drawn.bad++; },
    lineTo(x, y) { if (!Number.isFinite(x) || !Number.isFinite(y)) drawn.bad++; },
  };
  const canvas = { width: 420, height: 315, getContext(kind) { return kind === '2d' ? ctx : null; } };
  const r = createRenderer(canvas);
  assert.equal(r.mode, 'canvas2d');
  r.setScene(buildScene('shapes', { shape: 'cube' }));
  r.draw({ theta: 0.8, phi: 1.1, radius: 6.6, target: [0, 1, 0] }, 1, 1);
  assert.ok(drawn.fill >= 12, `triangles drawn: ${drawn.fill}`);
  assert.equal(drawn.bad, 0);
  // A points scene exercises the animated-point path too.
  r.setScene(buildScene('water', { heat: 1 }));
  r.draw({ theta: 0.8, phi: 1.1, radius: 7.8, target: [0, 1.2, 0] }, 2, 1);
  assert.ok(drawn.fill > 100);
  assert.ok(drawn.arc > 0, 'rain and mist are drawn as points');
  assert.equal(drawn.bad, 0);
  r.dispose();
  assert.equal(createRenderer({ getContext: () => null }), null);
});

test('the WebGL path wires buffers, uniforms and draw calls without touching the DOM', () => {
  const calls = { elements: 0, arrays: 0, buffers: 0, programs: 0 };
  const K = { VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4, ARRAY_BUFFER: 5, ELEMENT_ARRAY_BUFFER: 6, STATIC_DRAW: 7, FLOAT: 8, TRIANGLES: 9, UNSIGNED_SHORT: 10, POINTS: 11, DEPTH_TEST: 12, CULL_FACE: 13, BLEND: 14, SRC_ALPHA: 15, ONE_MINUS_SRC_ALPHA: 16, COLOR_BUFFER_BIT: 17, DEPTH_BUFFER_BIT: 18 };
  const gl = {
    ...K,
    createShader: () => ({}), shaderSource() {}, compileShader() {}, getShaderParameter: () => true, deleteShader() {},
    createProgram: () => { calls.programs++; return {}; }, attachShader() {}, linkProgram() {}, getProgramParameter: () => true,
    getUniformLocation: () => ({}), getAttribLocation: () => 0, useProgram() {}, deleteProgram() {},
    createBuffer: () => { calls.buffers++; return {}; }, bindBuffer() {}, bufferData() {}, deleteBuffer() {},
    uniformMatrix4fv() {}, uniformMatrix3fv() {}, uniform3fv() {}, uniform1f() {},
    enableVertexAttribArray() {}, vertexAttribPointer() {}, viewport() {}, clearColor() {}, clear() {},
    enable() {}, disable() {}, depthMask() {}, blendFunc() {},
    drawElements: (mode, count) => { calls.elements++; assert.equal(mode, K.TRIANGLES); assert.ok(count > 0); },
    drawArrays: (mode, first, count) => { calls.arrays++; assert.equal(mode, K.POINTS); assert.ok(count > 0); },
  };
  const canvas = { width: 400, height: 300, getContext: kind => (kind === 'webgl' ? gl : null) };
  const r = createRenderer(canvas);
  assert.equal(r.mode, 'webgl');
  r.setScene(buildScene('water', { heat: 1 }));
  r.draw({ theta: 0.8, phi: 1.1, radius: 7.8, target: [0, 1.2, 0] }, 1.5);
  assert.ok(calls.elements >= 8, `parts drawn: ${calls.elements}`);
  assert.equal(calls.arrays, 2, 'mist and rain points');
  r.setScene(buildScene('shapes', { shape: 'sphere' }));
  r.draw({ theta: 0.8, phi: 1.1, radius: 6.6, target: [0, 1, 0] }, 2);
  assert.ok(calls.buffers > 6);
  r.dispose();
});

test('no lab touches a skill graph it does not own', () => {
  const ids = new Set(SKILLS.map(s => s.id));
  for (const lab of LABS) if (lab.skill) assert.ok(ids.has(lab.skill), lab.id);
  assert.ok(LABS.some(l => l.scene === 'shapes') && LABS.some(l => l.scene === 'water'));
  assert.ok(LABS.some(l => l.scene === 'earth') && LABS.some(l => l.scene === 'plant'));
});
