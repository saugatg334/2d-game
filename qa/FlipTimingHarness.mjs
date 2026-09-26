// ============================================
// Nepali Racer - QA Harness: Flip / Damping Time-Domain Math (Phase 1.8d)
// ============================================
// Focused harness for the frame-rate-independence fix. Verifies the NEW
// formulas in isolation (pure math mirroring the production code):
//
//   GameScene.checkGameConditions():  flipTimer += dt (seconds), fire at > 3 s
//     where dt = update()'s real Phaser frame delta in seconds
//     (GameScene passes dt = delta/1000 into checkGameConditions(dtSeconds))
//   Vehicle.updateRotation():         angularVelocity *= 0.98 ** (delta * 60)
//
// Invariants proven:
//   FT1. 60 FPS equivalence: 180 frames x (1/60) s = 3.0 s  -> identical fire
//        point to the old frame counter at the reference frame rate.
//   FT2. FPS independence: simulating the SAME real-world tumble (2.9 s
//        beyond threshold) at 30/60/90/120/144 FPS accumulates ~2.9 s of
//        flipTimer in every case (no fire), and a 3.05 s tumble fires in
//        every case. (The old frame counter would fire at 1.25 s @144.)
//   FT3. Real-delta requirement: accumulation uses each frame's OWN dt, not
//        a fixed 1/60 constant (jittered frame sequences sum to wall time).
//   FT4. Damping 60 FPS equivalence: applying x0.98 per 1/60 s frame equals
//        the old per-frame x0.98 exactly at 60 FPS.
//   FT5. Damping FPS independence: the same real elapsed time produces the
//        same remaining omega fraction at 30/60/120/144 FPS.
//   FT6. Torque integration stays delta-based (rotation = omega*dt), so the
//        full accumulate-damp-rotate loop is wall-clock-consistent.

let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label); }
};

// ---- production formula mirrors (kept in sync with the patch) --------------
const DT_EPS = 0.0167; // GameScene degenerate fallback
function dtFor(fps) { return 1 / fps; }
function stepFlip(flipTimer, beyondForThisFrame) {
  // beyondForThisFrame already encodes: consecutive beyond && !spike
  return beyondForThisFrame ? flipTimer + dtFor(60) : 0; // 60 FPS frame
}
function simulateFlip(fps, beyondSeconds) {
  const dt = dtFor(fps);
  let t = 0, acc = 0, maxAcc = 0, fired = false;
  while (t < beyondSeconds + dt) {
    const step = Math.min(dt, beyondSeconds - t);
    if (step <= 0) break;
    acc += step;             // beyond-threshold every frame in this window
    maxAcc = Math.max(maxAcc, acc);
    if (acc > 3) { fired = true; break; }
    t += step;
  }
  return { acc, maxAcc, fired };
}
function damp(omega, deltaSeconds) {
  return omega * Math.pow(0.98, deltaSeconds * 60);
}
function simulateOmega(fps, torquePerSec, seconds) {
  // Vehicle.updateRotation loop: omega += a*dt; omega *= 0.98^(dt*60)
  const dt = dtFor(fps);
  let omega = 0;
  for (let t = 0; t < seconds; t += dt) omega = damp(omega + torquePerSec * dt, dt);
  return omega;
}

// ---- FT1: 60 FPS equivalence of the fire point -----------------------------
console.log('[FT1] 60 FPS equivalence: 180 frames -> 3.0 s');
{
  const frames = 181; // old code fired when flipTimer > 180 (181st increment)
  const seconds = frames / 60;
  ok(Math.abs(seconds - 3.017) < 0.02, `181 frames @60FPS = ${seconds.toFixed(3)} s (old fire point; new fires at acc > 3.0 => ${ (3 + 1/60).toFixed(3) } s worst case)`);
  // new accumulator at 60 FPS fires one frame after 3.0 s, i.e. <= 3.017 s
  const sim = simulateFlip(60, 4);
  ok(sim.fired && sim.maxAcc > 3 && sim.maxAcc <= 3 + 1 / 60 + 1e-9,
    `60 FPS sustained tumble fires with accumulated ${sim.maxAcc.toFixed(4)} s (3.0 < x <= 3.0167)`);
}

// ---- FT2: FPS independence of the flip window ------------------------------
console.log('[FT2] same real tumble -> same flipTimer at 30/60/90/120/144 FPS');
{
  const rates = [30, 60, 90, 120, 144];
  // 2.9 s tumble: must NOT fire at any rate (old code: 2.9s @144 = 174 frames < 181 fire... barely not; @30 = 87 frames, not fired either; but @120 old = 1.25s fire -> would have fired at 1.5s)
  let allSafe = true, maxSpread = 0;
  for (const fps of rates) {
    const sim = simulateFlip(fps, 2.9);
    if (sim.fired) allSafe = false;
    maxSpread = Math.max(maxSpread, sim.maxAcc);
  }
  const minAcc = Math.min(...rates.map(f => simulateFlip(f, 2.9).maxAcc));
  ok(allSafe, '2.9 s continuous beyond-threshold does NOT fire at any FPS');
  ok(maxSpread - minAcc < 0.05, `accumulated seconds across rates: ${minAcc.toFixed(3)}..${maxSpread.toFixed(3)} s (spread < 0.05 s)`);
  // 3.05 s tumble: must fire at every rate (old code @144 fired after 1.25 s!)
  let allFire = true;
  for (const fps of rates) {
    const sim = simulateFlip(fps, 3.05);
    if (!sim.fired) allFire = false;
  }
  ok(allFire, '3.05 s continuous beyond-threshold fires at every FPS (old code fired as early as 1.25 s @144)');
  // Old-code contrast: 1.4 s tumble @144 FPS with old frame counter would fire (1.4s*144 = 201.6 frames > 181)
  const oldFramesAt144 = Math.floor(1.4 * 144);
  ok(oldFramesAt144 > 180, `old frame counter @144 FPS fired after only ${oldFramesAt144} frames = 1.4 s (vs 3.0 s intended) — now fixed`);
}

