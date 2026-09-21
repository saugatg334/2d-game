// ============================================
// Nepali Racer - QA Harness: P8 Endless Run Progression
// ============================================
// Headless (no Phaser runtime) verification for the gameplay progression +
// collectible polish pass:
//   M1. Milestone indexing (275m interval) at 0 / 250 / 275 / 300 / 550 /
//       825 / 1000 / 3000+ / 10000m; next-milestone calculation.
//   M2. Milestone rewards: data-driven, modest, exactly-once awarding
//       (GameScene-style award loop never double-awards).
//   D1. Difficulty tiers resolve gradually at 0 / 300 / 750 / 1500 / 3000 /
//       10000m; no NaN/Infinity; single shared resolver.
//   D2. Difficulty-shifted terrain weights: factor 0 = base mix, factor 1 =
//       less flat + more ramp/valley, weights always sum to 1.
//   D3. Terrain simulation (normal stage): all segment Ys finite, every
//       per-segment step inside the 45px slope guard, Ys inside the stage
//       elevation envelope; flat fraction DECREASES with distance
//       (difficulty actually increases, gradually).
//   D4. Fast Track terrain is UNCHANGED: 100% deterministic (identical
//       segment geometry under different Math.random seeds) and matches the
//       documented section chain elevations.
//   S1. Collectible spacing: min same-type world-px gaps (fuel >= 220,
//       coin >= 90, diamond >= 300) hold across a 100,000m windowed run;
//       fuel cans never cluster; diamonds stay rare; item list bounded.
//   V1. Persisted run bests via SaveSystem: best distance/coins/milestone
//       survive a "page reload" (fresh instance from storage), corrupt
//       values are sanitized, old saves without the new fields still load.
//
// NOTE: Terrain/SaveSystem are imported dynamically AFTER the stubs below
// exist (same pattern as SelectionPanelLockedItemHarness).

// ---- localStorage shim (SaveSystem persists through it) ----
globalThis.localStorage = {
  _d: {},
  getItem(k) { return Object.hasOwn(this._d, k) ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; }
};

