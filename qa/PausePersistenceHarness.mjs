// ============================================
// Nepali Racer - QA Harness: Pause Persistence (Phase 1.8)
// ============================================
// Focused regression harness for the pause-menu persistence fix:
//   BEFORE FIX: pause->RESTART called scene.restart() with NO banking and NO
//               best-save (run economy silently discarded), and pause->EXIT
//               banked currency but skipped saveRunBests() (new best lost).
//   AFTER FIX:  both paths bank currency exactly once AND persist run bests
//               exactly once, reusing the existing hasBankedRunRewards flag
//               and the strictly-greater updateBest* guards.
//
// Exercises the REAL GameScene.togglePauseMenu() button handlers, the REAL
// bankRunRewards()/saveRunBests() methods and the REAL SaveSystem singleton
// over a localStorage polyfill. Only the Phaser display layer is stubbed
// (text stubs RECORD .on() handlers so the real button flows can be emitted).
//
//   PP1. pause->RESTART: currency banked exactly once, best saved exactly
//        once, scene restarted exactly once; a second activation is a no-op
//        (no double-bank, no double-save).
//   PP2. pause->EXIT: currency banked exactly once, best saved exactly once,
//        navigation target is StageSelect (unchanged); second activation no-op.
//   PP3. gameOver() parity: banks+saves exactly once; repeat call persists
//        nothing further (existing P3 Step 4 guarantee intact).
//   PP4. stageComplete() parity: banks+saves exactly once in a single win.
//   PP5. guard flag integrity: hasBankedRunRewards blocks re-banking across
//        paths within one scene instance.

globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); }
};
globalThis.window = { innerWidth: 1280, innerHeight: 720, addEventListener() {} };
Object.defineProperty(globalThis, 'navigator', {
  value: { userAgent: 'node-harness', maxTouchPoints: 0 },
  configurable: true
});
globalThis.document = { createElement() { return { style: {} }; } };
globalThis.Phaser = {
  Scene: class { constructor() {} },
  Math: {
    Angle: { Wrap: (a) => a, Normalize: (a) => a, RotateTo: (from) => from },
    Clamp: (v, min, max) => Math.max(min, Math.min(max, v))
  },
  Input: { Keyboard: { KeyCodes: { W: 87, A: 65, S: 83, D: 68 } } }
};

let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label); }
};

// ---------- display-layer stubs (handlers RECORDED so buttons are drivable) --
const makeText = () => {
  const t = {
    text: '', x: 0, y: 0, visible: true, _h: {},
    setScrollFactor() { return t; }, setDepth() { return t; }, setOrigin() { return t; },
    setInteractive() { return t; }, setColor() { return t; },
    setVisible(v) { t.visible = v; return t; }, setStyle() { return t; },
    setText(s) { t.text = String(s); return t; },
    setPosition(x, y) { t.x = x; t.y = y; return t; },
    on(ev, fn) { (t._h[ev] = t._h[ev] || []).push(fn); return t; },
    emit(ev) { (t._h[ev] || []).forEach(fn => fn()); return t; },
    destroy() {}
  };
  return t;
};
const makeRect = () => {
  const r = {
    setScrollFactor() { return r; }, setDepth() { return r; }, setOrigin() { return r; },
    setInteractive() { return r; }, setStrokeStyle() { return r; }
  };
  return r;
};
const makeContainer = () => {
  const c = {
    children: [],
    add(items) { c.children.push(...[].concat(items)); return c; },
    setScrollFactor() { return c; }, setDepth() { return c; }, destroy() {}
  };
  return c;
};

