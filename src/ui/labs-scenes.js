// The four Curiosity Lab worlds, built from primitives. Each builder returns plain data:
// parts (mesh + model matrix + colour) and optional animated point clouds.
import { mat4, box, plane, cylinder, cone, sphere, norm } from './gl.js';

const LIGHT = norm([0.45, 0.95, 0.55]);
const ground = (color = [0.87, 0.9, 0.85], size = 11) => ({
  mesh: plane(size, size), model: mat4.identity(), color,
});

const SHAPES = {
  cube: { mesh: () => box(1.7, 1.7, 1.7), base: 0.85, color: [0.24, 0.42, 0.9] },
  cuboid: { mesh: () => box(2.3, 1.25, 1.3), base: 0.63, color: [0.2, 0.62, 0.5] },
  cylinder: { mesh: () => cylinder(0.9, 1.8, 28), base: 0.9, color: [0.88, 0.56, 0.16] },
  cone: { mesh: () => cone(1, 1.9, 28), base: 0.95, color: [0.8, 0.3, 0.25] },
  sphere: { mesh: () => sphere(1.15, 18, 26), base: 1.15, color: [0.55, 0.35, 0.85] },
};
export const SHAPE_KEYS = Object.keys(SHAPES);

function shapes(model) {
  const key = SHAPES[model.shape] ? model.shape : 'cube';
  const s = SHAPES[key];
  return {
    name: 'shapes',
    light: LIGHT,
    parts: [
      ground(),
      { mesh: s.mesh(), color: s.color, model: mat4.translation(0, s.base, 0) },
    ],
    points: [],
  };
}

function cloud(x, y, z, scale) {
  return { mesh: sphere(0.55, 8, 10), color: [0.98, 0.98, 1], model: mat4.multiply(mat4.translation(x, y, z), mat4.scaling(scale * 1.5, scale * 0.65, scale)) };
}

function rain(count, rnd) {
  const pos = new Float32Array(count * 3), seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rnd() * 2 - 1) * 3.2;
    pos[i * 3 + 1] = rnd() * 5;
    pos[i * 3 + 2] = (rnd() * 2 - 1) * 2;
    seeds[i] = rnd();
  }
  return { positions: pos, seeds, speed: -1.7, span: 5, size: 4, color: [0.5, 0.7, 0.98], opacity: 0.8 };
}

function mist(count, rnd, heat) {
  const pos = new Float32Array(count * 3), seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rnd() * 2 - 1) * 2.6;
    pos[i * 3 + 1] = rnd() * 1.2;
    pos[i * 3 + 2] = (rnd() * 2 - 1) * 1.4;
    seeds[i] = rnd();
  }
  return { positions: pos, seeds, speed: 0.45 + heat * 0.9, span: 4, size: 3, color: [0.82, 0.92, 1], opacity: 0.35 + heat * 0.35 };
}

// A fixed pseudo-random stream, so a scene looks the same every time it is rebuilt.
const rng = seed => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

function water(model) {
  const heat = Math.min(1, Math.max(0, model.heat == null ? 0.4 : model.heat));
  const r = rng(4242);
  const parts = [
    { mesh: box(9, 0.36, 6), color: [0.46, 0.58, 0.32], model: mat4.translation(0, -0.18, 0) },
    { mesh: plane(6.6, 3.8), color: [0.16, 0.44, 0.82], model: mat4.translation(0, 0.02, 0) },
    { mesh: cone(1.35, 1.8, 22), color: [0.35, 0.5, 0.3], model: mat4.translation(-2.9, 0.78, -1.5) },
    { mesh: cone(1.0, 1.35, 20), color: [0.43, 0.57, 0.34], model: mat4.translation(3.05, 0.56, -1.75) },
    { mesh: sphere(0.55, 12, 16), color: [1, 0.82, 0.28], model: mat4.translation(-3.35, 3.2, -2.0), emissive: 1 },
  ];
  const yy = 3.15 + heat * 0.55;
  parts.push(cloud(-1.7, yy, -0.4, 1.0), cloud(0.2, yy + 0.35, -0.9, 1.25), cloud(1.9, yy - 0.1, -0.3, 0.9));
  const points = [mist(52, r, heat)];
  if (heat > 0.45) points.push(rain(Math.round(70 + heat * 50), r));
  return { name: 'water', light: LIGHT, parts, points };
}

