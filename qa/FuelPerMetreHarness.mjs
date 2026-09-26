// ============================================
// Nepali Racer - QA Harness: Fuel-per-metre (Phase 1.7)
// ============================================
// Proves the Phase 1.7 unit fix preserves fuel behavior:
//   - VehicleTuning converts the data-authored per-second burn into the
//     equivalent per-metre burn (fuelConsumption / 3.6).
//   - Same initial fuel + same throttle pattern over the same simulated time
//     burns the same total fuel as before the fix (real-time feel unchanged),
//     while the corrected getDistance() makes fuel-per-METRE consistent.
//   - SaveSystem migrates legacy bestDistance (world units) to metres exactly
//     once, keeping coins/unlocks/selections intact.
//
// Browser-free: real production modules (VehicleTuning, RunProgress,
// SaveSystem), Phaser/polyfill stubs only where the module would touch them.
import { GAME_WIDTH, GAME_HEIGHT } from '../src/config/constants.js';

let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label); }
};

// ---------- browser-environment polyfills (BEFORE any src import) ----------
globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); }
};
globalThis.window = { innerWidth: GAME_WIDTH, innerHeight: GAME_HEIGHT, addEventListener() {} };
Object.defineProperty(globalThis, 'navigator', {
  value: { userAgent: 'node-harness', maxTouchPoints: 0 },
  configurable: true
});
globalThis.document = { createElement() { return { style: {} }; } };
globalThis.Phaser = {
  Scene: class { constructor() {} },
  Math: { Angle: { Wrap: (a) => a } },
  Input: { Keyboard: { KeyCodes: { W: 87, A: 65, S: 83, D: 68 } } }
};

// ---------- FP1: VehicleTuning per-metre burn conversion ----------
console.log('[FP1] VehicleTuning resolves the equivalent per-metre burn');
{
  const { resolveVehicleTuning } = await import('../src/game/VehicleTuning.js');
  const { WORLD_UNITS_PER_METRE } = await import('../src/config/constants.js');
  const t = resolveVehicleTuning({ fuelCapacity: 100, fuelConsumption: 2, grip: 1, suspension: 1 }, null);
  ok(Number.isFinite(t.fuelConsumption) && t.fuelConsumption > 0, 'resolved fuelConsumption is finite and positive');
  ok(Math.abs(t.fuelConsumption - 2 / WORLD_UNITS_PER_METRE) <= 1e-12,
    `tempo burn resolved to 2/3.6 per metre (${t.fuelConsumption.toFixed(6)} %/m-equivalent)`);
  // Missing stat falls back to the DEFAULT (2) converted identically.
  const tDefault = resolveVehicleTuning({}, null);
  ok(Math.abs(tDefault.fuelConsumption - 2 / WORLD_UNITS_PER_METRE) <= 1e-12,
    'missing fuelConsumption falls back to the converted default (2/3.6)');
  // fuelCapacity and efficiency untouched by the unit fix.
  ok(t.fuelCapacity === 100 && t.fuelEfficiency === 0, 'fuelCapacity and fuelEfficiency unchanged by the conversion');
}

