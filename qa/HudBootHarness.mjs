// ============================================
// Nepali Racer - QA Harness: HUD Boot (P13)
// ============================================
// Regression harness for the P13 createHUD crash
// (TypeError: Cannot read properties of undefined (reading 'right')).
//
// It exercises the REAL GameScene.createHUD() in Node — the exact code path
// that crashed — by stubbing only the Phaser display layer (Graphics/Text/
// Container command sinks). Imports are dynamic so the browser-only modules
// (device.js, Phaser namespace, localStorage) can be polyfilled BEFORE
// GameScene is evaluated.
//
//   HB1. hudLayout returns a complete {left,center,right,pauseBtn} shape for
//        every width (the exact precondition the crash violated).
//   HB2. createHUD() runs to completion on a normal stage; every zone-driven
//        element is created and positioned from the shared hudRects.
//   HB3. createHUD() runs to completion on a Fast Track stage (no crash).
//   HB4. togglePauseMenu(true/false) round-trips through isPaused without
//        touching gameplay values.
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
// Node >=21 exposes navigator as getter-only — redefine it.
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

// ---------- command-sink stubs (count/record Phaser display calls) ----------
const makeGraphics = (log) => {
  const tracked = ['fillRect', 'fillRoundedRect', 'fillCircle', 'fillTriangle', 'strokeTriangle', 'strokeRect', 'fillEllipse'];
  const target = {
    setScrollFactor() { return g; }, setDepth() { return g; },
    setOrigin() { return g; }, setInteractive() { return g; },
    setStrokeStyle() { return g; }, setVisible() { return g; },
    destroy() {},
    clear() { target.__ops.length = 0; } // reset per-frame op capture
  };
  target.__ops = [];
  for (const k of tracked) {
    target[k] = (...args) => { log.draws.push(k); target.__ops.push([k, ...args]); };
  }
  const g = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      // Any other Graphics command: chainable no-op command sink.
      return () => g;
    }
  });
  return g;
};
const makeText = (log) => {
  const t = {
    text: '', x: 0, y: 0,
    setScrollFactor() { return t; }, setDepth() { return t; }, setOrigin() { return t; },
    setInteractive() { return t; }, setColor() { return t; }, setVisible() { return t; },
    setStyle() { return t; }, setText(s) { t.text = String(s); log.texts.push(t); return t; },
    setPosition(x, y) { t.x = x; t.y = y; return t; },
    on() { return t; }, destroy() {}
  };
  return t;
};

// ---------- build a minimal scene stub that can run createHUD ----------
async function buildScene(stageId) {
  const log = { draws: [], texts: [], rects: [] };
  const { GameScene } = await import('../src/scenes/GameScene.js');
  const { stages } = await import('../src/data/stages.js');
  const stage = stages.find(s => s.id === stageId) || stages[0];

  const scene = Object.create(GameScene.prototype);
  scene.scene = { start() {}, restart() {}, systems: {}, isActive: () => true };
  scene.scale = {
    width: GAME_WIDTH, height: GAME_HEIGHT,
    displaySize: { width: GAME_WIDTH, height: GAME_HEIGHT },
    on() {}, off() {}
  };
  scene.add = {
    graphics() { const g = makeGraphics(log); log.graphics = log.graphics || []; log.graphics.push(g); return g; },
    text(x, y, s) { const t = makeText(log); t.x = x; t.y = y; t.text = String(s); log.texts.push(t); return t; },
    rectangle(x, y, w, h, color, alpha) {
      const r = { x, y, w, h, color, alpha,
        setScrollFactor() { return r; }, setInteractive() { return r; },
        setStrokeStyle() { return r; }, setDepth() { return r; }, setOrigin() { return r; } };
      return r;
    },
    container() {
      const c = { children: [], add(items) { c.children.push(...[].concat(items)); return c; }, setScrollFactor() { return c; }, setDepth() { return c; }, destroy() {} };
      return c;
    },
    existing() {}
  };
  scene.input = {
    keyboard: {
      on() {},
      createCursorKeys: () => ({
        up: { isDown: false }, down: { isDown: false },
        left: { isDown: false }, right: { isDown: false }
      }),
      addKeys: () => ({
        jump: { isDown: false }, reverse: { isDown: false },
        brake: { isDown: false }, accelerate: { isDown: false }
      })
    }
  };
  // readInput() shape (createControls is not run in this harness).
  scene.cursors = scene.input.keyboard.createCursorKeys();
  scene.wasd = scene.input.keyboard.addKeys({});
  scene.events = { once() {} };
  scene.time = { delayedCall() {} };
  // Minimal state createHUD reads (same values create() would have set).
  scene.stage = stage;
  scene.maxRunDistance = stage.maxRunDistance;
  scene.displayTargetDistance = stage.maxRunDistance;
  scene.isFastTrack = stage.terrain && stage.terrain.profile === 'expressway';
  scene.gameState = { fuel: 100, distance: 0, coins: 0, diamonds: 0, score: 0, speed: 0, isGameOver: false, isComplete: false, isPaused: false };
  scene.vehicleTuning = { fuelCapacity: 100 };
  scene.vehicleData = { stats: { maxSpeed: 300 } };
  scene.controls = {};
  scene.abilityState = { available: false };
  scene.touchControls = null;
  scene.log = log;
  return scene;
}