// The Earth's land is placed in local lat/long; the model turns it so India faces the Sun
// at noon. The tilt stays fixed in space while the planet spins, as it really is.
function earth(model) {
  const hour = model.hour == null ? 12 : model.hour;
  const tilt = (-23.4 * Math.PI) / 180;
  const angle = (hour / 24) * Math.PI * 2 - 0.17;
  const spin = mat4.rotationY(angle);
  const axis = mat4.rotationZ(tilt);
  const world = mat4.multiply(axis, spin);
  const R = 1.25;
  const at = (lat, lon) => {
    const a = (lat * Math.PI) / 180, b = (lon * Math.PI) / 180;
    return [R * Math.cos(a) * Math.sin(b), R * Math.sin(a), R * Math.cos(a) * Math.cos(b)];
  };
  const land = (lat, lon, sx, sy, sz) => {
    const p = at(lat, lon);
    return { mesh: sphere(1, 8, 10), color: [0.22, 0.63, 0.32], model: mat4.multiply(mat4.multiply(world, mat4.translation(p[0], p[1], p[2])), mat4.scaling(sx, sy, sz)) };
  };
  const parts = [
    { mesh: sphere(R, 16, 24), color: [0.14, 0.4, 0.78], model: world },
    land(22, 78, 0.5, 0.3, 0.42),      // India
    land(4, 20, 0.45, 0.42, 0.55),     // Africa
    land(-25, 136, 0.38, 0.2, 0.34),   // Australia
    land(12, -60, 0.38, 0.42, 0.62),   // South America
    land(48, -100, 0.4, 0.3, 0.52),    // North America
    { mesh: sphere(1, 8, 10), color: [0.95, 0.97, 1], model: mat4.multiply(mat4.multiply(world, mat4.translation(0, R * 0.82, 0)), mat4.scaling(0.62, 0.14, 0.62)) },
    { mesh: sphere(1, 8, 10), color: [0.95, 0.97, 1], model: mat4.multiply(mat4.multiply(world, mat4.translation(0, -R * 0.82, 0)), mat4.scaling(0.62, 0.14, 0.62)) },
    { mesh: cylinder(0.02, 3.5, 8), color: [0.98, 0.86, 0.3], model: axis, emissive: 0.35 },
    { mesh: sphere(0.72, 12, 16), color: [1, 0.8, 0.24], model: mat4.translation(-5, 2.2, -2), emissive: 1 },
  ];
  const stars = (n => {
    const pos = new Float32Array(n * 3), seeds = new Float32Array(n), r2 = rng(99);
    for (let i = 0; i < n; i++) {
      const a = r2() * Math.PI * 2, y = r2() * 2 - 1, rad = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(a) * rad * 9;
      pos[i * 3 + 1] = 4 + y * 4;
      pos[i * 3 + 2] = Math.sin(a) * rad * 9;
      seeds[i] = 0;
    }
    return { positions: pos, seeds, speed: 0, span: 20, size: 2, color: [0.95, 0.97, 1], opacity: 0.8 };
  })(90);
  return { name: 'earth', light: norm([-5, 2.2, -2]), parts, points: [stars] };
}

const tint = (base, on) => (on ? [0.98, 0.82, 0.22] : base);

function plant(model) {
  const part = model.part || 'none';
  const green = [0.18, 0.55, 0.28], stem = [0.15, 0.46, 0.24];
  const parts = [
    ground([0.9, 0.92, 0.87], 12),
    { mesh: cylinder(1.05, 0.5, 24), color: [0.72, 0.42, 0.28], model: mat4.translation(0, 0.25, 0) },
    { mesh: cylinder(1.12, 0.12, 24), color: [0.8, 0.5, 0.34], model: mat4.translation(0, 0.5, 0) },
    { mesh: cylinder(1.0, 0.06, 24), color: [0.3, 0.22, 0.16], model: mat4.translation(0, 0.57, 0) },
    { mesh: cylinder(0.07, 2.4, 10), color: tint(stem, part === 'stem'), model: mat4.translation(0, 1.75, 0) },
    { mesh: sphere(1, 10, 12), color: tint(green, part === 'leaf'), model: mat4.multiply(mat4.multiply(mat4.translation(-0.55, 1.7, 0), mat4.rotationZ(0.5)), mat4.scaling(0.72, 0.1, 0.34)) },
    { mesh: sphere(1, 10, 12), color: tint(green, part === 'leaf'), model: mat4.multiply(mat4.multiply(mat4.translation(0.55, 2.1, 0), mat4.rotationZ(-0.5)), mat4.scaling(0.72, 0.1, 0.34)) },
    { mesh: sphere(1, 10, 12), color: tint(green, part === 'leaf'), model: mat4.multiply(mat4.multiply(mat4.translation(0, 2.45, 0.42), mat4.rotationX(0.5)), mat4.scaling(0.55, 0.1, 0.3)) },
    { mesh: sphere(0.17, 8, 10), color: [0.98, 0.8, 0.2], model: mat4.translation(0, 3.05, 0) },
  ];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    parts.push({
      mesh: sphere(1, 6, 8), color: tint([0.93, 0.45, 0.62], part === 'flower'),
      model: mat4.multiply(mat4.multiply(mat4.translation(Math.cos(a) * 0.26, 3.05, Math.sin(a) * 0.26), mat4.rotationY(-a)), mat4.scaling(0.3, 0.06, 0.14)),
    });
  }
  // Roots are drawn as a cutaway in front of the pot, so a child can see them: the pot is
  // shallow and open, but soil would hide them from every useful angle.
  for (const [x, lean] of [[-0.32, 0.28], [0, 0.02], [0.32, -0.26]]) {
    parts.push({
      mesh: cylinder(0.05, 0.85, 8), color: tint([0.58, 0.36, 0.22], part === 'root'),
      model: mat4.multiply(mat4.translation(x, 0.2, 1.02), mat4.rotationZ(lean)),
    });
  }
  return { name: 'plant', light: LIGHT, parts, points: [] };
}

export function buildScene(name, model = {}) {
  if (name === 'water') return water(model);
  if (name === 'earth') return earth(model);
  if (name === 'plant') return plant(model);
  return shapes(model);
}