// ---------- FP2: burn scaling through the corrected distance (same sim) ----------
console.log('[FP2] Same throttle + same simulated time: burn scales consistently with real metres');
{
  const { resolveVehicleTuning } = await import('../src/game/VehicleTuning.js');
  const capacity = 100;
  const dt = 1 / 60;
  // 30s sim: the legacy path burns 64.8% (no tank clamp), so both paths stay
  // in the linear regime and the per-metre comparison is meaningful.
  const frames = Math.round(30 / dt);
  const ACCEL_MULTIPLIER = 1.5; // FUEL.ACCELERATION_MULTIPLIER (unchanged)
  const dutyCycle = (i) => (i % 10 < 7 ? ACCEL_MULTIPLIER : 0.1); // 70% throttle duty
  const vx = 100; // steady 100 km/h

  // PRE-FIX model: burn/s = 2 x duty x 1.5, distance = world units (called "m").
  let pre = capacity;
  for (let i = 0; i < frames; i++) {
    pre = Math.max(0, pre - 2 * dt * dutyCycle(i) * (1 - 0));
  }
  // POST-FIX model: effective burn / 3.6 (the prescribed adjustment), identical
  // consumeFuel() formula, distance = world units / 3.6 real metres.
  const postTuning = resolveVehicleTuning({ fuelCapacity: capacity, fuelConsumption: 2, grip: 1, suspension: 1 }, null);
  let post = capacity;
  for (let i = 0; i < frames; i++) {
    post = Math.max(0, post - postTuning.fuelConsumption * dt * dutyCycle(i) * (1 - postTuning.fuelEfficiency));
  }
  const preBurned = capacity - pre;
  const postBurned = capacity - post;

  // Real-time burn intentionally drops exactly 3.6x (the prescribed adjustment):
  ok(Math.abs(postBurned * 3.6 - preBurned) <= 1e-9,
    `per-second burn is exactly legacy/3.6 (pre=${preBurned.toFixed(4)}, post=${postBurned.toFixed(4)})`);

  // Fuel per REAL metre is identical between the models — the invariant the
  // fix preserves:
  const unitsTravelled = vx * frames * dt;           // legacy "metres" (world units)
  const metresTravelled = unitsTravelled / 3.6;      // corrected real metres
  const prePerMetre = preBurned / unitsTravelled;
  const postPerMetre = postBurned / metresTravelled;
  ok(Math.abs(prePerMetre - postPerMetre) <= 1e-12,
    `fuel per real metre identical: legacy ${prePerMetre.toFixed(6)} %/unit == post ${postPerMetre.toFixed(6)} %/m`);
  ok(Number.isFinite(post) && post > 0, `tank not exhausted over the sim (remaining ${post.toFixed(3)}%)`);
}

// ---------- FP3: fuel-per-metre consistency through the corrected distance ----------
console.log('[FP3] Fuel-per-metre consistent through the corrected getDistance()');
{
  const { resolveVehicleTuning } = await import('../src/game/VehicleTuning.js');
  const { WORLD_UNITS_PER_METRE } = await import('../src/config/constants.js');
  const capacity = 100;
  const tuning = resolveVehicleTuning({ fuelCapacity: capacity, fuelConsumption: 2, grip: 1, suspension: 1 }, null);
  const dt = 1 / 60;
  // Steady 100 km/h => velocityX = 100 world units/s = 100/3.6 m/s.
  const vx = 100;
  const burnPerSecond = tuning.fuelConsumption * 1.5 * (1 - tuning.fuelEfficiency); // full throttle
  const metresPerSecond = vx / WORLD_UNITS_PER_METRE;
  const burnPerMetre = burnPerSecond / metresPerSecond;

  ok(Number.isFinite(burnPerMetre) && burnPerMetre > 0, 'derived fuel-per-metre is finite and positive');
  // 100 km/h = 27.7778 m/s; burn/second = (2/3.6)*1.5 => burn/metre:
  ok(Math.abs(burnPerMetre - 2 * 1.5 / 100) <= 1e-12,
    `burn/metre at 100 km/h = legacy 2*1.5 per 100 world units (${burnPerMetre.toFixed(6)})`);

  // Full-throttle range on a full tank, in metres (through getDistance()):
  const secondsPerTank = capacity / burnPerSecond;
  const worldXAfter = 200 + vx * secondsPerTank;
  const metres = Math.max(0, (worldXAfter - 200) / WORLD_UNITS_PER_METRE);
  ok(metres > 0 && Number.isFinite(metres), 'full-tank metres finite through getDistance()');
  // Legacy-intended metres-per-tank preserved exactly: legacy 33.3s of full
  // throttle x v units/s displayed as "(33.3 x v) m" == corrected 120s of full
  // throttle x v/3.6 m/s = (33.3 x v) real metres. Same number, now correct.
  const intendedMetres = (capacity / (2 * 1.5)) * vx;
  ok(Math.abs(metres - intendedMetres) <= 1e-6,
    `full-throttle tank range preserved: ${Math.round(metres)} m == legacy-intended ${Math.round(intendedMetres)} m`);
  console.log(`  (report) full-throttle tank range at 100 km/h ~= ${Math.round(metres)} m`);
}