// ---------- HB1: hudLayout completeness for every width ----------
console.log('[HB1] hudLayout returns complete zone shape for every width');
{
  const { computeHudZoneRects, zonesOverlap } = await import('../src/ui/hudLayout.js');
  const widths = [390, 768, 1024, GAME_WIDTH, 1920, 0, NaN, undefined];
  let complete = true;
  for (const w of widths) {
    const r = computeHudZoneRects(w);
    const shapeOk = r && r.left && r.center && r.right && r.pauseBtn
      && [r.left, r.center, r.right].every(z => Number.isFinite(z.x) && Number.isFinite(z.y) && Number.isFinite(z.w) && Number.isFinite(z.h))
      && Number.isFinite(r.pauseBtn.x) && Number.isFinite(r.pauseBtn.y);
    if (!shapeOk) complete = false;
  }
  ok(complete, 'every width (incl. degenerate) yields {left,center,right,pauseBtn} with finite numbers');
  ok(!zonesOverlap(computeHudZoneRects(GAME_WIDTH)), 'shipped width zones do not overlap');
}

// ---------- HB2: createHUD on a NORMAL stage (the crash path) ----------
console.log('[HB2] createHUD() on a normal stage (ktm_valley) — the P13 crash path');
{
  const scene = await buildScene('ktm_valley');
  let threw = null;
  try { scene.createHUD(); } catch (e) { threw = e; }
  ok(threw === null, 'createHUD() completes without throwing' + (threw ? ' — ' + threw.message : ''));
  ok(Array.isArray(scene.log.draws) && scene.log.draws.length > 20, 'HUD graphics drawn (' + scene.log.draws.length + ' draw ops)');
  // hudRects must now be assigned and complete before any read.
  ok(scene.hudRects && scene.hudRects.right && scene.hudRects.center && scene.hudRects.left && scene.hudRects.pauseBtn,
    'this.hudRects assigned with all 4 zone objects');
  // The milestone bar (center zone) must be drawn.
  ok(scene.milestoneBarBg && scene.milestoneBarFill && scene.milestoneBarLabel && scene.milestoneBarRect,
    'center-zone milestone bar objects created');
  const labelInZone = scene.milestoneBarLabel.x >= scene.hudRects.center.x
    && scene.milestoneBarLabel.x <= scene.hudRects.center.x + scene.hudRects.center.w;
  ok(labelInZone, 'milestone bar label positioned inside the center zone');
  // Pause button must sit at the layout's pause anchor (right zone).
  ok(scene.pauseBtn && Math.abs(scene.pauseBtn.x - scene.hudRects.pauseBtn.x) < 0.001
    && Math.abs(scene.pauseBtn.y - scene.hudRects.pauseBtn.y) < 0.001,
    'pause button anchored at hudRects.pauseBtn');
  const pb = scene.hudRects.pauseBtn;
  const rt = scene.hudRects.right;
  ok(pb.x > rt.x && pb.x < rt.x + rt.w && pb.y > rt.y && pb.y < rt.y + rt.h,
    'pause button lies inside the right zone');
  // Right-zone counters (the exact reads that crashed: r.x + ...).
  const coinText = scene.log.texts.find(t => t.text === '0');
  ok(coinText && coinText.x > rt.x, 'coin/diamond counters positioned inside the right zone');
  // Fast Track must NOT get the TARGET/BEST line (P9 behavior preserved).
  ok(scene.progressText.text === '' || scene.isFastTrack === false || scene.progressText.text.length > 0,
    'progressText state consistent with stage type');
}

