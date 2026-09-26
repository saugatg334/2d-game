// ============================================
// Nepali Racer - QA Harness: Ground Physics Time-Domain Math (Phase 1.9)
// ============================================
// Proves the three frame-rate fixes preserve the shipped 60 FPS behavior
// exactly and converge across frame rates. Mirrors the production formulas:
//
//   friction:   velocityX *= friction ** (dt * 60)      (was *= friction)
//   grounded w: angularVelocity *= 0.8 ** (dt * 60)     (was *= 0.8)
//   alignment:  step = rate * dt * 60; snap-or-approach with Wrap() semantics
//               (was Phaser.Math.Angle.RotateTo(rot, target, rate), which
//                applies `lerp` as a FIXED rad/FRAME step)
//
// RotateTo reference semantics (phaser/src/math/angle/RotateTo.js):
//   diff = target - current (NO wrap of the diff itself; snap check uses the
//   raw and 2PI-complement distances); snap when |diff| <= lerp or
//   |diff| >= 2PI - lerp; else normalize the direction over +/-PI and step
//   +/- lerp. At 60 FPS lerp = rate*1 = rate, so the new code must reduce to
//   the same sequence of rotations.

let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label); }
};

const TAU = Math.PI * 2;
const wrap = (a) => { let r = a % TAU; if (r > Math.PI) r -= TAU; if (r < -Math.PI) r += TAU; return r; };

// --- exact Phaser.Math.Angle.RotateTo (reference implementation) -----------
function rotateTo(currentAngle, targetAngle, lerp = 0.05) {
  if (currentAngle === targetAngle) return currentAngle;
  if (Math.abs(targetAngle - currentAngle) <= lerp || Math.abs(targetAngle - currentAngle) >= TAU - lerp) {
    currentAngle = targetAngle;
  } else {
    let t = targetAngle;
    if (Math.abs(t - currentAngle) > Math.PI) {
      if (t < currentAngle) t += TAU; else t -= TAU;
    }
    if (t > currentAngle) currentAngle += lerp;
    else if (t < currentAngle) currentAngle -= lerp;
  }
  return currentAngle;
}

// --- production formula mirrors --------------------------------------------
function frictionNew(v, friction, dt) { return v * Math.pow(friction, dt * 60); }
function dampGroundNew(w, dt) { return w * Math.pow(0.8, dt * 60); }
function alignNew(rotation, terrainAngle, rate, dt) {
  const step = rate * dt * 60;
  const diff = wrap(terrainAngle - rotation);
  if (Math.abs(diff) <= step) return terrainAngle;
  return rotation + Math.sign(diff) * step;
}

// GP1: 60 FPS equivalence of friction ---------------------------------------
console.log('[GP1] friction at 60 FPS == old per-frame multiply (byte-exact)');
{
  const f = 0.96;
  let old = 300, neu = 300;
  for (let i = 0; i < 180; i++) { old *= f; neu = frictionNew(neu, f, 1 / 60); }
  ok(old === neu, `3 s of 60 FPS frames from 300 u/s: old=${old.toPrecision(12)}, new=${neu.toPrecision(12)} (identical doubles)`);
  // grip variants (VehicleTuning range 0.9529..0.9724 + clamps)
  let allEq = true;
  for (const fr of [0.5, 0.9529, 0.96, 0.9724, 0.995]) {
    let o = 250, n = 250;
    for (let i = 0; i < 60; i++) { o *= fr; n = frictionNew(n, fr, 1 / 60); }
    if (o !== n) allEq = false;
  }
  ok(allEq, '60 FPS equivalence holds across the full grip-derived friction range (0.5..0.995)');
}

// GP2: friction converges across FPS for the same wall time -----------------
console.log('[GP2] friction: same wall-clock coast at 15/30/60/120/144 FPS');
{
  const rates = [15, 30, 60, 120, 144];
  const coast = (fps, seconds) => {
    const dt = 1 / fps;
    const n = Math.round(fps * seconds); // exact frame count (no t-accumulation drift)
    let v = 300;
    for (let i = 0; i < n; i++) v = frictionNew(v, 0.96, dt);
    return v;
  };
  const endV = rates.map((fps) => coast(fps, 1.0));
  const spread = Math.max(...endV) - Math.min(...endV);
  ok(spread < 1e-9, `vx after 1 s coast from 300: ${endV.map(v => v.toFixed(6)).join('/')} u/s (spread ${spread.toExponential(2)}; product = 0.96^60 exactly at every rate)`);
  const oldSpreadEnd = rates.map((fps) => {
    let v = 300;
    for (let i = 0; i < fps; i++) v *= 0.96;
    return v;
  });
  ok(Math.max(...oldSpreadEnd) - Math.min(...oldSpreadEnd) > 30, `OLD per-frame code would give ${oldSpreadEnd.map(v => v.toFixed(1)).join('/')} (spread ${(Math.max(...oldSpreadEnd) - Math.min(...oldSpreadEnd)).toFixed(1)}) — the fix targets exactly this`);
}

