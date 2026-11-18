// A small 3D renderer for the Curiosity Labs: matrix maths, procedural meshes and two
// rasterisers. No three.js, no React, no assets — the whole thing is inside the single
// offline file and stays inside the Content-Security-Policy.
//
//   * WebGL when the device has it: one shader for lit triangles, one for animated points.
//   * A software canvas renderer when it does not: the same scene graph, projected and
//     painter-sorted. Lower fidelity, same geometry, still works.
//
// The maths and mesh builders are pure and exported, so tests can check them without a GPU.

export const mat4 = {
  identity: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
  multiply(a, b) {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      out[r + c * 4] = a[r] * b[c * 4] + a[r + 4] * b[c * 4 + 1] + a[r + 8] * b[c * 4 + 2] + a[r + 12] * b[c * 4 + 3];
    }
    return out;
  },
  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), out = new Float32Array(16);
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) / (near - far); out[11] = -1;
    out[14] = (2 * far * near) / (near - far);
    return out;
  },
  lookAt(eye, center, up) {
    const z = norm(sub(eye, center));
    let x = norm(cross(up, z));
    if (!x[0] && !x[1] && !x[2]) x = [1, 0, 0];
    const y = cross(z, x), out = new Float32Array(16);
    out[0] = x[0]; out[4] = x[1]; out[8] = x[2]; out[12] = -dot(x, eye);
    out[1] = y[0]; out[5] = y[1]; out[9] = y[2]; out[13] = -dot(y, eye);
    out[2] = z[0]; out[6] = z[1]; out[10] = z[2]; out[14] = -dot(z, eye);
    out[15] = 1;
    return out;
  },
  translation(x, y, z) { const o = mat4.identity(); o[12] = x; o[13] = y; o[14] = z; return o; },
  scaling(x, y, z) { const o = mat4.identity(); o[0] = x; o[5] = y; o[10] = z; return o; },
  rotationX(a) { const c = Math.cos(a), s = Math.sin(a), o = mat4.identity(); o[5] = c; o[6] = s; o[9] = -s; o[10] = c; return o; },
  rotationY(a) { const c = Math.cos(a), s = Math.sin(a), o = mat4.identity(); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o; },
  rotationZ(a) { const c = Math.cos(a), s = Math.sin(a), o = mat4.identity(); o[0] = c; o[1] = s; o[4] = -s; o[5] = c; return o; },
};

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

export function transform(m, v, w = 1) {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * w,
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * w,
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * w,
    m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * w,
  ];
}

// Inverse-transpose of the upper-left 3x3, so non-uniform scaled parts still light correctly.
export function normalMatrix(m) {
  const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (!det) return new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  return new Float32Array([
    A / det, B / det, C / det,
    -(b * i - c * h) / det, (a * i - c * g) / det, -(a * h - b * g) / det,
    (b * f - c * e) / det, -(a * f - c * d) / det, (a * e - b * d) / det,
  ]);
}

// ---------- procedural meshes (positions, normals, triangle indices) ----------
const mesh = (p, n, idx) => ({ positions: new Float32Array(p), normals: new Float32Array(n), indices: new Uint16Array(idx) });

export function box(w = 1, h = 1, d = 1) {
  const x = w / 2, y = h / 2, z = d / 2;
  const faces = [
    { n: [0, 0, 1], v: [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]] },
    { n: [0, 0, -1], v: [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]] },
    { n: [1, 0, 0], v: [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]] },
    { n: [-1, 0, 0], v: [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]] },
    { n: [0, 1, 0], v: [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]] },
    { n: [0, -1, 0], v: [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]] },
  ];
  const p = [], n = [], idx = [];
  faces.forEach((f, k) => {
    const base = k * 4;
    for (const v of f.v) { p.push(...v); n.push(...f.n); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  return mesh(p, n, idx);
}

export function plane(w = 1, d = 1) {
  const x = w / 2, z = d / 2;
  return mesh([-x, 0, z, x, 0, z, x, 0, -z, -x, 0, -z], [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], [0, 1, 2, 0, 2, 3]);
}

export function cylinder(r = 1, h = 1, seg = 24) {
  const p = [], n = [], idx = [], y = h / 2;
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    p.push(c * r, -y, s * r, c * r, y, s * r); n.push(c, 0, s, c, 0, s);
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
  }
  const cap = p.length / 3;
  p.push(0, y, 0, 0, -y, 0); n.push(0, 1, 0, 0, -1, 0);
  const top = cap, bottom = cap + 1;
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    p.push(c * r, y, s * r, c * r, -y, s * r); n.push(0, 1, 0, 0, -1, 0);
  }
  for (let i = 0; i < seg; i++) {
    const a = cap + 2 + i * 2;
    idx.push(top, a, a + 2);
    idx.push(bottom, a + 3, a + 1);
  }
  return mesh(p, n, idx);
}

