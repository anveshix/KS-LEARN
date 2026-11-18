# Curiosity Labs (Phase 4)

Four interactive 3D models, generated in code and rendered on the device. They are the
Phase 4 answer to the brief's "React Three Fiber sandboxes". React + three.js is roughly
600 KB minified, which alone would break the 900 KB single-file gate; it also brings a
renderer and asset pipeline the offline build does not need. So the outcome — a child turns
a solid, warms a pond, spins the Earth and opens a plant — is delivered with a small
purpose-built renderer instead. Same rule as the rest of the upgrade: the outcome is
non-negotiable, the library is not.

## The labs

| Lab | Class | World | What the child does | Questions |
|---|---|---|---|---|
| **Shapes you can turn** | 4 | Maths | Turns a cube, cuboid, cylinder, cone and sphere; counts faces, edges and corners | 3 |
| **Water goes round** | 4 | EVS | Warms a pond, watches mist rise, clouds form and rain fall | 3 |
| **Day and night** | 5 | EVS | Spins the Earth beside the Sun; finds the lit and dark halves | 3 |
| **Inside a plant** | 4 | EVS | Lights up leaf, stem, flower and roots; finds what each part does | 3 |

A lab is a curiosity object, not a test: the questions never award mastery, never write into
the BKT model, and never show a red error. A wrong answer shows the hint for that step and
lets the child choose again; tries are counted only so a parent can see that a model was
poked at. Finishing all three questions marks the lab explored, once, for **+3 stars**.

## Renderer

`src/ui/gl.js` is a small 3D renderer with no dependency:

* **Matrices** — column-major 4×4, perspective, `lookAt`, translation/scale/rotation, and an
  inverse-transpose normal matrix so flattened parts light correctly.
* **Meshes** — box, plane, cylinder, cone and sphere built procedurally with unit normals
  and triangle indices. No textures, no external assets.
* **Camera** — an orbit camera (theta, phi, radius) driven by drag, arrow keys, wheel and
  pinch. Phi stays above the ground; radius is clamped.
* **WebGL path** — one Lambert shader for triangles and one point shader for rain, mist and
  stars. Points animate in the shader from a seed and a time uniform, so the CPU does
  nothing per particle.
* **Software path** — if WebGL is unavailable, the same scene graph is projected on a 2D
  canvas and painter-sorted by depth, with flat shading. Lower fidelity, same geometry and
  interactions. If even a 2D context is unavailable (a locked-down WebView, a test DOM), the
  lab shows a plain note and remains fully usable through its controls and text.

The renderer is created per lab screen and disposed on route change: buffers, programs and
the animation loop are released, so no work continues behind another page. The loop is
capped at roughly 30 fps and does nothing when the tab is not painting. Reduced-motion
preferences stop the automatic turn.

## Accessibility

* The canvas has `role="img"` and a full bilingual description of the scene.
* Every control is a real button or a labelled range input; nothing essential is canvas-only.
* Arrow keys turn the model, `+`/`-` zoom, and the controls are ordinary focusable elements.
* Questions are buttons with visible letters, explanations are text, and a wrong answer is a
  hint rather than a colour-only signal.
* All model names, questions, hints and explanations are bilingual (`en`/`hi`), like the rest
  of the content.

## Data and privacy

The only records are local: which lab was opened, which was finished, the day, and a bounded
try count. There is no model file to download, no telemetry, no shader or asset request, no
camera, and no microphone. The data lives in the same `kslearn.v2` document as the rest of
the progress, appears in a backup only if a parent exports one, and is removed by the
account-authorised erase. The DPDP purpose is `memory` (essential), and the row is listed in
[DPDP.md](DPDP.md).

## Limits, stated plainly

* The models are **stylised**, not to scale. The Earth's land is a set of green patches, not
  a map; the plant's roots are drawn as a cutaway in front of the pot so they can be seen.
* There is no texture, shadow map, reflection or physics. The teaching point is the
  relationship the child can turn and inspect.
* WebGL may be blocked by a locked-down browser. The fallback is real but slow on very old
  phones; the text and controls still carry the lesson.
* A lab does not feed mastery. If a child wants graded practice, the last screen links to the
  related skill (plants, water and air, Earth–Sun–Moon), where BKT applies in the usual way.

## Files and tests

| File | Responsibility |
|---|---|
| `src/content/labs.js` | Four labs: bilingual text, scenes, three questions each |
| `src/core/labs.js` | Validation, class selection, answer checking, progress, summary |
| `src/ui/gl.js` | Maths, meshes, camera, WebGL renderer, software renderer |
| `src/ui/labs-scenes.js` | Scene builders for shapes, water, Earth and plant |
| `src/ui/labs-ui.js` | Shelf, lab screen, controls, questions, cleanup |
| `src/core/store.js` | Sanitised lab progress in the local document |
| `tests/labs.test.mjs` | Content, questions, progress, sanitiser, geometry, projection, fallback renderer |

`npm run check` runs the tests, the content audit, the build and the dist verifier.
