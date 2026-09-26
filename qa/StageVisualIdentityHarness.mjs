// ============================================
// Nepali Racer - QA Harness: Stage Visual Identity (P12)
// ============================================
// Headless verification of the P12 stage-identity pass:
//   SV1. KTM Valley (pilot) resolves a NON-default identity with all required
//        fields present and finite/valid.
//   SV2. Every other stage (including khokana, the other KTM_URBAN stage, and
//        both Fast Track stages) still resolves the pre-P12 default identity.
//   SV3. No NaN/undefined anywhere in any resolved field (all 50 stages).
//   SV4. Rendering budget: windowed generation only — item counts stay
//        bounded by the scenery window, never scaled to the 100,000m run.
// Pure logic only — SceneryRenderer is Phaser-free (Graphics-command stubs).
import { stages } from '../src/data/stages.js';
import {
  resolveStageVisualIdentity, isIdentityValid, blendTint, ROAD_MATERIALS
} from '../src/game/StageVisualIdentity.js';

let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label); }
};

console.log('[SV1] KTM Valley pilot identity');
{
  const ktm = stages.find(s => s.id === 'ktm_valley');
  ok(!!ktm, 'ktm_valley stage exists');
  const id = resolveStageVisualIdentity(ktm);
  ok(id && id.isDefault === false, 'identity is non-default');
  ok(id.themeId === 'KTM_URBAN', 'resolves through the KTM_URBAN region theme');
  ok(isIdentityValid(id), 'identity passes full shape/validity check');
  ok(id.farSilhouette.kind === 'valley-hills', 'far silhouette is valley-hills (valley rim)');
  ok(Array.isArray(id.farSilhouette.urbanBand) === false && id.farSilhouette.urbanBand !== undefined && id.farSilhouette.urbanBand !== null ? true : id.farSilhouette.urbanBand === null || typeof id.farSilhouette.urbanBand === 'object', 'urbanBand field present');
  ok(id.midLandmarks.some(lm => lm.kind === 'temple' && lm.spacing === 2600),
    'pagoda temples spaced at 2600m (pilot override, was 4200m generic)');
  ok(id.roadMaterial === 'paved', 'road material reads as paved');
  ok(id.roadFeatures.wires === true && id.roadFeatures.wireSpan > 0, 'pole wires configured with a positive span');
  ok(id.templeStyle === 'pagoda', 'temple style is pagoda');
  ok(typeof id.groundTint === 'string' && /^#[0-9a-fA-F]{6}$/.test(id.groundTint), 'groundTint is a valid hex color');
  ok(id.skyGradient && typeof id.skyGradient.top === 'string' && typeof id.skyGradient.bottom === 'string', 'sky gradient present');
  // Blend helper sanity (used by Terrain for the ground tint).
  ok(blendTint('#6b7a4f', id.groundTint, 0.45) !== '#6b7a4f', 'ground tint actually shifts the KTM ground color');
  ok(blendTint('#6b7a4f', id.groundTint, 0) === '#6b7a4f', 'blend amount 0 is a no-op');
  ok(blendTint('garbage', id.groundTint, 0.45) === 'garbage', 'blend is defensive on malformed input');
}

console.log('[SV2] All other stages keep the default identity (no regression)');
{
  const others = stages.filter(s => s.id !== 'ktm_valley');
  ok(others.length === stages.length - 1, 'non-pilot stage count sane (' + others.length + ')');
  let allDefault = true;
  let khokanaDefault = true;
  let fastTrackDefault = true;
  for (const s of others) {
    const id = resolveStageVisualIdentity(s);
    if (!id || id.isDefault !== true) { allDefault = false; console.log('    non-default: ' + s.id); }
    if (s.id === 'khokana' && id.isDefault !== true) khokanaDefault = false;
    if (s.terrain && s.terrain.profile === 'expressway' && id.isDefault !== true) fastTrackDefault = false;
  }
  ok(allDefault, 'all ' + others.length + ' non-pilot stages resolve isDefault=true');
  ok(khokanaDefault, 'khokana (sibling KTM_URBAN stage) keeps the default identity');
  ok(fastTrackDefault, 'both Fast Track stages keep the default identity (untouched path)');
  // Malformed input safety.
  ok(resolveStageVisualIdentity(null).isDefault === true, 'null stage -> default identity');
  ok(resolveStageVisualIdentity({}).isDefault === true, 'empty stage -> default identity');
  ok(resolveStageVisualIdentity({ id: 'ktm_valley', regionTheme: 'NOPE' }).isDefault === true,
    'unknown theme on pilot id -> default (theme resolver fallback)');
  // Determinism.
  const a = resolveStageVisualIdentity(stages.find(s => s.id === 'ktm_valley'));
  const b = resolveStageVisualIdentity(stages.find(s => s.id === 'ktm_valley'));
  ok(JSON.stringify(a) === JSON.stringify(b), 'resolver is deterministic (memoized)');
  ok(ROAD_MATERIALS.includes('dirt') && ROAD_MATERIALS.includes('paved'), 'road material vocabulary intact');
}

console.log('[SV3] No NaN/undefined in any resolved field (all stages)');
{
  const deepFinite = (v, path, bad) => {
    if (v === undefined) { bad.push(path + '=undefined'); return; }
    if (typeof v === 'number' && !Number.isFinite(v)) { bad.push(path + '=NaN/nonfinite'); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => deepFinite(x, path + '[' + i + ']', bad)); return; }
    if (v && typeof v === 'object') { for (const k of Object.keys(v)) deepFinite(v[k], path + '.' + k, bad); }
  };
  let bad = [];
  for (const s of stages) deepFinite(resolveStageVisualIdentity(s), s.id, bad);
  ok(bad.length === 0, 'all 50 identities deep-clean (no undefined/NaN)' + (bad.length ? ': ' + bad.slice(0, 5).join(', ') : ''));
  const shapeOk = stages.every(s => isIdentityValid(resolveStageVisualIdentity(s)));
  ok(shapeOk, 'all 50 identities pass isIdentityValid');
}