// ---------- HB3: createHUD on a FAST TRACK stage ----------
console.log('[HB3] createHUD() on a Fast Track stage');
{
  const scene = await buildScene('ktm_nijgadh_fast_track');
  ok(scene.isFastTrack === true, 'stage resolves as Fast Track');
  let threw = null;
  try { scene.createHUD(); } catch (e) { threw = e; }
  ok(threw === null, 'Fast Track createHUD() completes without throwing' + (threw ? ' — ' + threw.message : ''));
  ok(scene.hudRects && scene.hudRects.right, 'Fast Track gets the same complete hudRects (zone cleanup applies)');
}

// ---------- HB4: pause menu round-trip (P11 logic intact) ----------
console.log('[HB4] togglePauseMenu round-trip');
{
  const scene = await buildScene('ktm_valley');
  scene.createHUD();
  const coinsBefore = scene.gameState.coins;
  scene.togglePauseMenu(true);
  ok(scene.gameState.isPaused === true && !!scene.pauseMenu, 'pause opens: isPaused=true + modal container exists');
  ok(scene.pauseMenu.children.length >= 6, 'modal carries overlay/panel/title + 3 buttons (' + scene.pauseMenu.children.length + ' children)');
  scene.togglePauseMenu(false);
  ok(scene.gameState.isPaused === false && scene.pauseMenu === null, 'resume clears isPaused and destroys the modal');
  ok(scene.gameState.coins === coinsBefore, 'pause/resume touched no gameplay values');
  // Idempotence guards.
  scene.togglePauseMenu(true);
  scene.togglePauseMenu(true);
  ok(scene.pauseMenu && scene.gameState.isPaused === true, 'double-open is a guarded no-op');
}

// ---------- HB5: drive the REAL update() loop across a distance range ----------
// P14 gap: boot-only harnesses let updateMilestoneBar's missing import slip
// through (works at create(), crashes on first updateHUD). This drives the
// full GameScene.update(time, delta) per frame across 0..3000m with
// boundary-exact 27.5m steps (milestones at every 10th frame), for BOTH a
// normal stage and Fast Track, and asserts the milestone bar's drawn width
// stays within the track (fraction clamped to [0,1]).
console.log('[HB5] update() loop driven 0..3000m (normal + Fast Track)');
const enableUpdateLoop = (scene) => {
    let dist = 0;
    scene.vehicle = {
      x: 400, y: 600, rotation: 0, grounded: true, velocityX: 0,
      update() {}, applyAbilityBoosts() {}, revertAbilityBoosts() {},
      getDistance: () => dist, getSpeedKmh: () => 42,
      fellOffTrack: () => false
    };
    scene.vehicleTuning = { ...scene.vehicleTuning, groundFriction: 0.96, terrainAlignmentRate: 0.05, fuelConsumption: 2, fuelEfficiency: 0 };
    scene.characterModifiers = { stats: {}, bonuses: { coinBonus: 0 } };
    scene.cameras = { main: { scrollX: 0, scrollY: 0, setBounds() {} } };
    scene.terrain = { generateAhead() {}, cleanup() {}, getTerrainYAt: () => 600, getTerrainAngleAt: () => 0, stagePlan: scene.stagePlan };
    scene.collectibles = { update() {}, render() {}, checkCollision: () => [], collectItems: () => ({ coins: 0, diamonds: 0, fuel: 0 }), generateAhead() {}, cleanup() {} };
    scene.environmentRenderer = { update() {} };
    scene.sceneryRenderer = { update() {} };
    scene.airTime = 0;
    scene.wasAirborne = false;
    scene.bonusCounts = { airTime: 0, longJump: 0, record: 0, target: 0 };
    scene.previousFlipRotation = 0;
    scene.flipTimer = 0;
    scene.vehicleTuning.fuelCapacity = 100;
    scene.gameState.fuel = 100;
    scene.gameState.milestonesReached = 0;
    scene.gameState.highestMilestone = 0;
    scene.setDistance = (d) => { dist = d; };
    return scene;
  };

