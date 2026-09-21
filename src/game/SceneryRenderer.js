// ============================================
// Nepali Racer - Procedural Scenery Renderer (P7E-3)
// ============================================
// Region-themed procedural roadside scenery for NORMAL stages, drawn with
// Phaser Graphics primitives only (no external assets, no physics bodies).
//
// Architecture (100,000m-safe):
//   - ONE Graphics layer (created before the vehicle in GameScene so the
//     vehicle always renders above scenery; terrain renders below it).
//   - Windowed generation: scenery slots are produced only inside
//     [camera - WINDOW_BEHIND, camera + WINDOW_AHEAD], tracked by a
//     per-category forward cursor (never re-generates behind the window).
//   - Deterministic placement: every decision (existence, variant, size,
//     jitter) comes from hash01(worldX + categorySeed + stageSeed). The same
//     world X always produces the same scenery - no Math.random(), no
//     flicker, and catching up from scratch equals incremental generation.
//   - Bounded cleanup: items behind the camera window are dropped every
//     update; the active item list stays small for the whole 100km run.
//   - Visual-only: every roadside object is anchored exactly on the terrain
//     surface line (getTerrainYAt) and extends UPWARD (background side of
//     the road). Nothing touches collision, and the vehicle draws above.
//
// FAST TRACK: this renderer disables itself for Fast Track stages
// (terrain.isFastTrack) so it can never double-render the existing rich
// EnvironmentRenderer scenery.