console.log('[SV4] Rendering budget: windowed generation, never full-run');
{
  // Simulate SceneryRenderer.update() across a full 100,000m run with the
  // pilot identity and count ACTIVE items + total draw commands. Active items
  // must stay bounded by the window (~3200m ahead), not by run length.
  const GRAPHICS_OPS_LIMIT = 4000; // generous per-frame draw-command budget
  const calls = [];
  const g = new Proxy({}, {
    get(t, prop) {
      if (prop === 'isProxy') return true;
      return (...args) => { if (calls.length < 1e7) calls.push(prop); };
    }
  });
  // Import the real renderer and drive it with stubs.
  const { SceneryRenderer } = await import('../src/game/SceneryRenderer.js');
  const ktm = stages.find(s => s.id === 'ktm_valley');
  const terrainStub = {
    isFastTrack: false,
    getTerrainYAt: () => 600,
    getTerrainAngleAt: () => 0
  };
  const textStub = () => ({
    setText() { return this; }, setOrigin() { return this; }, setPosition() { return this; },
    setVisible() { return this; }, setDepth() { return this; }, setStyle() { return this; }, destroy() {}
  });
  const sceneStub = { add: { graphics: () => g, text: textStub } };
  // plan.visual must be the FULL resolved region theme (scenery/vegetation
  // densities etc.), exactly like StagePlan.resolveStagePlan provides.
  const { resolveRegionTheme } = await import('../src/data/regionThemes.js');
  const planStub = { stageId: ktm.id, visual: resolveRegionTheme('KTM_URBAN') };
  const renderer = new SceneryRenderer(sceneStub, terrainStub, planStub);
  ok(renderer.enabled === true, 'pilot stage enables SceneryRenderer');
  ok(renderer.identity && renderer.identity.isDefault === false, 'renderer resolved the pilot identity');
  ok(renderer.identityLandmarkSpacing.temple === 2600, 'renderer consumes the identity temple spacing');
  ok(renderer.identityLandmarkSpacing.pole === 520, 'pole spacing falls back to the identity default (520)');

  // Fast-forward walk: 100,000m in camera steps.
  const STEP = 400;
  let maxItems = 0;
  calls.length = 0;
  for (let cam = 0; cam <= 100000; cam += STEP) {
    renderer.update(cam);
    if (renderer.items.length > maxItems) maxItems = renderer.items.length;
  }
  ok(maxItems <= 220, 'active items stay window-bounded across 100,000m (max ' + maxItems + ' <= 220)');
  ok(calls.length / Math.ceil(100000 / STEP) < GRAPHICS_OPS_LIMIT,
    'avg draw commands per frame ' + Math.round(calls.length / Math.ceil(100000 / STEP)) + ' < ' + GRAPHICS_OPS_LIMIT);
  // Determinism: re-run a window, same item placement.
  const r2 = new SceneryRenderer(sceneStub, terrainStub, planStub);
  r2.update(0); r2.update(8000);
  const r3 = new SceneryRenderer(sceneStub, terrainStub, planStub);
  r3.update(8000);
  ok(JSON.stringify(r2.items) === JSON.stringify(r3.items),
    'incremental generation equals catch-up generation (deterministic)');
}

console.log('\n============================================');
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
console.log('============================================');
if (fail > 0) process.exit(1);