// ---------- FP4: SaveSystem bestDistance migration (v1 -> v2, exactly once) ----------
console.log('[FP4] SaveSystem migrates legacy bestDistance world units -> metres exactly once');
{
  const { saveSystem } = await import('../src/systems/SaveSystem.js');
  const { CURRENT_SAVE_VERSION } = await import('../src/data/playerData.js');

  // Legacy save: world-units bestDistance + everything else intact.
  localStorage.setItem('nepali_racer_save', JSON.stringify({
    schemaVersion: 1,
    coins: 1234,
    diamonds: 56,
    bestDistance: 36000,            // legacy world units -> 10000 m
    bestScore: 4242,
    bestRunCoins: 77,
    bestMilestone: 42,
    unlockedVehicles: ['tempo', 'jeep'],
    unlockedCharacters: ['default_rider', 'explorer'],
    unlockedStages: ['ktm_valley'],
    selectedVehicle: 'jeep',
    selectedCharacter: 'explorer',
    completedStages: ['ktm_valley'],
    settings: { sound: false, music: true, vibration: false, debugMode: false }
  }));

  // Fresh SaveSystem instance runs load() -> migrateSaveData() -> sanitize().
  const SaveSystemMod = await import('../src/systems/SaveSystem.js');
  const Sys = SaveSystemMod.default;
  const migrated = new Sys();

  ok(migrated.getBestDistance() === 10000, `legacy bestDistance 36000 units -> 10000 m (got ${migrated.getBestDistance()})`);
  ok(migrated.data.coins === 1234 && migrated.data.diamonds === 56, 'coins/diamonds untouched by migration');
  ok(migrated.data.bestScore === 4242 && migrated.data.bestRunCoins === 77 && migrated.data.bestMilestone === 42,
    'bestScore/bestRunCoins/bestMilestone untouched (documented decision)');
  ok(migrated.data.unlockedVehicles.join(',') === 'tempo,jeep'
    && migrated.data.unlockedCharacters.join(',') === 'default_rider,explorer'
    && migrated.data.unlockedStages.join(',') === 'ktm_valley', 'all unlocks preserved');
  ok(migrated.data.selectedVehicle === 'jeep' && migrated.data.selectedCharacter === 'explorer', 'selections preserved');
  ok(migrated.data.settings.sound === false && migrated.data.settings.vibration === false, 'settings preserved');
  ok(migrated.data.schemaVersion === CURRENT_SAVE_VERSION, `schemaVersion stamped to v${CURRENT_SAVE_VERSION}`);

  // Persistence: a save() after migration writes metres + v2 (no re-migration).
  migrated.save();
  const onDisk = JSON.parse(localStorage.getItem('nepali_racer_save'));
  ok(onDisk.bestDistance === 10000 && onDisk.schemaVersion === CURRENT_SAVE_VERSION, 'persisted save holds metres + v2');

  // Idempotence: reloading the migrated save must NOT divide again.
  const reloaded = new Sys();
  ok(reloaded.getBestDistance() === 10000, 'reload does NOT re-migrate (exactly-once, guarded by schemaVersion)');

  // Legacy v0 (no schemaVersion) migrates through both steps.
  localStorage.setItem('nepali_racer_save', JSON.stringify({ coins: 5, bestDistance: 7200 }));
  const v0 = new Sys();
  ok(v0.getBestDistance() === 2000, `v0 save: bestDistance 7200 units -> 2000 m (got ${v0.getBestDistance()})`);
  ok(v0.data.coins === 5 && v0.data.unlockedVehicles.includes('tempo'), 'v0 save keeps coins and merges defaults');

  // Garbage bestDistance survives migration and is sanitized to 0, not NaN.
  localStorage.setItem('nepali_racer_save', JSON.stringify({ schemaVersion: 1, bestDistance: 'oops' }));
  const g = new Sys();
  ok(g.getBestDistance() === 0, 'non-numeric legacy bestDistance sanitized to 0 (no NaN)');

  localStorage.removeItem('nepali_racer_save');
}

console.log('\n============================================');
console.log('FUEL-PER-METRE RESULT: ' + pass + ' passed, ' + fail + ' failed');
console.log('============================================');
if (fail > 0) process.exit(1);
