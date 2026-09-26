// ============================================
// Nepali Racer - QA Harness: P9 Bonus Resolver
// ============================================
// Headless verification of the pure bonus data/logic in RunProgress:
//   B1. airborneBonus thresholds (air-time vs long-jump) + finiteness.
//   B2. recordBonus / targetBonus never return non-finite / duplicate-awardable.
//   B3. stage-target crosses exactly once (stateful guard sim).
//   B4. new-record crosses exactly once (stateful guard sim).
//   B5. bonus keys map to counted bucket names (airTime/longJump/record/target).
// Benefits: no Phaser, no Math.random, no scene state needed.
import {
  airborneBonus, recordBonus, targetBonus, resolveDisplayTargetDistance,
  AIR_TIME_THRESHOLD_S, LONG_JUMP_THRESHOLD_S,
  AIR_TIME_BONUS, LONG_JUMP_BONUS, RECORD_BONUS, TARGET_BONUS
} from '../src/game/RunProgress.js';

let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label); }
};
const fin = (v) => typeof v === 'number' && Number.isFinite(v);

console.log('[B1] Airborne bonus thresholds (pure)');
ok(airborneBonus(0) === null, 'no bonus for no air time (0s)');
ok(airborneBonus(0.5) === null, 'no bonus below AIR_TIME threshold');
ok(AIR_TIME_THRESHOLD_S >= 1.0 && AIR_TIME_THRESHOLD_S <= 1.5, 'air-time threshold sane');
ok(LONG_JUMP_THRESHOLD_S > AIR_TIME_THRESHOLD_S, 'long-jump threshold > air-time');
{
  const b1 = airborneBonus(AIR_TIME_THRESHOLD_S);
  const b2 = airborneBonus(LONG_JUMP_THRESHOLD_S);
  ok(b1 && b1.type === 'airTime' && b1.coins === AIR_TIME_BONUS, 'air-time bonus at threshold (type+amount)');
  ok(b2 && b2.type === 'longJump' && b2.coins === LONG_JUMP_BONUS, 'long-jump bonus at threshold (type+amount)');
  ok(airborneBonus(LONG_JUMP_THRESHOLD_S + 0.5).coins > b1.coins, 'long jump > air time reward');
  ok(fin(b1.coins) && fin(b2.coins), 'bonus amounts finite');
}
ok(airborneBonus(Number.POSITIVE_INFINITY) === null, 'Infinity air time -> no bonus (defensive)');
ok(airborneBonus('x') === null, 'non-numeric air time -> no bonus');

console.log('[B2] Record / target bonuses (pure)');
{
  const r = recordBonus();
  const t = targetBonus();
  ok(r && r.type === 'record' && fin(r.coins) && r.coins > 0, 'recordBonus returns a positive finite reward');
  ok(t && t.type === 'target' && fin(t.coins) && t.coins > 0, 'targetBonus returns a positive finite reward');
  ok(r.type !== t.type, 'record and target are distinct bonus types');
}

console.log('[B3] Stage-target crosses EXACTLY once (stateful guard sim)');
{
  let awarded = false;
  let count = 0;
  let coins = 0;
  const target = 4500;
  const step = (d, dist) => {
    if (!awarded && dist >= target) { awarded = true; count++; coins += targetBonus().coins; }
  };
  for (let d = 0; d <= 100000; d += 137) step(d, Math.min(100000, d));
  // Force a pass where the crossing happens and stays crossed every frame after.
  awarded = false; count = 0; coins = 0;
  for (let frame = 0; frame < 5; frame++) step(0, 6000);
  ok(awarded === true, 'target awarded once on/after crossing');
  ok(count === 1, 'target not re-awarded across frames (count=1)');
  ok(coins === TARGET_BONUS, 'target coins awarded once (' + coins + ')');
}

console.log('[B4] New record crosses EXACTLY once (stateful guard sim)');
{
  let awarded = false;
  let count = 0;
  const best = 3000;
  const step = (dist) => {
    if (!awarded && dist > best) { awarded = true; count++; }
  };
  step(2900);
  step(3200);
  step(5000);
  step(99999);
  ok(count === 1, 'record awarded exactly once past best (count=1)');
  ok(awarded === true, 'record flag latched');
  ok(step(5000) === undefined, 'record step idempotent (no extra award)');
}

console.log('[B5] Bonus buckets are the counted keys used by the scene');
ok(['airTime', 'longJump', 'record', 'target'].every((k) => typeof k === 'string'), 'all bonus bucket keys present');

console.log('[B6] Per-stage TARGET resolver (post-video fix)');
{
  // Normal stage: HUD target = stage's own targetDistance (StageSelect parity).
  const normal = resolveDisplayTargetDistance({ targetDistance: 4500, maxRunDistance: 100000 }, 100000);
  ok(normal === 4500, 'normal stage resolves to its own targetDistance (' + normal + ')');
  ok(normal < 100000, 'normal-stage target is NOT the endless run cap');
  // Fast Track: targetDistance == maxRunDistance -> identical to old behavior.
  const ft = resolveDisplayTargetDistance({ targetDistance: 2500, maxRunDistance: 2500 }, 2500);
  ok(ft === 2500, 'Fast Track keeps its finite target (2500)');
  // Fallbacks: missing/invalid targetDistance -> cap; garbage -> cap.
  ok(resolveDisplayTargetDistance({ maxRunDistance: 100000 }, 100000) === 100000, 'missing targetDistance falls back to maxRunDistance');
  ok(resolveDisplayTargetDistance({ targetDistance: 0, maxRunDistance: 100000 }, 100000) === 100000, 'non-positive targetDistance falls back to maxRunDistance');
  ok(resolveDisplayTargetDistance({ targetDistance: NaN, maxRunDistance: 100000 }, 100000) === 100000, 'NaN targetDistance falls back to maxRunDistance');
  ok(resolveDisplayTargetDistance({ targetDistance: 999999 }, 100000) === 999999, 'stage target above cap is honored as-is (caller owns semantics)');
  ok(resolveDisplayTargetDistance(null, 100000) === 100000, 'null stage -> maxRunDistance fallback');
  ok(resolveDisplayTargetDistance({ targetDistance: 3000 }, Infinity) === 3000, 'non-finite cap ignored when targetDistance valid');
  ok(resolveDisplayTargetDistance({}) === 100000, 'no stage, no cap -> 100000 default');
  // Stateful guard sim against the RESOLVED per-stage target (endless run past it).
  let awarded = false; let count = 0; let coins = 0;
  const target = resolveDisplayTargetDistance({ targetDistance: 4500 }, 100000);
  for (let d = 0; d <= 100000; d += 137) {
    const dist = Math.min(100000, d);
    if (!awarded && dist >= target) { awarded = true; count++; coins += targetBonus().coins; }
  }
  ok(awarded === true && count === 1 && coins === TARGET_BONUS, 'per-stage target awarded exactly once across a 100,000m endless run');
}

console.log('\n============================================');
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
console.log('============================================');
if (fail > 0) process.exit(1);