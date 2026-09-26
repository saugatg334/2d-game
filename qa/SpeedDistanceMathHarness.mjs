// ============================================
// Nepali Racer - QA Harness: Speed <-> Distance Math
// ============================================
// Deterministic, browser-free. Mirrors the PRODUCTION formulas used to move the
// vehicle and derive displayed values (Phase 1.7 unit fix):
//
//   Vehicle.getSpeedKmh() = Math.abs(velocityX)              [velocityX IS km/h]
//   Vehicle.getDistance() = Math.max(0, (x - 200) / 3.6)     [1 world unit = 1/3.6 m]
//   x integration:         x += velocityX * dt   (dt = deltaMs / 1000 seconds)
//
// Physical reference:      100 km/h = 100/3.6 = 27.777... m/s
//   so at a steady 100 km/h for 60 s:  distance ~= 1666.67 m
//
// The harness asks: "If the game shows speed V km/h, and V is held constant for
// T seconds, what distance does the production formula report?" and compares it
// to the physically correct distance.
//
// Phase 1.7 decision (authoritative): vehicle maxSpeed data is authored as
// km/h-like gameplay values (Vehicle Select shows them raw; tractors 170-180,
// buses 190-225, rally 355-400). The pre-1.7 x0.36 display factor and 1-unit=1m
// distance were mutually inconsistent (10x). The fix keeps physics untouched:
// displayed speed = velocityX, distance = world units / 3.6.

let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label); }
};
const fin = (v) => typeof v === 'number' && Number.isFinite(v);

// --- exact reproduction of the production speed/distance relationship (1.7) ---
const WORLD_UNITS_PER_METRE = 3.6; // mirror of src/config/constants.js
function productionSpeedKmh(vx) { return Math.abs(vx); }
function worldXAfter(vx, seconds) { return 200 + vx * seconds; } // Vehicle.updatePosition
function productionDistanceMeters(vx, seconds) {
  return Math.max(0, (worldXAfter(vx, seconds) - 200) / WORLD_UNITS_PER_METRE);
}

// Physical conversion: 1 km/h = 1000/3600 m/s = 1/3.6 m/s.
const MS_PER_KMH = 1 / 3.6;

function physicalDistanceM(v, seconds) { return v * MS_PER_KMH * seconds; }

const TOL = 0.05; // allow ~5% numerical tolerance on the physical check

console.log('[SPEED] Production formula reproduced (Phase 1.7 model)');
ok(productionSpeedKmh(100) === 100, 'speed 100 km/h <-> velocityX=100 (production identity factor)');
ok(productionSpeedKmh(-42) === 42, 'reverse motion reports absolute speed (Math.abs preserved)');
ok(productionDistanceMeters(100, 60) > 1666.66 && productionDistanceMeters(100, 60) < 1666.68,
  'production distance for 100 km/h at 60s = 1666.67 m (units/3.6)');

console.log('[SPEED] Physical expectation vs production distance');
{
  const v = 100; // km/h shown
  const T = 60;  // seconds
  const phys = physicalDistanceM(v, T);                 // 1666.67 m
  const prod = productionDistanceMeters(v, T);          // 1666.67 m
  const ratio = prod / phys;                            // ~1.0
  console.log(`  (physical=100km/h*60s) expects ~${Math.round(phys)} m`);
  console.log(`  production reports           ${Math.round(prod)} m  (ratio=${ratio.toFixed(2)}x)`);
  ok(fin(phys) && fin(prod), 'both values finite');
  ok(Math.abs(prod - phys) / phys <= TOL, 'production distance matches physical 100km/h*60s (~1666.67m)');
  ok(Math.abs(ratio - 1) <= 0.01, 'speed display and distance agree in SI units (ratio ~1.0)');
}

console.log('[SPEED] Second combination: 50 km/h * 120 s');
{
  const v = 50;
  const T = 120;
  const phys = physicalDistanceM(v, T);          // 1666.67 m
  const prod = productionDistanceMeters(v, T);   // 1666.67 m
  console.log(`  physical ~${Math.round(phys)} m | production ${Math.round(prod)} m  (ratio=${(prod / phys).toFixed(2)}x)`);
  ok(Math.abs(prod / phys - 1) < 0.01, 'no systematic offset across speeds (unit-consistent)');
  ok(Math.abs(prod - phys) / phys <= TOL, 'production distance matches physical 50km/h*120s (~1666.67m)');
}

console.log('[SPEED] Third combination: 120 km/h * 30 s (exactly 1000 m)');
{
  const v = 120;
  const T = 30;
  const phys = physicalDistanceM(v, T);          // 1000 m exactly
  const prod = productionDistanceMeters(v, T);   // 1000 m exactly
  ok(Math.abs(prod - phys) <= 1e-9, 'production distance matches physical 120km/h*30s (1000m, exact)');
}

console.log('[SPEED] Unit-sanity anchor (no arbitrary multiplier)');
{
  // SI-consistency: distance(m)/seconds must equal v/3.6.
  const v = 100, T = 60;
  const mps = productionDistanceMeters(v, T) / T; // metres per 1 s
  ok(Math.abs(mps - v / 3.6) <= 0.01 * v, '1 s of motion covers speed(km/h)/3.6 metres (SI-consistent)');
}

console.log('[SPEED] getDistance() clamp + start-offset mirror');
{
  // Vehicle.getDistance(): Math.max(0, (x - 200) / 3.6)
  const dist = (x) => Math.max(0, (x - 200) / WORLD_UNITS_PER_METRE);
  ok(dist(200) === 0, 'start position x=200 reports 0 m');
  ok(dist(150) === 0, 'behind-start x clamps to 0 m (no negative distance)');
  ok(Math.abs(dist(3800) - 1000) <= 1e-9, 'x=3800 world units reports exactly 1000 m');
}

console.log('[SPEED] Zero / non-finite sanity');
{
  const v = 0, T = 60;
  const speed = productionSpeedKmh(v);
  const d = productionDistanceMeters(v, T);
  ok(speed === 0, 'speed 0 km/h <-> velocityX=0');
  ok(d === 0, '0 km/h held for 60s covers exactly 0 m');
  ok(fin(speed) && fin(d), 'no NaN/Infinity at zero speed');
}

console.log('\n============================================');
console.log('SPEED-DISTANCE RESULT: ' + pass + ' passed, ' + fail + ' failed');
console.log('Phase 1.7 model: velocityX is the km/h gameplay speed; distance = world units / 3.6.');
console.log('============================================');
if (fail > 0) process.exit(1);