export function cone(r = 1, h = 1, seg = 24) {
  const p = [], n = [], idx = [], y = h / 2;
  const tip = p.length / 3;
  p.push(0, y, 0); n.push(0, 1, 0);
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    p.push(c * r, -y, s * r);
    const nn = norm([c * h, r, s * h]);
    n.push(...nn);
  }
  for (let i = 0; i < seg; i++) idx.push(tip, 1 + i, 2 + i);
  const base = p.length / 3, centre = base;
  p.push(0, -y, 0); n.push(0, -1, 0);
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    p.push(Math.cos(a) * r, -y, Math.sin(a) * r); n.push(0, -1, 0);
  }
  for (let i = 0; i < seg; i++) idx.push(centre, base + 2 + i, base + 1 + i);
  return mesh(p, n, idx);
}

export function sphere(r = 1, lat = 16, lon = 24) {
  const p = [], n = [], idx = [];
  for (let i = 0; i <= lat; i++) {
    const t = (i / lat) * Math.PI, st = Math.sin(t), ct = Math.cos(t);
    for (let j = 0; j <= lon; j++) {
      const u = (j / lon) * Math.PI * 2;
      const v = [st * Math.cos(u), ct, st * Math.sin(u)];
      p.push(v[0] * r, v[1] * r, v[2] * r); n.push(...v);
    }
  }
  for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) {
    const a = i * (lon + 1) + j, b = a + lon + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  return mesh(p, n, idx);
}

// ---------- camera ----------
export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export function orbitCamera({ theta = 0.8, phi = 1.1, radius = 7, target = [0, 1, 0] } = {}) {
  const r = clamp(radius, 2.2, 24), ph = clamp(phi, 0.18, Math.PI / 2 + 0.35);
  return {
    eye: [target[0] + r * Math.sin(ph) * Math.sin(theta), target[1] + r * Math.cos(ph), target[2] + r * Math.sin(ph) * Math.cos(theta)],
    target, up: [0, 1, 0],
  };
}

