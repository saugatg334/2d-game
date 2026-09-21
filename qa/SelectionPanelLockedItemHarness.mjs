// ============================================
// Nepali Racer - QA Harness: SelectionPanel onLockedItem contract (P6B-FIX)
// ============================================
// Headless (no real Phaser) verification that:
//   T1. The exact scene call pattern (setItems -> onSelectItem -> onLockedItem)
//       no longer throws "onLockedItem is not a function" for Character,
//       Vehicle and Stage select panels.
//   T2. Locked-card clicks route to the registered handler (item passed);
//       unlocked-card clicks route to onSelect and NEVER to the locked
//       handler; selectItem still refuses locked items (existing guard).
//   T3. Panels that never register onLockedItem keep the old silent-locked
//       behavior (click is a no-op, no exception).
//   T4. Grid rebuild (destroy + re-create + re-register, as promptPurchase
//       does) keeps working and re-binds the fresh handler.
//
// NOTE: SelectionPanel/Card extend Phaser.GameObjects.Container at module
// load, so a minimal Phaser stub + localStorage shim must exist BEFORE the
// dynamic imports below run.

// ---- localStorage shim (SaveSystem-style code may touch it) ----
globalThis.localStorage = {
  _d: {},
  getItem(k) { return Object.hasOwn(this._d, k) ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; }
};

// ---- Minimal Phaser stub ----
class EventEmitter {
  constructor() { this._ev = {}; }
  on(n, cb) { (this._ev[n] ??= []).push(cb); return this; }
  once(n, cb) { const w = (...a) => { this.off(n, w); cb(...a); }; return this.on(n, w); }
  off(n, cb) { this._ev[n] = (this._ev[n] || []).filter(f => f !== cb); return this; }
  emit(n, ...a) { (this._ev[n] || []).slice().forEach(cb => cb(...a)); return this; }
  removeAllListeners() { this._ev = {}; return this; }
}
class StubGameObject extends EventEmitter {
  constructor() { super(); this.x = 0; this.y = 0; this.destroyed = false; }
  setOrigin() { return this; } setPosition(x, y) { this.x = x; this.y = y; return this; }
  setVisible(v) { this.visible = v; return this; } setText(t) { this.text = t; return this; }
  setStyle() { return this; } setScrollFactor() { return this; } setDepth() { return this; }
  setInteractive() { return this; } setSize() { return this; } setAlpha() { return this; }
  setDisplaySize() { return this; }
  destroy() { this.destroyed = true; this.removeAllListeners(); return this; }
}
globalThis.Phaser = {
  Math: { Clamp: (v, min, max) => Math.max(min, Math.min(max, v)) },
  Scene: class extends EventEmitter {},
  GameObjects: {
    Container: class extends StubGameObject {
      constructor(scene, x = 0, y = 0) { super(); this.scene = scene; this.x = x; this.y = y; this.list = []; }
      add(o) { if (Array.isArray(o)) this.list.push(...o); else this.list.push(o); return this; }
    }
  }
};