// Deterministic hash -> [0, 1). Same input, same output, forever.
function hash01(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

// Stable string seed (per stage) so different stages decorrelate placement.
function stringSeed(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
}

// Category registry: spacing baselines from the 7E audit; density resolved
// from the stage's region theme (0 disables the category entirely).
const CATEGORY_DEFS = [
  { kind: 'river', spacing: 500, seed: 11, density: t => (typeof t.scenery.river === 'number' ? t.scenery.river : 0) },
  { kind: 'farm', spacing: 450, seed: 23, density: t => t.scenery.farms },
  { kind: 'tea', spacing: 120, seed: 37, density: t => (t.vegetation.type === 'tea' ? t.vegetation.density * 0.9 : 0) },
  { kind: 'rock', spacing: 350, seed: 53, density: t => t.scenery.rocks },
  { kind: 'tree', spacing: 260, seed: 71, density: t => t.scenery.trees },
  { kind: 'house', spacing: 3000, seed: 89, density: t => t.scenery.houses },
  { kind: 'pole', spacing: 520, seed: 101, density: t => t.scenery.poles },
  { kind: 'sign', spacing: 2400, seed: 127, density: t => t.scenery.signs },
  // P7E-5: Nepal landmark categories (visual-only; densities from landmarkDensity()).
  { kind: 'wall', spacing: 720, seed: 201, density: t => landmarkDensity(t.id).wall },
  { kind: 'flag', spacing: 900, seed: 211, density: t => landmarkDensity(t.id).flag },
  { kind: 'temple', spacing: 4200, seed: 223, density: t => landmarkDensity(t.id).temple },
  { kind: 'bridge', spacing: 2600, seed: 227, density: t => landmarkDensity(t.id).bridge },
  { kind: 'tunnel', spacing: 3400, seed: 229, density: t => landmarkDensity(t.id).tunnel }
];

// Roadside sign texts per region theme (visual identity only, no gameplay).
const SIGN_NAMES = {
  KTM_URBAN: ['KATHMANDU', 'LALITPUR', 'BHAKTAPUR'],
  TERAI_EW: ['EAST-WEST HIGHWAY', 'ITAHARI'],
  POKHARA: ['POKHARA', 'SARANGKOT', 'BEGNAS'],
  MUSTANG: ['JOMSOM', 'MUKTINATH', 'LO MANTHANG'],
  ANNAPURNA: ['MANANG', 'THORANG LA'],
  MAKWANPUR: ['HETAUDA', 'NAUBISE'],
  RIVER_CORRIDOR: ['MUGLIN', 'TRISHULI'],
  CHITWAN: ['SAURAHA', 'CHITWAN NP'],
  TERAI_MADHESH: ['JANAKPUR', 'BIRGUNJ'],
  BP_SINDHULI: ['SINDHULI', 'KHURKOT'],
  TEA_ILAM: ['ILAM', 'KANYAM', 'ANTU DANDA'],
  LUMBINI_WEST: ['LUMBINI', 'BUTWAL'],
  PALPA_TANSEN: ['TANSEN', 'PALPA'],
  KAGBENI: ['KAGBENI', 'MUKTINATH'],
  KARNALI: ['JUMLA', 'MANMA'],
  DEFAULT: ['NEPAL', 'SUBLAKAM']
};

// P7E-5: per-region landmark densities (0..1). Deterministic plain data — the
// rural/urban themes get denser native landmarks, fast-highland themes get
// stone walls, prayer-flag strings and occasional temples; missing ids fall
// back to all-zero (category disabled) to keep other themes unchanged.
function landmarkDensity(themeId) {
  const d = {
    KTM_URBAN: { wall: 0.18, flag: 0.1, temple: 0.45, bridge: 0.08, tunnel: 0 },
    TERAI_EW: { wall: 0.12, flag: 0, temple: 0.1, bridge: 0.15, tunnel: 0 },
    POKHARA: { wall: 0.12, flag: 0.1, temple: 0.15, bridge: 0.22, tunnel: 0 },
    MUSTANG: { wall: 0.42, flag: 0.5, temple: 0.12, bridge: 0.12, tunnel: 0.1 },
    ANNAPURNA: { wall: 0.5, flag: 0.55, temple: 0.08, bridge: 0.18, tunnel: 0.25 },
    MAKWANPUR: { wall: 0.38, flag: 0.1, temple: 0.1, bridge: 0.12, tunnel: 0.3 },
    RIVER_CORRIDOR: { wall: 0.32, flag: 0.08, temple: 0.1, bridge: 0.55, tunnel: 0.25 },
    CHITWAN: { wall: 0.1, flag: 0, temple: 0.1, bridge: 0.18, tunnel: 0 },
    TERAI_MADHESH: { wall: 0.12, flag: 0, temple: 0.08, bridge: 0.12, tunnel: 0 },
    BP_SINDHULI: { wall: 0.4, flag: 0.1, temple: 0.12, bridge: 0.18, tunnel: 0.3 },
    TEA_ILAM: { wall: 0.15, flag: 0.25, temple: 0.12, bridge: 0.15, tunnel: 0.1 },
    LUMBINI_WEST: { wall: 0.1, flag: 0, temple: 0.18, bridge: 0.12, tunnel: 0 },
    PALPA_TANSEN: { wall: 0.38, flag: 0.1, temple: 0.15, bridge: 0.12, tunnel: 0.1 },
    KAGBENI: { wall: 0.42, flag: 0.4, temple: 0.1, bridge: 0.15, tunnel: 0.1 },
    KARNALI: { wall: 0.45, flag: 0.35, temple: 0.08, bridge: 0.3, tunnel: 0.3 },
    DEFAULT: { wall: 0, flag: 0, temple: 0, bridge: 0, tunnel: 0 }
  };
  return d[themeId] || d.DEFAULT;
}

export class SceneryRenderer {
  /**
   * @param {Phaser.Scene} scene
   * @param {Terrain} terrain (getTerrainYAt / getTerrainAngleAt are used read-only)
   * @param {object} stagePlan resolved StagePlan (plan.visual = region theme)
   */
  constructor(scene, terrain, stagePlan) {
    this.scene = scene;
    this.terrain = terrain;
    this.plan = stagePlan || null;
    this.visual = (stagePlan && stagePlan.visual) ? stagePlan.visual : null;

    // Fast Track has its own rich EnvironmentRenderer - never double-render.
    // (Checked BEFORE creating any objects: Fast Track scenes allocate nothing.)
    this.enabled = !terrain.isFastTrack && !!this.visual;

    // World-space Graphics (default scrollFactor 1, depth 0). GameScene must
    // create this renderer BEFORE the vehicle so the vehicle draws above it.
    this.graphics = this.enabled ? scene.add.graphics() : null;

    // Window bounds (active scenery band, same philosophy as P7B terrain).
    this.windowAhead = 3200;
    this.windowBehind = 600;

    // Per-category forward cursors (world X). Move only forward.
    this.cursors = CATEGORY_DEFS.map(() => 0);

    // Active scenery items (bounded by the window).
    this.items = [];
    this.lastCleanupCam = null;

    // Pooled sign texts (bounded reuse, EnvironmentRenderer-style).
    this.textPool = [];
    this.activeTexts = [];

    this.stageSeed = stringSeed(this.plan && this.plan.stageId);
    this.themeId = this.visual ? this.visual.id : 'DEFAULT';
  }

  // ---------- windowed, deterministic generation ----------

  update(cameraX) {
    if (!this.enabled) return;

    // 1. Extend generation cursors inside the window (forward only).
    const windowEnd = cameraX + this.windowAhead;
    for (let c = 0; c < CATEGORY_DEFS.length; c++) {
      const def = CATEGORY_DEFS[c];
      const density = def.density(this.visual);
      if (!(density > 0)) {
        // Keep the cursor near the window so a theme can never accumulate
        // unbounded catch-up work for disabled categories.
        if (this.cursors[c] < windowEnd) this.cursors[c] = windowEnd;
        continue;
      }
      let guard = 0;
      while (this.cursors[c] < windowEnd && guard++ < 200) {
        const x = this.cursors[c];
        const roll = hash01(x * 0.731 + def.seed + this.stageSeed);
        if (roll < density) this.spawnItem(def, c, x);
        // deterministic jittered spacing within the audit band
        const jitter = 0.9 + 0.2 * hash01(x * 3.17 + def.seed);
        this.cursors[c] = x + def.spacing * jitter;
      }
    }

    // 2. Drop scenery behind the active window (bounded memory). Items are
    // pushed in per-category cursor order (interleaved), so they are NOT
    // sorted by x - scan instead of trusting items[0].
    if (this.items.length > 0 && cameraX !== this.lastCleanupCam) {
      this.lastCleanupCam = cameraX;
      const removeBefore = cameraX - this.windowBehind;
      if (this.items.some(item => item.x <= removeBefore)) {
        this.items = this.items.filter(item => item.x > removeBefore);
      }
    }

    // 3. Redraw the visible band (single Graphics, no permanent objects).
    this.render(cameraX);
  }

  spawnItem(def, catIndex, x) {
    const h2 = hash01(x * 1.317 + def.seed * 2.7 + this.stageSeed);
    const h3 = hash01(x * 3.11 + def.seed * 5.3 + this.stageSeed);
    const h4 = hash01(x * 5.77 + def.seed * 7.9 + this.stageSeed);
    const jitter = (h3 - 0.5) * def.spacing * 0.45;
    const itemX = Math.max(0, x + jitter);
    const surfaceY = this.terrain.getTerrainYAt(itemX);
    if (!Number.isFinite(surfaceY)) return;
    this.items.push({
      kind: def.kind,
      x: itemX,
      y: surfaceY, // anchored exactly on the (unchanged) collision line
      angle: this.terrain.getTerrainAngleAt(itemX),
      v: Math.floor(h2 * 4), // variant 0..3
      s: 0.8 + h4 * 0.5, // size scale 0.8..1.3
      r: h4
    });
  }

  // ---------- rendering ----------

  recycleTexts() {
    for (const t of this.activeTexts) t.setVisible(false);
    const pooled = this.textPool;
    pooled.push(...this.activeTexts);
    this.activeTexts = [];
  }

  getText(x, y, text, style) {
    let tObj = this.textPool.pop();
    if (!tObj) {
      tObj = this.scene.add.text(x, y, text, style).setDepth(1).setOrigin(0.5);
    } else {
      tObj.setPosition(x, y);
      tObj.setText(text);
      tObj.setStyle(style);
      tObj.setVisible(true);
    }
    this.activeTexts.push(tObj);
    return tObj;
  }

  render(cameraX) {
    this.recycleTexts();
    const g = this.graphics;
    g.clear();

    const viewW = (this.scene.scale && this.scene.scale.width) || 1280;
    const viewLeft = cameraX - 200;
    const viewRight = cameraX + viewW + 200;
    const visible = this.items.filter(item => item.x >= viewLeft && item.x <= viewRight);
    if (visible.length === 0) return;

    const theme = this.visual;
    const veg = theme.vegetation;
    const ground = theme.ground;

    // Draw order within the layer: river hints (lowest), ground patches
    // (farms/tea), rocks, trees, houses, then poles/signs nearest the road.
    const order = { river: 0, bridge: 1, tunnel: 2, farm: 3, tea: 4, rock: 5, wall: 6, tree: 7, temple: 8, house: 9, pole: 10, sign: 11, flag: 12 };
    visible.sort((a, b) => order[a.kind] - order[b.kind] || a.x - b.x);

    const poles = [];
    for (const item of visible) {
      switch (item.kind) {
        case 'river': this.drawRiver(g, item); break;
        case 'farm': this.drawFarm(g, item, ground); break;
        case 'tea': this.drawTeaRows(g, item, veg); break;
        case 'rock': this.drawRock(g, item); break;
        case 'tree': this.drawTree(g, item, veg); break;
        case 'house': this.drawHouse(g, item); break;
        case 'pole': poles.push(item); this.drawPole(g, item); break;
        case 'sign': this.drawSign(g, item, cameraX); break;
        case 'wall': this.drawWall(g, item, theme); break;
        case 'flag': this.drawFlag(g, item); break;
        case 'temple': this.drawTemple(g, item); break;
        case 'bridge': this.drawBridge(g, item); break;
        case 'tunnel': this.drawTunnel(g, item); break;
        default: break;
      }
    }

    // Small wire spans between consecutive visible poles (never a huge grid).
    for (let i = 0; i < poles.length - 1; i++) {
      const a = poles[i];
      const b = poles[i + 1];
      if (b.x - a.x < 900) this.drawWireSpan(g, a, b);
    }
  }

  // -- rivers: translucent meandering band on the slope BELOW the road band --
  drawRiver(g, item) {
    const w = 380 + item.v * 80;
    const topY = item.y + 46; // starts below the asphalt band (~W<=30 + margin)
    g.fillStyle(0x4a7a9a, 0.35);
    g.beginPath();
    g.moveTo(item.x, topY);
    for (let dx = 0; dx <= w; dx += 40) {
      g.lineTo(item.x + dx, topY + Math.sin((item.x + dx) * 0.01 + item.v) * 6);
    }
    g.lineTo(item.x + w, topY + 40);
    for (let dx = w; dx >= 0; dx -= 40) {
      g.lineTo(item.x + dx, topY + 40 + Math.sin((item.x + dx) * 0.012 + item.v) * 6);
    }
    g.closePath();
    g.fillPath();
    // light streak
    g.lineStyle(2, 0xbdd7e8, 0.35);
    g.beginPath();
    for (let dx = 0; dx <= w; dx += 40) {
      const y = topY + 20 + Math.sin((item.x + dx) * 0.011 + item.v) * 5;
      if (dx === 0) g.moveTo(item.x + dx, y); else g.lineTo(item.x + dx, y);
    }
    g.strokePath();
  }

  // -- farms/fields: alternating crop strips on the background side --
  drawFarm(g, item, ground) {
    const g2 = this.graphics;
    const strips = 2 + item.v;
    const w = 90 + Math.floor(item.r * 90);
    const colors = [0x9aa84f, 0xc2b04f, 0x7a9a45, 0xb89a5c];
    for (let s = 0; s < strips; s++) {
      const yy = item.y - 6 - s * 9 * item.s;
      const xx = item.x + s * 4;
      g2.fillStyle(colors[(item.v + s) % colors.length], 0.85);
      g2.fillRect(xx, yy, w, 6);
      // furrow lines
      g2.lineStyle(1, 0x6b5c35, 0.5);
      for (let fx = 6; fx < w; fx += 14) {
        g2.beginPath();
        g2.moveTo(xx + fx, yy);
        g2.lineTo(xx + fx, yy + 6);
        g2.strokePath();
      }
    }
  }

  // -- tea garden rows: recognizable parallel contoured rows with leaf bumps --
  drawTeaRows(g, item, veg) {
    const rows = 3 + item.v;
    const w = 70 + Math.floor(item.r * 60);
    const greens = [veg.primary, veg.secondary];
    for (let r = 0; r < rows; r++) {
      const baseY = item.y - 4 - r * 11 * item.s;
      const col = greens[r % greens.length];
      // row spine
      g.lineStyle(3, parseInt(String(col).replace('#', '0x')), 0.95);
      g.beginPath();
      for (let dx = 0; dx <= w; dx += 12) {
        const y = baseY - Math.sin((item.x + dx) * 0.05) * 2;
        if (dx === 0) g.moveTo(item.x + dx, y); else g.lineTo(item.x + dx, y);
      }
      g.strokePath();
      // leaf bumps along the row
      g.fillStyle(parseInt(String(col).replace('#', '0x')), 1);
      for (let dx = 4; dx <= w; dx += 12) {
        g.fillCircle(item.x + dx, baseY - Math.sin((item.x + dx) * 0.05) * 2 - 2, 2.6);
      }
    }
  }

  // -- rocks: irregular two-tone polygons --
  drawRock(g, item) {
    const w = (14 + item.v * 7) * item.s;
    const h = (10 + ((item.r * 3) | 0) * 4) * item.s;
    const pts = [];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const rr = 0.75 + hash01(item.x * 9.3 + i * 17.1) * 0.5;
      pts.push({ x: item.x + Math.cos(a) * w * rr, y: item.y - Math.abs(Math.sin(a)) * h * rr - (Math.sin(a) < 0 ? 0 : 0) });
    }
    g.fillStyle(0x6f6a61, 0.95);
    g.fillPoints(pts, true);
    // highlight facet
    g.fillStyle(0x8f8a80, 0.8);
    g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, item.x, item.y - h * 0.9);
  }

  // -- trees: broadleaf / pine / dry-sparse / jungle from vegetation.type --
  drawTree(g, item, veg) {
    const primary = parseInt(String(veg.primary).replace('#', '0x'));
    const secondary = parseInt(String(veg.secondary).replace('#', '0x'));
    const type = veg.type;
    const dense = veg.density > 0.75;
    const trunk = 0x5a4632;

    if (type === 'pine') {
      const h = (46 + item.v * 10) * item.s;
      g.fillStyle(trunk, 1);
      g.fillRect(item.x - 2, item.y - h * 0.3, 4, h * 0.3);
      for (let t = 0; t < 3; t++) {
        const wT = (22 - t * 5) * item.s;
        const yT = item.y - h * 0.3 - t * h * 0.24;
        g.fillStyle(t % 2 ? secondary : primary, 1);
        g.fillTriangle(item.x - wT, yT, item.x + wT, yT, item.x, yT - h * 0.34);
      }
      return;
    }

    if (type === 'sparse') {
      const h = (26 + item.v * 8) * item.s;
      g.lineStyle(3, trunk, 1);
      g.beginPath();
      g.moveTo(item.x, item.y);
      g.lineTo(item.x, item.y - h);
      g.moveTo(item.x, item.y - h * 0.6);
      g.lineTo(item.x - 8 * item.s, item.y - h * 0.9);
      g.moveTo(item.x, item.y - h * 0.75);
      g.lineTo(item.x + 9 * item.s, item.y - h);
      g.strokePath();
      g.fillStyle(primary, 0.9);
      g.fillCircle(item.x - 8 * item.s, item.y - h * 0.95, 3);
      g.fillCircle(item.x + 9 * item.s, item.y - h * 1.05, 3);
      return;
    }

    // broadleaf; dense (>0.75) regions get taller jungle-style canopies
    const h = (dense ? 40 + item.v * 12 : 30 + item.v * 8) * item.s;
    g.fillStyle(trunk, 1);
    g.fillRect(item.x - 2.5 * item.s, item.y - h * 0.45, 5 * item.s, h * 0.45);
    const cw = (dense ? 20 : 15) * item.s;
    g.fillStyle(primary, 1);
    g.fillCircle(item.x - cw * 0.5, item.y - h * 0.62, cw * 0.75);
    g.fillCircle(item.x + cw * 0.5, item.y - h * 0.62, cw * 0.75);
    g.fillCircle(item.x, item.y - h * 0.85, cw * 0.8);
    g.fillStyle(secondary, 1);
    g.fillCircle(item.x - cw * 0.2, item.y - h * 0.95, cw * 0.45);
  }

  // -- houses: rural/tiled/colorful/urban variants --
  drawHouse(g, item) {
    const s = item.s;
    const urban = item.v === 3;
    const walls = [0xd9cbb2, 0xc9b295, 0xd8c27a, 0xbfae94];
    const roofs = [0x8a4a3a, 0x6b4a3a, 0x7a5a4a];
    const w = (urban ? 34 : 28 + item.v * 3) * s;
    const h = (urban ? 30 : 17) * s;
    const x = item.x - w / 2;

    g.fillStyle(walls[item.v % walls.length], 1);
    g.fillRect(x, item.y - h, w, h);
    g.fillStyle(roofs[item.v % roofs.length], 1);
    g.fillTriangle(x - 4 * s, item.y - h, x + w + 4 * s, item.y - h, item.x, item.y - h - (urban ? 8 : 12) * s);
    if (urban) {
      // flat urban parapet + window grid
      g.fillStyle(0x9aa0a6, 1);
      g.fillRect(x, item.y - h - 3 * s, w, 3 * s);
      g.fillStyle(0x3a4652, 1);
      for (let wy = 0; wy < 2; wy++) {
        for (let wx = 0; wx < 3; wx++) {
          g.fillRect(x + 5 * s + wx * 9 * s, item.y - h + 5 * s + wy * 12 * s, 5 * s, 6 * s);
        }
      }
    } else {
      // tiled roof stripes + door + window
      g.lineStyle(1, 0x5a3a2e, 0.7);
      for (let t = 1; t <= 2; t++) {
        g.beginPath();
        g.moveTo(x + (w / 6) * t, item.y - h - (12 * s * t) / 3);
        g.lineTo(x + w - (w / 6) * t, item.y - h - (12 * s * t) / 3);
        g.strokePath();
      }
      g.fillStyle(0x4a3626, 1);
      g.fillRect(item.x - 3 * s, item.y - 9 * s, 6 * s, 9 * s);
      g.fillStyle(0x3a4652, 1);
      g.fillRect(x + 4 * s, item.y - h + 4 * s, 6 * s, 5 * s);
    }
  }

  // -- utility poles with crossarm + insulators --
  drawPole(g, item) {
    const h = (48 + item.v * 6) * item.s;
    g.lineStyle(3, 0x5a5148, 1);
    g.beginPath();
    g.moveTo(item.x, item.y);
    g.lineTo(item.x, item.y - h);
    g.strokePath();
    g.lineStyle(2, 0x5a5148, 1);
    g.beginPath();
    g.moveTo(item.x - 9 * item.s, item.y - h + 4);
    g.lineTo(item.x + 9 * item.s, item.y - h + 4);
    g.strokePath();
    g.fillStyle(0x2f3841, 1);
    g.fillCircle(item.x - 8 * item.s, item.y - h + 2.5, 1.5);
    g.fillCircle(item.x + 8 * item.s, item.y - h + 2.5, 1.5);
  }

  // shallow sagging wire between two poles (short span only)
  drawWireSpan(g, a, b) {
    const yA = a.y - (48 + a.v * 6) * a.s + 2.5;
    const yB = b.y - (48 + b.v * 6) * b.s + 2.5;
    g.lineStyle(1, 0x2f3841, 0.65);
    g.beginPath();
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = a.x + (b.x - a.x) * t;
      const y = yA + (yB - yA) * t + Math.sin(t * Math.PI) * 6;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
  }

  // -- roadside signs: name boards + curve warnings (pooled text) --
  drawSign(g, item, cameraX) {
    const s = item.s;
    const h = (34 + item.v * 4) * s;
    g.lineStyle(2, 0x8a8f94, 1);
    g.beginPath();
    g.moveTo(item.x, item.y);
    g.lineTo(item.x, item.y - h);
    g.strokePath();

    const names = SIGN_NAMES[this.themeId] || SIGN_NAMES.DEFAULT;
    if (item.v === 3) {
      // curve warning: yellow diamond + bend arrow
      const cx = item.x;
      const cy = item.y - h - 10 * s;
      const r = 9 * s;
      g.fillStyle(0xf4d03f, 1);
      g.fillTriangle(cx, cy - r, cx + r, cy, cx, cy + r);
      g.fillTriangle(cx, cy - r, cx - r, cy, cx, cy + r);
      g.lineStyle(2, 0x2f3841, 1);
      g.beginPath();
      g.moveTo(cx - 3 * s, cy + 3 * s);
      g.lineTo(cx - 1 * s, cy - 2 * s);
      g.lineTo(cx + 3 * s, cy - 2 * s);
      g.strokePath();
      return;
    }
    // place-name board
    const name = names[Math.floor(item.r * names.length) % names.length];
    const bw = 40 * s;
    const bh = 14 * s;
    const bx = item.x - bw / 2;
    const by = item.y - h - bh;
    g.fillStyle(0x2e6b45, 1);
    g.fillRect(bx, by, bw, bh);
    g.lineStyle(1, 0xffffff, 0.9);
    g.strokeRect(bx, by, bw, bh);
    this.getText(item.x, by + bh / 2, name, {
      fontSize: '8px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
  }

  // ------------------------------------------------
  // P7E-5: Nepal landmark draws (visual-only, deterministic).
  // Every value derives from the item's fixed world position only.
  // ------------------------------------------------

  // Retaining / stone roadside walls (stacked blocks, earth/stone tones).
  drawWall(g, item, theme) {
    const s = item.s;
    const n = 3 + (item.v % 3);
    const w = (24 + item.v * 6) * s;
    const base = theme && theme.ground && theme.ground.accent
      ? parseInt(String(theme.ground.accent).replace('#', '0x')) : 0x6b5c35;
    for (let i = 0; i < n; i++) {
      const yy = item.y - 4 * s - i * 8 * s;
      const off = hash01(item.x * 1.3 + i * 7.7) * 3;
      g.fillStyle(i % 2 ? base : 0x7a6a4a, 0.95);
      g.fillRect(item.x - w / 2 + off, yy, w, 8 * s);
    }
    g.fillStyle(0x4a3a2a, 1);
    g.fillRect(item.x - w / 2 - 1, item.y - 4 * s - n * 8 * s, w + 2, 3 * s);
  }

  // Prayer-flag string (pole + row of triangular flags) for highland regions.
  drawFlag(g, item) {
    const s = item.s;
    const x = item.x;
    const topY = item.y - (34 + item.v * 5) * s;
    const cols = [0xe63946, 0xf4a261, 0x2a9d8f, 0xffffff];
    g.fillStyle(0x5a5148, 1);
    g.fillRect(x - 24 * s, topY, 2 * s, item.y - topY);
    g.lineStyle(1.5, 0x5a5148, 0.9);
    g.beginPath();
    g.moveTo(x - 22 * s, topY + 3 * s);
    g.lineTo(x + 22 * s, topY + 3 * s);
    g.strokePath();
    for (let i = 0; i < 10; i++) {
      const fx = x - 22 * s + i * 4.8 * s;
      const fy = topY + 4 * s + (i % 2) * 2;
      g.fillStyle(cols[(item.v + i) % cols.length], 0.9);
      g.fillTriangle(fx, fy, fx + 4.4 * s, fy + 3.4 * s, fx, fy + 6.6 * s);
    }
  }

  // Simple pagoda/stupa silhouette (tiered roofs + golden spire).
  drawTemple(g, item) {
    const s = item.s;
    const x = item.x;
    const base = item.y;
    const w = (30 + item.v * 6) * s;
    const h = (38 + item.v * 8) * s;
    for (let t = 0; t < 3; t++) {
      const tw = w * (1 - t * 0.28);
      const ty = base - h + t * (h * 0.26);
      g.fillStyle(0x8a4a32, 1);
      g.fillRect(x - tw / 2, ty + h * 0.12, tw, h * 0.2);
      g.fillStyle(0xc0562f, 1);
      g.fillTriangle(x - tw / 2 - 4 * s, ty + h * 0.1, x + tw / 2 + 4 * s, ty + h * 0.1, x, ty - 8 * s);
    }
    g.fillStyle(0xf0c040, 1);
    g.fillTriangle(x - 3 * s, base - h - 4 * s, x + 3 * s, base - h - 4 * s, x, base - h - 14 * s);
  }

  // Lightweight bridge: deck, rail, pillars and a soft shadow (visual only).
  drawBridge(g, item) {
    const s = item.s;
    const span = (150 + item.v * 40) * s;
    const x0 = item.x - span / 2;
    const deckY = item.y;
    g.fillStyle(0x000000, 0.18);
    g.fillRect(x0, deckY + 6 * s, span, 6 * s);
    g.fillStyle(0x5b6b72, 1);
    g.fillRect(x0, deckY - 6 * s, span, 6 * s);
    g.lineStyle(2, 0x3f4a52, 1);
    g.beginPath();
    g.moveTo(x0, deckY - 10 * s);
    g.lineTo(item.x + span / 2, deckY - 10 * s);
    g.strokePath();
    const pillars = 2 + (item.v % 3);
    for (let i = 0; i < pillars; i++) {
      const px = x0 + (span / (pillars + 1)) * (i + 1);
      g.fillStyle(0x6f6a61, 1);
      g.fillRect(px - 3 * s, deckY - 6 * s, 6 * s, 28 * s);
    }
  }

  // Decorative tunnel portal: dark arch with rock flanking (visual only).
  drawTunnel(g, item) {
    const s = item.s;
    const w = (44 + item.v * 8) * s;
    const h = (40 + item.v * 8) * s;
    const x = item.x;
    const base = item.y;
    const portal = base - h * 0.5;
    g.fillStyle(0x6c5a45, 1);
    g.fillRect(x - w / 2 - 8 * s, portal, 8 * s, h * 0.5);
    g.fillRect(x + w / 2, portal, 8 * s, h * 0.5);
    g.fillStyle(0x2a2420, 1);
    g.fillRect(x - w / 2, portal, w, h * 0.5);
    g.fillStyle(0x161311, 1);
    g.fillCircle(x, portal + 4 * s, h * 0.28);
    g.fillRect(x - w / 2, portal + 4 * s, w, h * 0.5 - 4 * s);
    g.fillStyle(0x5a4a38, 1);
    g.fillRect(x - w / 2 - 4 * s, portal - 5 * s, w + 8 * s, 5 * s);
  }
}

export default SceneryRenderer;