// ---------- WebGL ----------
const VS = `attribute vec3 aPos; attribute vec3 aNrm; uniform mat4 uProj, uView, uModel; uniform mat3 uNrm;
varying vec3 vN; void main(){ vN = uNrm * aNrm; gl_Position = uProj * uView * uModel * vec4(aPos, 1.0); }`;
const FS = `precision mediump float; varying vec3 vN; uniform vec3 uColor, uLight; uniform float uEmissive;
void main(){ float d = max(dot(normalize(vN), uLight), 0.0); vec3 c = uColor * (0.34 + 0.66 * d);
gl_FragColor = vec4(mix(c, uColor, uEmissive), 1.0); }`;
const PVS = `attribute vec3 aPos; attribute float aSeed; uniform mat4 uProj, uView; uniform float uTime, uSpeed, uSpan, uSize;
void main(){ vec3 p = aPos; p.y = mod(p.y + uTime * uSpeed + aSeed * uSpan, uSpan); gl_Position = uProj * uView * vec4(p, 1.0); gl_PointSize = uSize; }`;
const PFS = `precision mediump float; uniform vec3 uColor; uniform float uOpacity; void main(){ gl_FragColor = vec4(uColor, uOpacity); }`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src); gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { gl.deleteShader(sh); return null; }
  return sh;
}
function program(gl, vs, fs) {
  const v = compile(gl, gl.VERTEX_SHADER, vs), f = compile(gl, gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram();
  gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
  return p;
}

function createGLRenderer(canvas, gl) {
  const prog = program(gl, VS, FS);
  if (!prog) return null;
  const pointsProg = program(gl, PVS, PFS);
  const uni = {
    proj: gl.getUniformLocation(prog, 'uProj'), view: gl.getUniformLocation(prog, 'uView'),
    model: gl.getUniformLocation(prog, 'uModel'), nrm: gl.getUniformLocation(prog, 'uNrm'),
    color: gl.getUniformLocation(prog, 'uColor'), light: gl.getUniformLocation(prog, 'uLight'),
    emissive: gl.getUniformLocation(prog, 'uEmissive'),
  };
  const puni = pointsProg ? {
    proj: gl.getUniformLocation(pointsProg, 'uProj'), view: gl.getUniformLocation(pointsProg, 'uView'),
    time: gl.getUniformLocation(pointsProg, 'uTime'), speed: gl.getUniformLocation(pointsProg, 'uSpeed'),
    span: gl.getUniformLocation(pointsProg, 'uSpan'), size: gl.getUniformLocation(pointsProg, 'uSize'),
    color: gl.getUniformLocation(pointsProg, 'uColor'), opacity: gl.getUniformLocation(pointsProg, 'uOpacity'),
  } : null;
  const attr = { pos: gl.getAttribLocation(prog, 'aPos'), nrm: gl.getAttribLocation(prog, 'aNrm') };
  const pattr = pointsProg ? { pos: gl.getAttribLocation(pointsProg, 'aPos'), seed: gl.getAttribLocation(pointsProg, 'aSeed') } : null;
  let scene = null, buffers = [], pointBuffers = [];

  function clearBuffers() {
    for (const b of buffers) { gl.deleteBuffer(b.pos); gl.deleteBuffer(b.nrm); gl.deleteBuffer(b.idx); }
    for (const b of pointBuffers) { gl.deleteBuffer(b.pos); gl.deleteBuffer(b.seed); }
    buffers = []; pointBuffers = [];
  }
  function setScene(s) {
    clearBuffers(); scene = s;
    buffers = (s.parts || []).map(part => {
      const pos = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pos); gl.bufferData(gl.ARRAY_BUFFER, part.mesh.positions, gl.STATIC_DRAW);
      const nrm = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, nrm); gl.bufferData(gl.ARRAY_BUFFER, part.mesh.normals, gl.STATIC_DRAW);
      const idx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, part.mesh.indices, gl.STATIC_DRAW);
      return { ...part, pos, nrm, idx, count: part.mesh.indices.length };
    });
    pointBuffers = (s.points || []).map(pt => {
      const pos = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pos); gl.bufferData(gl.ARRAY_BUFFER, pt.positions, gl.STATIC_DRAW);
      const seed = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, seed); gl.bufferData(gl.ARRAY_BUFFER, pt.seeds, gl.STATIC_DRAW);
      return { ...pt, pos, seed, count: pt.positions.length / 3 };
    });
  }

  function draw(camera, time = 0) {
    if (!scene) return;
    const w = canvas.width, h = canvas.height;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const cam = orbitCamera(camera);
    const view = mat4.lookAt(cam.eye, cam.target, cam.up);
    const proj = mat4.perspective((45 * Math.PI) / 180, w / Math.max(1, h), 0.1, 100);
    gl.useProgram(prog);
    gl.uniformMatrix4fv(uni.proj, false, proj); gl.uniformMatrix4fv(uni.view, false, view);
    gl.uniform3fv(uni.light, norm(scene.light || [0.4, 0.9, 0.5]));
    for (const b of buffers) {
      gl.bindBuffer(gl.ARRAY_BUFFER, b.pos);
      gl.enableVertexAttribArray(attr.pos); gl.vertexAttribPointer(attr.pos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.nrm);
      gl.enableVertexAttribArray(attr.nrm); gl.vertexAttribPointer(attr.nrm, 3, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(uni.model, false, b.model); gl.uniformMatrix3fv(uni.nrm, false, normalMatrix(b.model));
      gl.uniform3fv(uni.color, b.color); gl.uniform1f(uni.emissive, b.emissive || 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx);
      gl.drawElements(gl.TRIANGLES, b.count, gl.UNSIGNED_SHORT, 0);
    }
    if (pointsProg && pointBuffers.length) {
      gl.depthMask(false);
      gl.useProgram(pointsProg);
      gl.uniformMatrix4fv(puni.proj, false, proj); gl.uniformMatrix4fv(puni.view, false, view);
      gl.uniform1f(puni.time, time);
      for (const p of pointBuffers) {
        gl.bindBuffer(gl.ARRAY_BUFFER, p.pos);
        gl.enableVertexAttribArray(pattr.pos); gl.vertexAttribPointer(pattr.pos, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, p.seed);
        gl.enableVertexAttribArray(pattr.seed); gl.vertexAttribPointer(pattr.seed, 1, gl.FLOAT, false, 0, 0);
        gl.uniform1f(puni.speed, p.speed); gl.uniform1f(puni.span, p.span || 6);
        gl.uniform1f(puni.size, p.size || 4); gl.uniform3fv(puni.color, p.color); gl.uniform1f(puni.opacity, p.opacity == null ? 0.8 : p.opacity);
        gl.drawArrays(gl.POINTS, 0, p.count);
      }
      gl.depthMask(true);
    }
  }
  return { mode: 'webgl', setScene, draw, resize() {}, dispose() { clearBuffers(); gl.deleteProgram(prog); if (pointsProg) gl.deleteProgram(pointsProg); } };
}

// ---------- software renderer ----------
const shade = (color, k) => color.map(c => Math.round(clamp(c * k, 0, 1) * 255));

