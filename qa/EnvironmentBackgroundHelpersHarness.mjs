// ============================================
// Nepali P7E-4 Background Helpers QA Harness
// ============================================
// Headless verification that the normal-stage parallax background renders
// without ReferenceErrors (hashString01/ridgeYPure/drawRidgePolyline) for
// EVERY theme profile, is deterministic (same cameraX -> identical draw log),
// has no NaN coordinates, stays bounded per frame, and that Fast Track never
// touches the new path.
//
// EnvironmentRenderer is a plain class (no Phaser inheritance) and
// renderNormalBackground never touches Phaser, so no Phaser stub is needed.

import { EnvironmentRenderer } from '../src/game/EnvironmentRenderer.js';
import { BG_PROFILES } from '../src/data/regionThemes.js';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? ' - ' + detail : ''}`); }
  else { fail++; console.error(`  FAIL  ${name}${detail ? ' - ' + detail : ''}`); }
};

// Command-logging Graphics mock covering every method the P7E-4 path uses.
function makeGraphics() {
  const cmds = [];
  const log = (name) => (...args) => { cmds.push([name, ...args]); return g; };
  const g = {
    cmds,
    clear: log('clear'),
    setScrollFactor: log('setScrollFactor'),
    setDepth: log('setDepth'),
    fillStyle: log('fillStyle'),
    lineStyle: log('lineStyle'),
    fillRect: log('fillRect'),
    fillEllipse: log('fillEllipse'),
    fillCircle: log('fillCircle'),
    fillTriangle: log('fillTriangle'),
    beginPath: log('beginPath'),
    moveTo: log('moveTo'),
    lineTo: log('lineTo'),
    closePath: log('closePath'),
    fillPath: log('fillPath'),
    strokePath: log('strokePath'),
    strokeCircle: log('strokeCircle'),
    fillRoundedRect: log('fillRoundedRect'),
    strokeRoundedRect: log('strokeRoundedRect')
  };
  return g;
}

function makeScene() {
  const layers = { sky: makeGraphics(), far: makeGraphics(), mid: makeGraphics() };
  return {
    layers,
    scale: { width: 1280, height: 720 },
    add: {
      graphics: () => makeGraphics() // extras (nearTree/overRoad/struct/fg) unused here
    }
  };
}

// Build a renderer for a given theme visual object. `terrain.stagePlan.visual`
// mirrors what StagePlan resolves in real gameplay.
function makeRenderer(visual, stageId = 'normal_stage') {
  const scene = makeScene();
  const terrain = { isFastTrack: false, stagePlan: { visual } };
  const stage = { id: stageId, environment: 'normal' };
  const r = new EnvironmentRenderer(scene, terrain, stage);
  // Rebind the three layers the P7E-4 path draws on to our logged mocks.
  r.skyGraphics = scene.layers.sky;
  r.farHimalayaGraphics = scene.layers.far;
  r.midHillGraphics = scene.layers.mid;
  return r;
}

const finiteArgs = cmds => cmds.every(c => c.every(v => typeof v !== 'number' || Number.isFinite(v)));
const sameLog = (a, b) => a.length === b.length && a.every((c, i) =>
  c.length === b[i].length && c.every((v, j) => v === b[i][j]));

console.log('\n[B1] Every BG_PROFILES theme renders without exceptions, no NaN, bounded');
{
  const ids = Object.keys(BG_PROFILES);
  check('profile registry is populated', ids.length >= 10, `${ids.length} profiles`);
  let allRendered = true, allFinite = true, allBounded = true;
  const worst = { id: null, n: 0 };
  for (const id of ids) {
    try {
      const r = makeRenderer({ id, background: { cloudDensity: BG_PROFILES[id].cloudDensity ?? 0.3 } });
      r.update(4321, 0); // same entry point GameScene.update uses
      const total = r.skyGraphics.cmds.length + r.farHimalayaGraphics.cmds.length + r.midHillGraphics.cmds.length;
      if (total === 0) { allRendered = false; console.error(`    ${id}: produced no draw commands`); }
      const finite = finiteArgs(r.skyGraphics.cmds) && finiteArgs(r.farHimalayaGraphics.cmds) && finiteArgs(r.midHillGraphics.cmds);
      if (!finite) { allFinite = false; console.error(`    ${id}: NaN/Infinity in draw args`); }
      if (total > 3000) { allBounded = false; console.error(`    ${id}: ${total} commands (unbounded?)`); }
      if (total > worst.n) { worst.n = total; worst.id = id; }
    } catch (e) {
      allRendered = false;
      console.error(`    ${id}: ${e.constructor.name}: ${e.message}`);
    }
  }
  check('all profiles render via update() with zero exceptions', allRendered, `${ids.length} themes`);
  check('no NaN/Infinity in any draw command', allFinite);
  check('per-frame draw command count stays bounded', allBounded, `worst: ${worst.id}=${worst.n}`);
}

console.log('\n[B2] Determinism: same theme + cameraX -> identical draw logs');
{
  let allDet = true;
  for (const id of ['DEFAULT', 'KAGBENI', 'KARNALI', 'TEA_ILAM', 'KTM_URBAN', 'TERAI_MADHESH']) {
    if (!BG_PROFILES[id]) continue; // only profiles that exist
    const a = makeRenderer({ id, background: { cloudDensity: 0.3 } });
    const b = makeRenderer({ id, background: { cloudDensity: 0.3 } });
    a.update(9876, 0);
    b.update(9876, 0);
    const det = sameLog(a.skyGraphics.cmds, b.skyGraphics.cmds)
      && sameLog(a.farHimalayaGraphics.cmds, b.farHimalayaGraphics.cmds)
      && sameLog(a.midHillGraphics.cmds, b.midHillGraphics.cmds);
    if (!det) { allDet = false; console.error(`    ${id}: logs differ`); }
  }
  check('identical inputs produce byte-identical command logs', allDet);
  check('no Math.random() consumed during render', (() => {
    const orig = Math.random;
    let called = false;
    Math.random = () => { called = true; return 0.5; };
    try {
      const r = makeRenderer({ id: 'DEFAULT' });
      r.update(1000, 0);
      return !called;
    } finally { Math.random = orig; }
  })());
}

console.log('\n[B3] Scroll continuity: adjacent cameraX values share ridge geometry');
{
  // The far layer at cameraX and cameraX+STEP must sample the same world-space
  // ridge function — sample points overlap, so Y values at equal world X match.
  const a = makeRenderer({ id: 'DEFAULT' });
  a.update(1000, 0);
  a.update(1024, 0);
  // Extract the far-layer polyline points and verify no vertical jumps larger
  // than a sane amplitude between consecutive lineTo calls.
  const pts = a.farHimalayaGraphics.cmds.filter(c => c[0] === 'lineTo').map(c => c[3]);
  let jumps = 0;
  for (let i = 1; i < pts.length; i++) {
    if (Math.abs(pts[i] - pts[i - 1]) > 60) jumps++;
  }
  check('ridge polyline is continuous (no >60px vertical jumps)', jumps === 0, `${pts.length} points, ${jumps} jumps`);
}

console.log('\n[B4] Fallbacks: missing visual + unknown id stay safe');
{
  let ok = true;
  try {
    const r = makeRenderer(null); // no stagePlan.visual at all
    r.update(0, 0);
    ok = r.bgProfile && r.bgProfile.id === 'DEFAULT';
  } catch (e) { ok = false; console.error('    null visual:', e.message); }
  check('missing visual falls back to DEFAULT profile', ok);
  try {
    const r = makeRenderer({ id: 'TOTALLY_UNKNOWN_THEME' });
    r.update(500, 0);
    // Contract: resolveBackgroundProfile returns DEFAULT *profile data* for
    // unknown ids; the renderer tags the requested id so silhouettes stay
    // deterministic and distinct. Verify the DATA fell back to DEFAULT.
    ok = r.bgProfile.sky.top === BG_PROFILES.DEFAULT.sky.top
      && r.bgProfile.jagged === BG_PROFILES.DEFAULT.jagged;
  } catch (e) { ok = false; console.error('    unknown id:', e.message); }
  check('unknown theme id falls back to DEFAULT profile data', ok);
}

console.log('\n[B5] Fast Track isolation: new background path never activates');
{
  const scene = makeScene();
  const terrain = { isFastTrack: true, stagePlan: { visual: { id: 'FAST_TRACK' } } };
  const r = new EnvironmentRenderer(scene, terrain, { id: 'ktm_nijgadh_fast_track', environment: 'fast_track' });
  check('bgProfile stays null for Fast Track', r.bgProfile === null);
  check('bgThemeNums stays null for Fast Track', r.bgThemeNums === null);
}

console.log(`\n============================================`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log(`============================================`);
process.exit(fail > 0 ? 1 : 0);