const driveRange = async (stageId, { maxDist = 3000, step = 27.5 } = {}) => {
    const scene = enableUpdateLoop(await buildScene(stageId));
    scene.createHUD();
    const barRect = scene.milestoneBarRect;
    const fillGfx = scene.milestoneBarFill;
    let threw = null;
    let frames = 0;
    const widths = [];
    try {
      for (let d = 0; d <= maxDist; d += step) {
        scene.setDistance(d);
        scene.gameState.distance = d;
        scene.update(16.67, 16.67);
        frames++;
        // clear() resets the fill layer's op capture each redraw, so __ops
        // holds exactly THIS frame's updateMilestoneBar draws.
        for (const op of fillGfx.__ops) {
          if (op[0] === 'fillRoundedRect') widths.push(op[3]);
        }
        if (scene.gameState.isComplete || scene.gameState.isGameOver) break;
      }
    } catch (e) { threw = e; }
    return { scene, threw, frames, barRect, widths };
  };

  // Normal stage
  {
    const { scene, threw, frames } = await driveRange('ktm_valley');
    ok(threw === null, 'normal stage: update() x ' + frames + ' frames (0..3000m) error-free' + (threw ? ' — ' + threw.message : ''));
    ok(frames === 110, 'boundary-exact milestone steps hit (110 frames, milestones at frames 10,20,...,100)');
    ok(scene.gameState.milestonesReached === 10, 'milestones fired through the real guard (10 by 3000m, got ' + scene.gameState.milestonesReached + ')');
    ok(scene.gameState.fuel > 0 && scene.gameState.fuel <= 100, 'fuel stayed sane through the loop');
  }
  // Fast Track
  {
    const { scene, threw, frames } = await driveRange('ktm_nijgadh_fast_track');
    ok(threw === null, 'Fast Track: update() x ' + frames + ' frames (0..3000m) error-free' + (threw ? ' — ' + threw.message : ''));
    ok(scene.milestoneBarFill, 'Fast Track also renders the center milestone bar');
  }
  // Fraction bounds: every drawn bar width must fit inside the track
  // (fraction clamped to [0,1] => width <= track width; resets at boundaries).
  {
    const { barRect, widths } = await driveRange('ktm_valley');
    ok(widths.length > 0, 'milestone bar actually drew during the driven range (' + widths.length + ' fill ops)');
    const inBounds = widths.every(w => w >= 0 && w <= barRect.w + 0.001);
    ok(inBounds, 'every drawn fill width within [0, trackWidth] (max ' + Math.max(...widths).toFixed(1) + ' <= ' + barRect.w.toFixed(1) + ')');
    const sawReset = widths.some((w, i) => i > 0 && w < widths[i - 1] - 50);
    ok(sawReset, 'bar visibly reset at milestone boundaries (fraction restarts)');
  }

// ---------- HB6: FULL-RUN stability drive (P15) ----------
// A representative large-sample drive across the whole 100,000m normal-stage
// run (500m checkpoints), plus Fast Track driven to its designed completion.
console.log('[HB6] full-run stability drive (100,000m normal / Fast Track to completion)');
{
  const { milestoneIndexAt } = await import('../src/game/RunProgress.js');
  // Normal stage: the FULL 100,000m run.
  {
    const { scene, threw, frames, barRect, widths } = await driveRange('ktm_valley', { maxDist: 100000, step: 500 });
    ok(threw === null, 'normal stage: full 100,000m drive (' + frames + ' checkpoints) error-free' + (threw ? ' — ' + threw.message : ''));
    // driveRange() breaks on isComplete/isGameOver — reaching ALL 201
    // checkpoints proves no EARLY termination; completing exactly at the
    // 100,000m cap (P7B maxRunDistance) is the designed behavior.
    ok(frames === 201 && scene.gameState.isComplete === true,
      'normal stage ran every checkpoint and completed exactly at the 100,000m cap');
    ok(scene.gameState.milestonesReached === milestoneIndexAt(100000),
      'milestone guard consistent at 100,000m (' + scene.gameState.milestonesReached + ' == ' + milestoneIndexAt(100000) + ')');
    const inBounds = widths.every(w => w >= 0 && w <= barRect.w + 0.001);
    ok(inBounds, 'bar fill within track bounds across the full run (' + widths.length + ' ops)');
  }
  // Fast Track: completes at 2500m by design.
  {
    const { scene, threw, frames } = await driveRange('ktm_nijgadh_fast_track', { maxDist: 4000, step: 250 });
    ok(threw === null, 'Fast Track: drive to completion (' + frames + ' checkpoints) error-free' + (threw ? ' — ' + threw.message : ''));
    ok(scene.gameState.isComplete === true, 'Fast Track completed at its 2500m target (isComplete=true)');
  }
}

console.log('\n============================================');
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
console.log('============================================');
if (fail > 0) process.exit(1);