function create2DRenderer(canvas, ctx) {
  let scene = null;
  const setScene = s => { scene = s; };

  function draw(camera, time = 0, dpr = 1) {
    if (!scene) return;
    const w = canvas.width, h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cam = orbitCamera(camera);
    const view = mat4.lookAt(cam.eye, cam.target, cam.up);
    const proj = mat4.perspective((45 * Math.PI) / 180, w / Math.max(1, h), 0.1, 100);
    const vp = mat4.multiply(proj, view);
    const light = norm(scene.light || [0.4, 0.9, 0.5]);
    const tris = [];
    for (const part of scene.parts || []) {
      const world = [], clip = [];
      for (let i = 0; i < part.mesh.positions.length; i += 3) {
        world.push(transform(part.model, [part.mesh.positions[i], part.mesh.positions[i + 1], part.mesh.positions[i + 2]]));
        clip.push(transform(vp, world[world.length - 1]));
      }
      const ix = part.mesh.indices;
      for (let i = 0; i < ix.length; i += 3) {
        const a = clip[ix[i]], b = clip[ix[i + 1]], c = clip[ix[i + 2]];
        if (a[3] <= 0.02 || b[3] <= 0.02 || c[3] <= 0.02) continue;
        const sx = p => [(p[0] / p[3] * 0.5 + 0.5) * w, (0.5 - p[1] / p[3] * 0.5) * h];
        const pa = sx(a), pb = sx(b), pc = sx(c);
        // Skip triangles smaller than a third of a pixel: on a phone they are invisible and
        // they are most of the cost of the software fallback.
        if (Math.abs((pb[0] - pa[0]) * (pc[1] - pa[1]) - (pc[0] - pa[0]) * (pb[1] - pa[1])) < 0.7) continue;
        const n = norm(cross(sub(world[ix[i + 1]], world[ix[i]]), sub(world[ix[i + 2]], world[ix[i]])));
        const lit = 0.34 + 0.66 * Math.max(0, dot(n, light));
        const depth = (a[2] / a[3] + b[2] / b[3] + c[2] / c[3]) / 3;
        const col = part.emissive ? part.color.map(x => Math.round(clamp(x, 0, 1) * 255)) : shade(part.color, lit);
        tris.push({ pa, pb, pc, depth, col });
      }
    }
    tris.sort((x, y) => y.depth - x.depth);
    for (const t of tris) {
      ctx.fillStyle = `rgb(${t.col[0]},${t.col[1]},${t.col[2]})`;
      ctx.beginPath(); ctx.moveTo(t.pa[0], t.pa[1]); ctx.lineTo(t.pb[0], t.pb[1]); ctx.lineTo(t.pc[0], t.pc[1]); ctx.closePath(); ctx.fill();
    }
    for (const p of scene.points || []) {
      ctx.fillStyle = `rgba(${Math.round(p.color[0] * 255)},${Math.round(p.color[1] * 255)},${Math.round(p.color[2] * 255)},${p.opacity == null ? 0.8 : p.opacity})`;
      const span = p.span || 6;
      for (let i = 0; i < p.positions.length; i += 3) {
        const seed = p.seeds[i / 3];
        let y = (p.positions[i + 1] + time * p.speed + seed * span) % span;
        if (y < 0) y += span;
        const v = transform(vp, [p.positions[i], y, p.positions[i + 2]]);
        if (v[3] <= 0.02) continue;
        const x = (v[0] / v[3] * 0.5 + 0.5) * w, yy = (0.5 - v[1] / v[3] * 0.5) * h;
        ctx.beginPath(); ctx.arc(x, yy, Math.max(1, (p.size || 4) * 0.35 * dpr), 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  return { mode: 'canvas2d', setScene, draw, resize() {}, dispose() {} };
}

export function createRenderer(canvas) {
  try {
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
      || canvas.getContext('experimental-webgl', { alpha: true, antialias: true });
    if (gl) {
      const r = createGLRenderer(canvas, gl);
      if (r) return r;
    }
  } catch { /* no WebGL: fall through */ }
  try {
    const ctx = canvas.getContext('2d');
    if (ctx) return create2DRenderer(canvas, ctx);
  } catch { /* no canvas at all */ }
  return null;
}

// Projection helper used by tests and by future hit-testing.
export function projectPoint(camera, point, width, height) {
  const cam = orbitCamera(camera);
  const vp = mat4.multiply(
    mat4.perspective((45 * Math.PI) / 180, width / Math.max(1, height), 0.1, 100),
    mat4.lookAt(cam.eye, cam.target, cam.up),
  );
  const v = transform(vp, point);
  return { x: (v[0] / v[3] * 0.5 + 0.5) * width, y: (0.5 - v[1] / v[3] * 0.5) * height, w: v[3], visible: v[3] > 0.02 };
}