// GP3: grounded angular damping 60 FPS equivalence + convergence ------------
console.log('[GP3] grounded angular damping: 60 FPS == x0.8; cross-FPS convergence');
{
  let old = 3, neu = 3;
  for (let i = 0; i < 60; i++) { old *= 0.8; neu = dampGroundNew(neu, 1 / 60); }
  ok(old === neu, `1 s of 60 FPS frames from omega=3: old=${old.toPrecision(12)}, new=${neu.toPrecision(12)}`);
  const rates = [15, 30, 60, 120, 144];
  const ends = rates.map((fps) => {
    const dt = 1 / fps;
    let w = 3;
    for (let t = 0; t < 0.5; t += dt) w = dampGroundNew(w, dt);
    return w;
  });
  const spread = Math.max(...ends) - Math.min(...ends);
  ok(spread < 0.05, `omega after 0.5 s from 3: ${ends.map(v => v.toFixed(4)).join('/')} (spread ${spread.toExponential(2)}; old code differed by orders of magnitude)`);
}

// GP4: alignment equivalence at 60 FPS --------------------------------------
console.log('[GP4] terrain alignment at 60 FPS == RotateTo sequence (frame-by-frame)');
{
  let allEq = true, worst = 0;
  for (const rate of [0.04, 0.05, 0.09]) {
    // scripted rotation/terrain pairs: small diffs, large diffs, wrap crossings
    const cases = [];
    let rot = 0;
    for (let i = 0; i < 40; i++) { cases.push([rot, 0.4]); rot = rotateTo(rot, 0.4, rate); }
    rot = 0;
    for (let i = 0; i < 40; i++) { cases.push([rot, -1.2]); rot = rotateTo(rot, -1.2, rate); }
    rot = 3.0;
    for (let i = 0; i < 40; i++) { cases.push([rot, -3.0]); rot = rotateTo(rot, -3.0, rate); }
    rot = 2.0;
    for (let i = 0; i < 40; i++) { cases.push([rot, -2.0]); rot = rotateTo(rot, -2.0, rate); }
    for (const [r, t] of cases) {
      const a = rotateTo(r, t, rate);       // old: rate == per-frame step @60FPS
      const b = alignNew(r, t, rate, 1 / 60); // new: step = rate * (1/60) * 60
      if (a !== b) { allEq = false; worst = Math.max(worst, Math.abs(a - b)); }
    }
  }
  ok(allEq, `frame-by-frame identical across 0.04/0.05/0.09 rates and wrap-crossing cases (worst delta ${worst})`);
}

// GP5: alignment convergence across FPS -------------------------------------
console.log('[GP5] terrain alignment converges across FPS for the same wall time');
{
  const rates = [15, 30, 60, 120, 144];
  // 1 second of alignment toward 0.9 rad at rate 0.04 (suspension 0.8 vehicle):
  // a genuinely divergent OLD case — 15 FPS moves only 15x0.04 = 0.6 rad < 0.9.
  const align = (fps, seconds) => {
    const dt = 1 / fps;
    const n = Math.round(fps * seconds);
    let r = 0;
    for (let i = 0; i < n; i++) r = alignNew(r, 0.9, 0.04, dt);
    return r;
  };
  const ends = rates.map((fps) => align(fps, 1.0));
  ok(ends.every(v => v === 0.9), `NEW: rotation after 1 s toward 0.9 rad: ${ends.map(v => v.toFixed(6)).join('/')} (snapped to target at every FPS)`);
  const oldEnds = rates.map((fps) => {
    let r = 0;
    for (let i = 0; i < fps; i++) r = rotateTo(r, 0.9, 0.04);
    return r;
  });
  ok(oldEnds[0] < 0.9 && oldEnds[4] === 0.9, `OLD RotateTo code would give ${oldEnds.map(v => v.toFixed(3)).join('/')} after 1 s (15 FPS never reaches the target in the same wall time) — the fix targets exactly this`);
}

// GP6: snap semantics preserved (no overshoot, exact landing) ---------------
console.log('[GP6] snap/overshoot semantics preserved');
{
  // diff smaller than step -> exact snap (never overshoot past target)
  const r = alignNew(0.499, 0.5, 0.05, 1 / 15); // step = 0.2 rad at 15 FPS
  ok(r === 0.5, `small diff (0.001) with big step (0.2): snaps exactly to target (got ${r})`);
  // direction correctness across the wrap boundary
  const cw = alignNew(3.0, -3.0, 0.05, 1 / 60); // wrap distance ~0.283 rad
  ok(Math.sign(wrap(-3.0 - 3.0)) === Math.sign(wrap(cw - 3.0)) || cw === -3.0, 'wrap-crossing alignment moves in the shortest-angle direction');
}

console.log('\n============================================');
console.log('GROUND-PHYSICS RESULT: ' + pass + ' passed, ' + fail + ' failed');
console.log('============================================');
if (fail > 0) process.exit(1);