const { SelectionPanel } = await import('../src/ui/SelectionPanel.js');
const { characters } = await import('../src/data/characters.js');
const { vehicles } = await import('../src/data/vehicles.js');
const { stages } = await import('../src/data/stages.js');

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? ' - ' + detail : ''}`); }
  else { fail++; console.error(`  FAIL  ${name}${detail ? ' - ' + detail : ''}`); }
};

// ---- Scene mock (only what Card/SelectionPanel touch) ----
function makeScene() {
  const created = { graphics: [], texts: [] };
  const chain = { setOrigin: () => chain, setInteractive: () => chain, destroy: () => {}, on: () => chain, setText: () => chain };
  return {
    created,
    scale: { width: 1280, height: 720 },
    textures: { exists: () => false },
    add: {
      graphics: () => {
        const g = {
          cmds: [], destroyed: false, clear() { this.cmds.length = 0; return this; },
          fillStyle(...a) { this.cmds.push(['fillStyle', ...a]); return this; },
          lineStyle(...a) { this.cmds.push(['lineStyle', ...a]); return this; },
          fillRoundedRect(...a) { this.cmds.push(['fillRoundedRect', ...a]); return this; },
          strokeRoundedRect(...a) { this.cmds.push(['strokeRoundedRect', ...a]); return this; },
          destroy() { this.destroyed = true; return this; }
        };
        created.graphics.push(g); return g;
      },
      text: () => { const t = { ...chain, destroyed: false, text: '', destroy() { this.destroyed = true; } }; created.texts.push(t); return t; },
      image: () => ({ setDisplaySize() { return this; }, destroy() {} }),
      existing: (o) => o
    }
  };
}

// Build a panel exactly the way CharacterSelectScene.createCharacterGrid does
// (options shape identical), then run the exact registration order that threw:
// setItems -> onSelectItem -> onLockedItem. Returns { panel, scene, events }.
function buildSceneStylePanel(items, unlockedIds, opts = {}) {
  const scene = makeScene();
  const events = [];
  const panel = new SelectionPanel(scene, 0, 0, {
    columns: 4, cardWidth: 200, cardHeight: 260, cardSpacing: 20, pageSize: 4,
    selectedId: items[0]?.id,
    imageKey: item => item.id,
    getUnlocked: item => unlockedIds.has(item.id),
    ...opts
  });
  panel.setItems(items, items[0]?.id);
  panel.onSelectItem(item => events.push(['select', item.id]));
  panel.onLockedItem(item => events.push(['locked', item.id]));   // <- previously TypeError
  return { panel, scene, events };
}

const click = card => card.emit('pointerup');
const cardsOf = panel => panel.cards;   // [{ card, item, index }]

console.log('\n[T1] Scene call pattern no longer throws (all three select scenes)');
{
  const last = id => new Set(characters.map(c => c.id).slice(0, -1)).has(id) ? null : id;
  const unlockedChars = new Set(characters.slice(0, -1).map(c => c.id));
  let ok = true;
  try {
    const a = buildSceneStylePanel(characters, unlockedChars);
    ok = typeof a.panel.onLockedItem === 'function' && a.events.length === 0;
  } catch (e) { ok = false; console.error('    characters:', e.message); }
  check('CharacterSelect pattern (register after setItems)', ok);

  const unlockedVeh = new Set(vehicles.slice(0, -1).map(v => v.id));
  try {
    const b = buildSceneStylePanel(vehicles, unlockedVeh, {
      cardWidth: 220, cardHeight: 280, imageWidth: 160, imageHeight: 90
    });
    ok = typeof b.panel.onLockedItem === 'function';
  } catch (e) { ok = false; console.error('    vehicles:', e.message); }
  check('VehicleSelect pattern', ok);

  const unlockedStg = new Set(stages.slice(0, -1).map(s => s.id));
  try {
    const c = buildSceneStylePanel(stages, unlockedStg, {
      getLockHint: () => 'Complete previous stage',
      getStats: s => [`${s.targetDistance}m`, '⭐'.repeat(s.difficulty)]
    });
    ok = typeof c.panel.onLockedItem === 'function';
  } catch (e) { ok = false; console.error('    stages:', e.message); }
  check('StageSelect pattern (incl. getLockHint)', ok);
  check('items present in all datasets', characters.length > 1 && vehicles.length > 1 && stages.length > 1,
    `${characters.length}/${vehicles.length}/${stages.length} items`);
}

console.log('\n[T2] Click routing: locked -> handler, unlocked -> select, guard intact');
{
  const items = characters;
  const unlocked = new Set(items.slice(1).map(c => c.id));   // FIRST = locked (on page 1)
  const { panel, events } = buildSceneStylePanel(items, unlocked);
  const lockedEntry = cardsOf(panel).find(e => !unlocked.has(e.item.id));
  const unlockedEntry = cardsOf(panel).find(e => unlocked.has(e.item.id));

  check('panel page contains one locked card', !!lockedEntry);
  events.length = 0;
  click(lockedEntry.card);
  check('locked click -> onLockedItem handler with the item',
    events.some(e => e[0] === 'locked' && e[1] === lockedEntry.item.id), lockedEntry.item.id);
  check('locked click does NOT trigger selection', !events.some(e => e[0] === 'select'));

  events.length = 0;
  click(unlockedEntry.card);
  check('unlocked click -> onSelect with the item',
    events.some(e => e[0] === 'select' && e[1] === unlockedEntry.item.id), unlockedEntry.item.id);
  check('unlocked click does NOT trigger locked handler', !events.some(e => e[0] === 'locked'));

  // selectItem guard against locked indices (existing behavior)
  events.length = 0;
  panel.selectItem(lockedEntry.index);
  check('selectItem(lockedIndex) still refused', !events.some(e => e[0] === 'select'));
}

console.log('\n[T3] Panels without a registered handler stay silent (old behavior)');
{
  const scene = makeScene();
  const items = characters;
  const unlocked = new Set(items.slice(1).map(c => c.id));   // FIRST = locked
  const panel = new SelectionPanel(scene, 0, 0, {
    columns: 4, cardWidth: 200, cardHeight: 260, cardSpacing: 20, pageSize: 4,
    imageKey: item => item.id,
    getUnlocked: item => unlocked.has(item.id)
  });
  panel.setItems(items);
  const lockedEntry = cardsOf(panel).find(e => !unlocked.has(e.item.id));
  let threw = false;
  try { click(lockedEntry.card); } catch (e) { threw = true; }
  check('locked click with no handler: silent no-op', !threw);
  // And re-registering later must work (late binding)
  const got = [];
  panel.onLockedItem(item => got.push(item.id));
  click(lockedEntry.card);
  check('handler registered after setItems is picked up at click time', got.length === 1);
}

console.log('\n[T4] Grid rebuild (purchase prompt flow) re-binds correctly');
{
  const items = characters;
  const unlocked = new Set(items.slice(1).map(c => c.id));   // FIRST = locked
  const first = buildSceneStylePanel(items, unlocked);
  first.panel.destroy();                                    // scene does selectionPanel?.destroy()
  const second = buildSceneStylePanel(items, unlocked);     // full rebuild + re-register
  const lockedEntry = cardsOf(second.panel).find(e => !unlocked.has(e.item.id));
  second.events.length = 0;
  click(lockedEntry.card);
  check('rebuilt panel fires only the NEW handler', second.events.filter(e => e[0] === 'locked').length === 1);
  check('old panel handlers gone after destroy', first.events.length === 0);
}

console.log(`\n============================================`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log(`============================================`);
process.exit(fail > 0 ? 1 : 0);