// Build a scene able to run togglePauseMenu/gameOver/stageComplete without
// create(). Mirrors qa/HudBootHarness.mjs buildScene() state setup.
async function buildScene() {
  const { GameScene } = await import('../src/scenes/GameScene.js');
  const scene = Object.create(GameScene.prototype);
  const calls = { restart: 0, startTo: [] };
  scene.scene = {
    start: (key) => calls.startTo.push(key),
    restart: () => { calls.restart++; },
    systems: {}, isActive: () => true
  };
  scene.sceneCalls = calls;
  scene.scale = { width: 1280, height: 720 };
  scene.add = {
    graphics() { return makeText(); }, // graphics unused here; chain-safe sink
    text(x, y, s) { const t = makeText(); t.x = x; t.y = y; t.text = String(s); return t; },
    rectangle(x, y, w, h, color, alpha) { return makeRect(); },
    container() { return makeContainer(); }
  };
  scene.events = { once() {} };
  scene.time = { delayedCall() {} };
  scene.controls = {};
  scene.touchControls = null;
  scene.bonusBanner = null;
  scene.stage = { id: 'ktm_valley' };
  scene.isFastTrack = false;
  scene.maxRunDistance = 100000;
  scene.displayTargetDistance = 2500;
  scene.gameState = {
    distance: 1234, fuel: 100, coins: 37, diamonds: 2, score: 0, speed: 0,
    isGameOver: false, isPaused: false, isComplete: false,
    milestonesReached: 4, highestMilestone: 4
  };
  scene.bonusCounts = { airTime: 0, longJump: 0, record: 0, target: 0 };
  scene.hasBankedRunRewards = false;
  scene.vehicleTuning = { fuelCapacity: 100 };
  return scene;
}

// Seed the real SaveSystem singleton + backing store with known balances.
async function seedSave({ coins, diamonds, bestDistance, bestRunCoins, bestMilestone }) {
  localStorage.setItem('nepali_racer_save', JSON.stringify({
    schemaVersion: 2, coins, diamonds, bestDistance, bestRunCoins, bestMilestone,
    bestScore: 0,
    unlockedVehicles: ['tempo'], unlockedCharacters: ['default_rider'],
    unlockedStages: ['ktm_valley'], completedStages: [],
    selectedVehicle: 'tempo', selectedCharacter: 'default_rider', selectedStage: 'ktm_valley',
    settings: { sound: true, music: true, vibration: false, debugMode: false }
  }));
  const m = await import('../src/systems/SaveSystem.js');
  m.saveSystem.data = m.saveSystem.load(); // real load/migrate/sanitize path
  return m.saveSystem;
}
const disk = () => JSON.parse(localStorage.getItem('nepali_racer_save'));

// ---------- PP1: pause -> RESTART ----------
console.log('[PP1] pause->RESTART banks currency + saves bests exactly once, then restarts');
{
  const ss = await seedSave({ coins: 100, diamonds: 5, bestDistance: 1000, bestRunCoins: 20, bestMilestone: 3 });
  const scene = await buildScene();
  scene.togglePauseMenu(true);
  const btn = scene.pauseMenu.children.find(o => o.text === 'RESTART');
  ok(!!btn, 'pause menu exposes a RESTART button');
  btn.emit('pointerup'); // the REAL fixed handler: bank + saveBests + restart

  ok(disk().coins === 137, `currency banked exactly once (100 + 37 -> ${disk().coins})`);
  ok(disk().diamonds === 7, `diamonds banked exactly once (5 + 2 -> ${disk().diamonds})`);
  ok(disk().bestDistance === 1234, `best distance persisted (1000 -> ${disk().bestDistance})`);
  ok(disk().bestRunCoins === 37, `best run coins persisted (20 -> ${disk().bestRunCoins})`);
  ok(disk().bestMilestone === 4, `best milestone persisted (3 -> ${disk().bestMilestone})`);
  ok(scene.sceneCalls.restart === 1, `scene restarted exactly once (${scene.sceneCalls.restart})`);

  // Second activation must be a full no-op on the wallet/bests (exact-once).
  btn.emit('pointerup');
  ok(disk().coins === 137 && disk().diamonds === 7, 'second RESTART does NOT double-bank currency');
  ok(disk().bestDistance === 1234 && disk().bestRunCoins === 37, 'second RESTART does NOT double-save bests');
}