// ---- Minimal Phaser stub (Terrain uses Phaser.Math.Clamp) ----
globalThis.Phaser = {
  Math: { Clamp: (v, min, max) => Math.max(min, Math.min(max, v)) },
  Scene: class {}
};

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? ' - ' + detail : ''}`); }
  else { fail++; console.error(`  FAIL  ${name}${detail ? ' - ' + detail : ''}`); }
}

// Deterministic PRNG (mulberry32) so statistical terrain checks reproduce.
function makeSeededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const { MILESTONE_INTERVAL, milestoneIndexAt, milestoneDistanceAt, nextMilestoneDistance,
  milestoneReward, resolveDifficulty } =
  await import('../src/game/RunProgress.js');
const { Collectibles } = await import('../src/game/Collectibles.js');
const { Terrain } = await import('../src/game/Terrain.js');
const { stages } = await import('../src/data/stages.js');
const { default: SaveSystem } = await import('../src/systems/SaveSystem.js'); // class (default export)
const { SAVE_KEY } = await import('../src/config/constants.js');

// ------------------------------------------------------------------
console.log('\n[M1] Milestone indexing (275m interval, endless)');
{
  const cases = [
    [0, 0], [250, 0], [274.9, 0], [275, 1], [300, 1], [549, 1], [550, 2],
    [825, 3], [1000, 3], [3024.9, 10], [3025, 11], [10000, 36]
  ];
  let ok = true;
  for (const [d, want] of cases) {
    if (milestoneIndexAt(d) !== want) { ok = false; console.error(`    milestoneIndexAt(${d}) = ${milestoneIndexAt(d)}, want ${want}`); }
  }
  check(`milestoneIndexAt matches ${cases.length} reference distances`, ok);
  check('milestoneDistanceAt inverts milestoneIndexAt',
    [1, 2, 3, 11, 36].every(i => milestoneDistanceAt(i) === i * MILESTONE_INTERVAL));
  check('next milestone advances by exactly one interval',
    [0, 275, 300, 825].every(d => nextMilestoneDistance(d) - d > 0
      && nextMilestoneDistance(d) <= milestoneDistanceAt(milestoneIndexAt(d) + 1)));
  check('interval is within the 250-300m design band', MILESTONE_INTERVAL >= 250 && MILESTONE_INTERVAL <= 300,
    `${MILESTONE_INTERVAL}m`);
}

console.log('\n[M2] Milestone rewards (data-driven, exactly-once awarding)');
{
  const r1 = milestoneReward(1), r4 = milestoneReward(4), r8 = milestoneReward(8);
  check('base reward is coins-only and modest', r1.coins === 5 && r1.diamonds === 0 && r1.fuel === 0);
  check('every 4th milestone adds a small diamond bonus',
    r4.diamonds === 1 && milestoneReward(3).diamonds === 0 && milestoneReward(12).diamonds === 1);
  check('every 8th milestone adds a small fuel bonus',
    r8.fuel === 15 && milestoneReward(7).fuel === 0 && milestoneReward(16).fuel === 15);
  check('rewards finite for a long span of milestones',
    [1, 4, 8, 40, 100, 363].every(i => {
      const r = milestoneReward(i);
      return Number.isFinite(r.coins) && Number.isFinite(r.diamonds) && Number.isFinite(r.fuel);
    }));

  // GameScene-style award loop: advance distance, award each new milestone
  // exactly once, re-running the "frame" repeatedly must not double-award.
  let reached = 0, coins = 0, diamonds = 0, fuel = 0, awards = 0;
  const awardFrame = (distance) => {
    const k = milestoneIndexAt(distance);
    while (reached < k) {
      const idx = reached + 1;
      reached = idx;
      const r = milestoneReward(idx);
      coins += r.coins; diamonds += r.diamonds; fuel += r.fuel; awards++;
    }
  };
  for (let d = 0; d <= 3000; d += 50) { awardFrame(d); awardFrame(d); awardFrame(d); } // 3x per frame: no dupes
  check('3000m run awards exactly 10 milestones once each', awards === 10 && reached === 10, `${awards} awards`);
  check('total reward coins = 10 x 5', coins === 50, `${coins} coins`);
  check('diamond bonuses only at milestones 4 and 8', diamonds === 2, `${diamonds} diamonds`);
  check('fuel bonus only at milestone 8', fuel === 15, `${fuel} fuel`);
  // Milestone 0 distance (before first) never awards.
  reached = 0; awards = 0;
  for (let d = 0; d <= 274; d += 25) awardFrame(d);
  check('no award before the first milestone distance', awards === 0);
}

console.log('\n[D1] Difficulty tiers resolve gradually (single shared resolver)');
{
  const cases = [
    [0, 0, 'EASY', 0], [299, 0, 'EASY', 0], [300, 1, 'MODERATE', 0.25],
    [749, 1, 'MODERATE', 0.25], [750, 2, 'CHALLENGING', 0.5],
    [1499, 2, 'CHALLENGING', 0.5], [1500, 3, 'HARD', 0.75],
    [2999, 3, 'HARD', 0.75], [3000, 4, 'ADVANCED', 1],
    [10000, 4, 'ADVANCED', 1]
  ];
  let ok = true, finite = true;
  for (const [d, tier, label, factor] of cases) {
    const r = resolveDifficulty(d);
    if (r.tier !== tier || r.label !== label || r.factor !== factor) {
      ok = false; console.error(`    resolveDifficulty(${d}) -> tier ${r.tier}/${r.label}/${r.factor}, want ${tier}/${label}/${factor}`);
    }
    if (!Number.isFinite(r.factor)) finite = false;
  }
  check(`tier boundaries match at ${cases.length} distances`, ok);
  check('factors finite (no NaN/Infinity)', finite);
  check('factor never decreases as distance grows',
    [0, 250, 300, 700, 750, 1400, 1500, 2900, 3000, 5000, 10000].every((d, i, arr) =>
      i === 0 || resolveDifficulty(d).factor >= resolveDifficulty(arr[i - 1]).factor));
}

console.log('\n[D2] Difficulty-shifted terrain feature weights');
{
  const base = { flat: 0.36, up: 0.27, down: 0.27, ramp: 0.03, valley: 0.07 };
  const t = Object.create(Terrain.prototype);
  const sum = (w) => w.flat + w.up + w.down + w.ramp + w.valley;
  const w0 = t.difficultyShiftedWeights(base, 0);
  const w1 = t.difficultyShiftedWeights(base, 1);
  check('factor 0 keeps the base mix', Math.abs(w0.flat - base.flat) < 1e-9 && Math.abs(w0.ramp - base.ramp) < 1e-9);
  check('factor 1 reduces flat weight', w1.flat < w0.flat, `${w0.flat.toFixed(3)} -> ${w1.flat.toFixed(3)}`);
  check('factor 1 increases ramp/valley weight', w1.ramp > w0.ramp && w1.valley > w0.valley);
  // Hill up/down weights are never SCALED by difficulty (renormalization only);
  // the up:down balance is preserved so slopes are never steepened directly.
  check('hill up:down balance preserved (slopes never steepened)',
    Math.abs(w0.up - w0.down) < 1e-9 && Math.abs(w1.up - w1.down) < 1e-9
    && Math.abs(w1.up / w1.down - w0.up / w0.down) < 1e-9);
  check('weights always sum to 1', Math.abs(sum(w0) - 1) < 1e-9 && Math.abs(sum(w1) - 1) < 1e-9);
  check('flat weight monotonically non-increasing across factors',
    [0, 0.25, 0.5, 0.75, 1].every((f, i, arr) =>
      i === 0 || t.difficultyShiftedWeights(base, f).flat <= t.difficultyShiftedWeights(base, arr[i - 1]).flat));
  check('invalid factor treated as 0 (safe fallback)',
    Math.abs(t.difficultyShiftedWeights(base, NaN).flat - base.flat) < 1e-9);
}

// Shared scene mock for Terrain runs.
function makeTerrainScene(stage) {
  return {
    stage,
    add: { graphics: () => ({ clear() {}, fillStyle() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fillPath() {}, lineStyle() {}, strokePath() {}, fillCircle() {}, strokeCircle() {}, fillRect() {}, strokeRect() {}, fillTriangle() {}, strokeTriangle() {}, arc() {} }) },
    scale: { width: 1280, height: 720 },
    cameras: { main: { scrollX: 0 } }
  };
}

console.log('\n[D3] Terrain difficulty simulation (normal endless stage)');
{
  const stage = stages.find(s => s.id === 'ktm_valley'); // rolling_hills, difficulty 1
  const runTerrain = (seed) => {
    const realRandom = Math.random;
    Math.random = makeSeededRandom(seed);
    try {
      const terrain = new Terrain(makeTerrainScene(stage), stage.theme);
      terrain.generate();
      const segs = [];
      while (terrain.endX < 10000) { terrain.generateNextSegment(terrain.endX); }
      segs.push(...terrain.segments);
      return segs;
    } finally { Math.random = realRandom; }
  };
  const segs = runTerrain(12345);
  const maxHeight = stage.terrain.maxHeight;
  const groundY = 720 - 100;
  let okFinite = true, okSlope = true, okEnvelope = true;
  for (const s of segs) {
    if (!Number.isFinite(s.startY) || !Number.isFinite(s.endY)) okFinite = false;
    if (Math.abs(s.endY - s.startY) > 45 + 1e-9) okSlope = false; // MAX_STEP guard
    if (s.endY < groundY - maxHeight - 1e-9 || s.endY > groundY + 80 + 1e-9) okEnvelope = false;
  }
  check('all segment Ys finite across a 10,000m run', okFinite, `${segs.length} segments`);
  check('every per-segment step stays inside the 45px slope guard', okSlope);
  check('all Ys stay inside the stage elevation envelope', okEnvelope);

  // Deterministic gradualness: the resolved FLAT PICK WEIGHT strictly
  // decreases with distance and stays proportional (no cliff).
  const probe = new Terrain(makeTerrainScene(stage), stage.theme);
  const flatAt = (d) =>
    probe.difficultyShiftedWeights(probe.legacyTerrain.weights, resolveDifficulty(d).factor).flat;
  const nearW = flatAt(600), farW = flatAt(9000);
  check('flat pick weight decreases gradually with distance',
    farW < nearW && farW > nearW * 0.4, `${nearW.toFixed(3)} @600m -> ${farW.toFixed(3)} @9000m`);

  // Statistical: flat SEGMENT fraction past the starting platform must be
  // lower far out than near the start, averaged over seeded runs. 60 runs
  // give enough samples for a stable direction despite the random process.
  const RUNS = 60;
  let nearFlat = 0, nearTotal = 0, farFlat = 0, farTotal = 0;
  for (let r = 0; r < RUNS; r++) {
    const s = runTerrain(1000 + r * 7919);
    for (const seg of s) {
      if (seg.startX >= 600 && seg.startX < 1600) { nearTotal++; if (seg.isFlat) nearFlat++; }
      if (seg.startX >= 9000) { farTotal++; if (seg.isFlat) farFlat++; }
    }
  }
  const nearFrac = nearFlat / nearTotal, farFrac = farFlat / farTotal;
  check(`flat segment fraction decreases with distance (${RUNS} runs)`,
    farFrac < nearFrac, `near ${(nearFrac * 100).toFixed(1)}% -> far ${(farFrac * 100).toFixed(1)}%`);
}

console.log('\n[D4] Fast Track terrain unchanged (deterministic, no difficulty shift)');
{
  const ftStage = stages.find(s => s.id === 'ktm_nijgadh_fast_track');
  const runFT = (seed) => {
    const realRandom = Math.random;
    Math.random = seed === null ? realRandom : makeSeededRandom(seed);
    try {
      const terrain = new Terrain(makeTerrainScene(ftStage), ftStage.theme);
      terrain.generate();
      while (terrain.endX < 2500) terrain.generateNextSegment(terrain.endX);
      return terrain.segments.map(s => [s.startX, s.endX, Math.round(s.endY * 1e6) / 1e6]);
    } finally { Math.random = realRandom; }
  };
  const a = runFT(111), b = runFT(999999);
  check('Fast Track geometry identical under different random seeds', JSON.stringify(a) === JSON.stringify(b),
    `${a.length} segments`);
  check('Fast Track detects as Fast Track (legacy path, not legacy segments)', (() => {
    const realRandom = Math.random; Math.random = makeSeededRandom(7);
    try { const t = new Terrain(makeTerrainScene(ftStage), ftStage.theme); return t.isFastTrack === true; }
    finally { Math.random = realRandom; }
  })());
  // Documented chain elevations (platform flat, hill climb end, bridge, tunnel).
  const groundY = 720 - 100;
  const endYAt = (segs, x) => { const s = segs.find(v => v[1] === x); return s ? s[2] : NaN; }; // v[1]=endX
  check('start platform flat at groundY', endYAt(a, 400) === groundY, `endY(400)=${endYAt(a, 400)}`);
  check('hill_climb ends at groundY-80', endYAt(a, 600) === groundY - 80, `endY(600)=${endYAt(a, 600)}`);
  check('tunnel floor at groundY-20', endYAt(a, 1600) === groundY - 20, `endY(1600)=${endYAt(a, 1600)}`);
}

console.log('\n[S1] Collectible spacing across a 100,000m windowed run');
{
  const scene = { add: { graphics: () => ({ clear() {} }) }, scale: { width: 1280 } };
  const terrain = { getTerrainYAt: (x) => 500 - Math.sin(x / 300) * 40 };
  const c = new Collectibles(scene, terrain, { coinChance: 0.7, fuelChance: 0.2, diamondChance: 0.1 });
  c.initialize();
  const counts = { coin: 0, fuel: 0, diamond: 0 };
  const lastX = { coin: -Infinity, fuel: -Infinity, diamond: -Infinity };
  const minGap = { coin: Infinity, fuel: Infinity, diamond: Infinity };
  const seen = new Set(); // items persist across iterations; measure each spawn once
  let camX = 0, maxLen = 0, okFinite = true, cursorPrev = -Infinity, cursorOk = true;
  const STEP = 200;
  for (let i = 0; i < Math.ceil(100000 / STEP); i++) {
    camX = Math.min(i * STEP, 100000 - 1);
    c.generateAhead(camX, 100000);
    for (const item of c.items) {
      if (seen.has(item)) continue;
      seen.add(item);
      if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) okFinite = false;
      const gap = item.x - lastX[item.type];
      if (gap < minGap[item.type]) minGap[item.type] = gap;
      lastX[item.type] = item.x;
      counts[item.type]++;
    }
    if (typeof c.nextSpawnX === 'number') {
      if (c.nextSpawnX < cursorPrev) cursorOk = false;
      cursorPrev = c.nextSpawnX;
    }
    c.cleanup(camX);
    maxLen = Math.max(maxLen, c.items.length);
  }
  const total = counts.coin + counts.fuel + counts.diamond;
  check('no NaN/Infinity item coords', okFinite);
  check('spawn cursor monotonic', cursorOk);
  check('item list stays bounded', maxLen <= 80, `max items=${maxLen}`);
  check('fuel-to-fuel minimum gap >= 220 world px', minGap.fuel >= 220, `min ${Math.round(minGap.fuel)}px over ${counts.fuel} cans`);
  check('coin-to-coin minimum gap >= 90 world px', minGap.coin >= 90, `min ${Math.round(minGap.coin)}px over ${counts.coin} coins`);
  check('diamond-to-diamond minimum gap >= 300 world px', minGap.diamond >= 300, `min ${Math.round(minGap.diamond)}px`);
  check('diamonds stay rare (<15% of spawns)', counts.diamond / total < 0.15,
    `${counts.diamond}/${total} = ${((counts.diamond / total) * 100).toFixed(1)}%`);
  check('coins remain plentiful (>55% of spawns)', counts.coin / total > 0.55,
    `${counts.coin}/${total} = ${((counts.coin / total) * 100).toFixed(1)}%`);
  check('all three types spawn over the full run', counts.fuel > 70 && counts.diamond > 30,
    `fuel=${counts.fuel} diamond=${counts.diamond}`);
}

console.log('\n[V1] Run bests persist via SaveSystem (version/default-safe)');
{
  // Fresh storage: a run's bests are written and survive a "reload".
  localStorage.removeItem(SAVE_KEY);
  const s1 = new SaveSystem();
  s1.updateBestDistance(3412);
  s1.updateBestRunCoins(148);
  s1.updateBestMilestone(11);
  const s2 = new SaveSystem(); // simulates page reload
  check('best distance survives reload', s2.getBestDistance() === 3412, `${s2.getBestDistance()}`);
  check('best run coins survive reload', s2.getBestRunCoins() === 148, `${s2.getBestRunCoins()}`);
  check('best milestone survives reload', s2.getBestMilestone() === 11, `${s2.getBestMilestone()}`);
  check('best setters reject non-finite values', (() => {
    s2.updateBestDistance(NaN); s2.updateBestDistance(Infinity);
    return s2.getBestDistance() === 3412;
  })());
  check('lower runs never replace bests', (() => {
    s2.updateBestDistance(100); s2.updateBestMilestone(3);
    return s2.getBestDistance() === 3412 && s2.getBestMilestone() === 11;
  })());

  // Corrupt stored values are sanitized instead of poisoning the game.
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    schemaVersion: 1, coins: 'corrupt', bestDistance: 'oops', bestMilestone: null
  }));
  const s3 = new SaveSystem();
  check('corrupt numeric fields sanitize to defaults',
    s3.getBestDistance() === 0 && s3.getBestMilestone() === 0 && s3.data.coins === 0);

  // An old save without the new fields must still load (default-safe).
  localStorage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 1, coins: 50, diamonds: 4 }));
  const s4 = new SaveSystem();
  check('legacy save without new fields loads with defaults',
    s4.data.coins === 50 && s4.getBestRunCoins() === 0 && s4.getBestMilestone() === 0
      && s4.getBestDistance() === 0 && Array.isArray(s4.data.unlockedStages));
}

console.log(`\n============================================`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log(`============================================`);
process.exit(fail > 0 ? 1 : 0);
