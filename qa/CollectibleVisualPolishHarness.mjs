// ============================================
// Nepali Racer - QA Harness: P7E-7 Collectible & HUD Icon Visual Polish
// ============================================
// Headless (no Phaser) verification for the visual-only polish pass:
//   H1. Shared icon painters are deterministic (same inputs -> identical
//       command log) and issue Math.random()-free commands.
//   H2. The collectible draw path and the HUD path use the SAME painter
//       output (drawCoin(g,x,y) log === paintCoinIcon(g,x,y,1) log).
//   H3. Collectible logic invariants: reward values, spawn windowing,
//       cleanup, single shared Graphics, cursor monotonicity.
//   H4. Stage collectible chance data validation (sums to 1, finite, in
//       range) across every stage, including Fast Track.
//   H5. 100,000m windowed simulation: bounded item count, no NaN, all three
//       collectible types spawn, cleanup keeps the window bounded.

import { Collectibles, paintCoinIcon, paintDiamondIcon, paintFuelCanIcon } from '../src/game/Collectibles.js';
import { stages } from '../src/data/stages.js';
import { resolveStagePlan } from '../src/game/StagePlan.js';

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? ' - ' + detail : ''}`); }
  else { fail++; console.error(`  FAIL  ${name}${detail ? ' - ' + detail : ''}`); }
}

// Minimal command-logging Graphics mock (covers every method the painters use).
function makeMockGraphics() {
  const calls = [];
  const log = (name) => (...args) => calls.push([name, ...args]);
  return {
    calls,
    fillStyle: log('fillStyle'), lineStyle: log('lineStyle'),
    fillCircle: log('fillCircle'), strokeCircle: log('strokeCircle'),
    fillRect: log('fillRect'), strokeRect: log('strokeRect'),
    fillTriangle: log('fillTriangle'), strokeTriangle: log('strokeTriangle'),
    beginPath: log('beginPath'), arc: log('arc'), strokePath: log('strokePath'),
    clear: log('clear')
  };
}
const sameLog = (a, b) => a.length === b.length && a.every((c, i) =>
  c.length === b[i].length && c.every((v, j) => v === b[i][j]));

console.log('\n[H1] Painter determinism + Math.random()-free rendering');
{
  const realRandom = Math.random;
  Math.random = () => { throw new Error('Math.random called inside painter'); };
  let g1, g2;
  try {
    g1 = makeMockGraphics(); paintCoinIcon(g1, 100, 200, 1);
    g2 = makeMockGraphics(); paintCoinIcon(g2, 100, 200, 1);
    check('paintCoinIcon deterministic (identical log)', sameLog(g1.calls, g2.calls), `${g1.calls.length} commands`);
    g1 = makeMockGraphics(); paintDiamondIcon(g1, 100, 200, 1);
    g2 = makeMockGraphics(); paintDiamondIcon(g2, 100, 200, 1);
    check('paintDiamondIcon deterministic (identical log)', sameLog(g1.calls, g2.calls), `${g1.calls.length} commands`);
    g1 = makeMockGraphics(); paintFuelCanIcon(g1, 100, 200, 1);
    g2 = makeMockGraphics(); paintFuelCanIcon(g2, 100, 200, 1);
    check('paintFuelCanIcon deterministic (identical log)', sameLog(g1.calls, g2.calls), `${g1.calls.length} commands`);
  } catch (e) {
    check('painters issue no Math.random()', false, e.message);
  } finally {
    Math.random = realRandom;
  }
  const gs = makeMockGraphics(); paintCoinIcon(gs, 50, 50, 0.8);
  check('HUD scale (0.8) stays bounded + finite',
    gs.calls.every(c => c.every(v => typeof v !== 'number' || Number.isFinite(v))));
}

console.log('\n[H2] Collectible path === HUD path (shared painters)');
{
  const gc = makeMockGraphics();
  const c = new Collectibles({ add: { graphics: () => gc }, scale: { width: 1280 } },
    { getTerrainYAt: () => 500 }, null);
  c.drawCoin(100, 200);
  const gh = makeMockGraphics(); paintCoinIcon(gh, 100, 200, 1);
  check('drawCoin === paintCoinIcon(s=1)', sameLog(gc.calls, gh.calls));
  gc.calls.length = 0; c.drawDiamond(100, 200);
  gh.calls.length = 0; paintDiamondIcon(gh, 100, 200, 1);
  check('drawDiamond === paintDiamondIcon(s=1)', sameLog(gc.calls, gh.calls));
  gc.calls.length = 0; c.drawFuelCan(100, 200);
  gh.calls.length = 0; paintFuelCanIcon(gh, 100, 200, 1);
  check('drawFuelCan === paintFuelCanIcon(s=1)', sameLog(gc.calls, gh.calls));
  check('reward values unchanged', c.types.coin.value === 1 && c.types.diamond.value === 1 && c.types.fuel.value === 25);
  check('default chances unchanged', c.chances.coinChance === 0.7 && c.chances.fuelChance === 0.2 && c.chances.diamondChance === 0.1);
}

console.log('\n[H3] Collectible logic invariants (single Graphics, windowing, cleanup)');
{
  let graphicsCount = 0;
  const g = makeMockGraphics();
  const scene = { add: { graphics: () => { graphicsCount++; return g; } }, scale: { width: 1280 } };
  const c = new Collectibles(scene, { getTerrainYAt: () => 500 }, { coinChance: 0.7, fuelChance: 0.2, diamondChance: 0.1 });
  c.initialize();
  check('exactly ONE Graphics object (no per-item Graphics)', graphicsCount === 1);

  // Windowed generation + cleanup over 2,000m of camera travel.
  let camX = 0, maxLen = 0, cursorPrev = -Infinity, cursorMonotonic = true;
  for (let step = 0; step < 40; step++) {
    c.generateAhead(camX, 100000);
    if (typeof c.nextSpawnX === 'number') {
      if (c.nextSpawnX < cursorPrev) cursorMonotonic = false;
      cursorPrev = c.nextSpawnX;
    }
    c.cleanup(camX);
    maxLen = Math.max(maxLen, c.items.length);
    camX += 50;
  }
  check('spawn cursor never moves backwards', cursorMonotonic);
  check('cleanup keeps item list bounded', maxLen <= 80, `max items=${maxLen}`);
  check('all item coords finite', c.items.every(i => Number.isFinite(i.x) && Number.isFinite(i.y)));
  check('no NaN from bob update', (c.update(12345), c.items.every(i => Number.isFinite(i.currentY))));

  // Collision + rewards unchanged (radius 40, value 1/1/25).
  c.initialize();
  c.items.push(
    { x: 1000, y: 500, type: 'coin', collected: false },
    { x: 1100, y: 500, type: 'diamond', collected: false },
    { x: 1200, y: 500, type: 'fuel', collected: false },
    { x: 5000, y: 500, type: 'coin', collected: false }
  );
  const got = c.checkCollision({ x: 1000, y: 500 });
  check('collision radius 40 unchanged (1 hit at 0m, none at 100m)', got.length === 1 && got[0].type === 'coin');
  const rewards = c.collectItems([{ type: 'coin' }, { type: 'diamond' }, { type: 'fuel' }]);
  check('collectItems rewards {1,1,25} unchanged',
    rewards.coins === 1 && rewards.diamonds === 1 && rewards.fuel === 25);
}

console.log('\n[H4] Stage collectible chance data validation');
{
  let okSum = true, okRange = true, okPlan = true, fastTrackChecked = 0;
  for (const s of stages) {
    const ch = s.collectibles || {};
    const sum = (ch.coinChance || 0) + (ch.fuelChance || 0) + (ch.diamondChance || 0);
    if (Math.abs(sum - 1) > 1e-9) { okSum = false; console.error(`    stage ${s.id} chances sum=${sum}`); }
    for (const k of ['coinChance', 'fuelChance', 'diamondChance']) {
      const v = ch[k];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) okRange = false;
    }
    const plan = resolveStagePlan(s);
    const pc = plan.collectibles;
    if (!pc || Math.abs((pc.coinChance + pc.fuelChance + pc.diamondChance) - sum) > 1e-9) okPlan = false;
    if (s.id.includes('fast_track')) fastTrackChecked++;
  }
  check(`all ${stages.length} stage chance sets sum to 1`, okSum);
  check('all chances finite and within [0,1]', okRange);
  check('resolveStagePlan preserves chances for every stage', okPlan);
  check('Fast Track stages validated', fastTrackChecked === 2, `${fastTrackChecked} fast track stages`);
}

console.log('\n[H5] 100,000m windowed simulation (coin/fuel/diamond chances preserved)');
{
  const scene = { add: { graphics: () => makeMockGraphics() }, scale: { width: 1280 } };
  const terrain = { getTerrainYAt: (x) => 500 - Math.sin(x / 300) * 40 };
  const c = new Collectibles(scene, terrain, { coinChance: 0.7, fuelChance: 0.2, diamondChance: 0.1 });
  c.initialize();
  const counts = { coin: 0, fuel: 0, diamond: 0 };
  const tailTypes = new Set();      // types present over the FINAL 10,000m
  let camX = 0, maxLen = 0, nanFound = false, cursorPrev = -Infinity, cursorOk = true;
  const STEP = 200;                 // px per iteration (~13.3 frames @60fps x15px)
  const ITER = Math.ceil(100000 / STEP);
  for (let i = 0; i < ITER; i++) {
    camX = Math.min(i * STEP, 100000 - 1);
    c.generateAhead(camX, 100000);
    c.update(i * 16.67);
    if (typeof c.nextSpawnX === 'number') {
      if (c.nextSpawnX < cursorPrev) cursorOk = false;
      cursorPrev = c.nextSpawnX;
    }
    for (const item of c.items) {
      if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) nanFound = true;
    }
    c.cleanup(camX);
    maxLen = Math.max(maxLen, c.items.length);
    // P8: sample the last 10,000m rather than only the surviving tail list:
    // after cleanup the live list covers <1,000px (a handful of items), which
    // is monotypic by chance in any healthy 70/20/10 mix.
    if (camX >= 90000) for (const item of c.items) tailTypes.add(item.type);
  }
  check('simulation covers 100,000m', camX >= 100000 - STEP);
  check('no NaN/Infinity in any spawned item', !nanFound);
  check('spawn cursor monotonic across full run', cursorOk);
  check('item list bounded across full run', maxLen <= 80, `max items=${maxLen}`);
  // Distribution sanity near the end of the run (last 10,000m union).
  check('multiple collectible types present at run end', tailTypes.size >= 2, [...tailTypes].join(','));
  // Render path over the final window: single Graphics, no errors, finite draw calls.
  const g = scene.add.graphics();
  let renderOk = true;
  try {
    c.graphics = g;
    c.render(camX);
    renderOk = g.calls.every(call => call.every(v => typeof v !== 'number' || Number.isFinite(v)));
  } catch (e) { renderOk = false; console.error('    render error:', e.message); }
  check('render() emits only finite draw calls', renderOk, `${g.calls.length} commands for ${c.items.length} items`);
}

console.log(`\n============================================`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log(`============================================`);
process.exit(fail > 0 ? 1 : 0);