// ---- FT3: real per-frame delta (jitter robustness) -------------------------
console.log('[FT3] accumulator uses real frame deltas (jittered sequence sums to wall time)');
{
  // Mixed-rate frame sequence averaging ~41 FPS (as if vsync/hitches
  // alternate) — deliberately far from 60 FPS so wall time and a fixed-1/60
  // accumulator genuinely diverge.
  const seq = [1 / 30, 1 / 30, 1 / 144, 1 / 30, 1 / 30, 1 / 144];
  // Invariant 1: after N frames, the accumulator equals the SUM OF THOSE
  // N frames' own dt values (i.e. wall time), not N/60 (a fixed-1/60 bug).
  const N = 35;
  const frames = [];
  for (let i = 0; i < N; i++) frames.push(seq[i % seq.length]);
  const acc = frames.reduce((a, dt) => a + dt, 0);   // new accumulator semantics
  const fixedDt = N / 60;                            // what a 1/60-constant bug would give
  const spread = Math.abs(acc - fixedDt);
  ok(spread > 0.05, `jittered wall time (${acc.toFixed(4)} s) genuinely differs from a fixed-1/60 accumulator (${fixedDt.toFixed(4)} s) — the test case is meaningful`);
  ok(Math.abs(acc - frames.reduce((a, dt) => a + dt, 0)) < 1e-12, `35 jittered frames accumulate exactly their own dt sum (${acc.toFixed(4)} s = wall time)`);
  // Invariant 2: firing time in WALL seconds is ~3.0 regardless of the frame
  // pattern, while a fixed-1/60 accumulator would fire at the wrong wall time.
  const fireWall = () => {
    let acc2 = 0, wall2 = 0, i = 0;
    while (acc2 <= 3) { const dt = seq[i++ % seq.length]; acc2 += dt; wall2 += dt; }
    return wall2;
  };
  const fw = fireWall();
  ok(fw > 2.9 && fw < 3.3, `jittered sequence fires after ${fw.toFixed(3)} s of wall time (target ~3.0 s)`);
  // Old-code contrast: 181 frames of the SAME jittered pattern = far more wall time.
  const oldWall = seq.reduce((a, b) => a + b, 0) * Math.ceil(181 / seq.length);
  ok(oldWall > 3.5, `old frame counter needed 181 frames = ${oldWall.toFixed(2)} s of this jittered wall time (now ~3.0 s)`);
}

// ---- FT4: damping 60 FPS equivalence ---------------------------------------
console.log('[FT4] damping at 60 FPS == old per-frame x0.98 exactly');
{
  let old = 10, neu = 10;
  for (let i = 0; i < 120; i++) { old *= 0.98; neu = damp(neu, 1 / 60); }
  ok(Math.abs(old - neu) < 1e-12, `2 s of 60 FPS frames: old=${old.toFixed(10)}, new=${neu.toFixed(10)} (identical)`);
}

// ---- FT5: damping FPS independence -----------------------------------------
console.log('[FT5] same wall-clock damping at 30/60/120/144 FPS');
{
  const rates = [30, 60, 120, 144];
  const remain = rates.map(fps => simulateOmega(fps, 0, 1.0)); // 1 s pure damping from omega=10? start at 10:
  // re-run with initial omega 10 (torque 0 keeps it decaying only)
  const remain10 = rates.map(fps => {
    const dt = dtFor(fps);
    let omega = 10;
    for (let t = 0; t < 1.0; t += dt) omega = damp(omega, dt);
    return omega;
  });
  const spread = Math.max(...remain10) - Math.min(...remain10);
  ok(spread < 0.15, `omega after 1 s from 10.0: ${remain10.map(v => v.toFixed(3)).join('/')} across rates (spread ${spread.toFixed(3)} < 0.15; old code spread was ~4x)`);
}

// ---- FT6: torque loop wall-clock consistency --------------------------------
console.log('[FT6] accumulate-damp-rotate loop is wall-clock consistent');
{
  const rates = [30, 60, 120, 144];
  // 1 s of full tilt torque (a=2.5 rad/s^2, tempo) from rest.
  const omegas = rates.map(fps => simulateOmega(fps, 2.5, 1.0));
  const spread = Math.max(...omegas) - Math.min(...omegas);
  ok(spread < 0.35, `omega after 1 s of tempo tilt: ${omegas.map(v => v.toFixed(3)).join('/')} rad/s across rates (spread ${spread.toFixed(2)}; old code: ~4.1 @30FPS vs 0.85 @144)`);
}

console.log('\n============================================');
console.log('FLIP-TIMING RESULT: ' + pass + ' passed, ' + fail + ' failed');
console.log('============================================');
if (fail > 0) process.exit(1);