// ---------- PP2: pause -> EXIT ----------
console.log('[PP2] pause->EXIT banks currency + saves bests exactly once, navigates to StageSelect');
{
  const ss = await seedSave({ coins: 100, diamonds: 5, bestDistance: 1000, bestRunCoins: 20, bestMilestone: 3 });
  const scene = await buildScene();
  scene.togglePauseMenu(true);
  const btn = scene.pauseMenu.children.find(o => o.text === 'EXIT');
  ok(!!btn, 'pause menu exposes an EXIT button');
  btn.emit('pointerup'); // the REAL fixed handler: bank + saveBests + start(StageSelect)

  ok(disk().coins === 137, `currency banked exactly once (100 + 37 -> ${disk().coins})`);
  ok(disk().diamonds === 7, `diamonds banked exactly once (5 + 2 -> ${disk().diamonds})`);
  ok(disk().bestDistance === 1234, `best distance persisted on EXIT (1000 -> ${disk().bestDistance})`);
  ok(disk().bestMilestone === 4, `best milestone persisted on EXIT (3 -> ${disk().bestMilestone})`);
  ok(scene.sceneCalls.startTo.length === 1 && scene.sceneCalls.startTo[0] === 'StageSelectScene',
    `navigation unchanged: start(['${scene.sceneCalls.startTo.join("','")}']) and no restart (${scene.sceneCalls.restart})`);

  btn.emit('pointerup');
  ok(disk().coins === 137 && disk().bestDistance === 1234, 'second EXIT does NOT double-bank/double-save');
  ok(scene.sceneCalls.startTo.length === 2, 'second EXIT only re-navigates (no extra economy writes)');
}

// ---------- PP3: gameOver parity ----------
console.log('[PP3] gameOver() still banks/saves exactly once (repeat call is a no-op)');
{
  const ss = await seedSave({ coins: 100, diamonds: 5, bestDistance: 1000, bestRunCoins: 20, bestMilestone: 3 });
  const scene = await buildScene();
  scene.gameOver('QA fuel-out');
  ok(disk().coins === 137 && disk().diamonds === 7, 'gameOver banks currency exactly once');
  ok(disk().bestDistance === 1234, 'gameOver persists best distance exactly once');
  ok(scene.gameState.isGameOver === true, 'gameOver flags the run over');
  scene.gameOver('QA again'); // real flow cannot double-fire (update() gate); guards must hold anyway
  ok(disk().coins === 137 && disk().bestDistance === 1234, 'repeat gameOver persists nothing further');
}

// ---------- PP4: stageComplete parity ----------
console.log('[PP4] stageComplete() still banks/saves exactly once in a single win');
{
  const ss = await seedSave({ coins: 100, diamonds: 5, bestDistance: 1000, bestRunCoins: 20, bestMilestone: 3 });
  const scene = await buildScene();
  scene.stageComplete();
  ok(disk().coins === 137 && disk().diamonds === 7, 'stageComplete banks currency exactly once');
  ok(disk().bestDistance === 1234, 'stageComplete persists best distance');
  ok(scene.gameState.isComplete === true && scene.hasBankedRunRewards === true,
    'stageComplete flags completion + armed bank guard');
  // Any later loss path on the same scene instance cannot re-bank (P3 Step 4).
  const reBank = scene.bankRunRewards();
  ok(reBank === false && disk().coins === 137, 'post-win loss path cannot double-bank (hasBankedRunRewards)');
}

// ---------- PP5: cross-path guard integrity on one scene ----------
console.log('[PP5] one run cannot pay out through two paths');
{
  const ss = await seedSave({ coins: 100, diamonds: 5, bestDistance: 1000, bestRunCoins: 20, bestMilestone: 3 });
  const scene = await buildScene();
  scene.togglePauseMenu(true);
  scene.pauseMenu.children.find(o => o.text === 'RESTART').emit('pointerup');
  // Same scene instance routed through gameOver afterwards (defensive path):
  scene.gameOver('QA after restart-press');
  ok(disk().coins === 137 && disk().diamonds === 7,
    'RESTART press then gameOver: currency still banked exactly once (137/7)');
}

console.log('\n============================================');
console.log('PAUSE-PERSISTENCE RESULT: ' + pass + ' passed, ' + fail + ' failed');
console.log('============================================');
if (fail > 0) process.exit(1);
