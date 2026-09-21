// ============================================
// Nepali Racer - Collectibles System
// ============================================

// ---- Shared icon painters (P7E-7 visual polish) ----
// Stateless functions taking a Phaser Graphics so the collectibles and the
// GameScene HUD draw the *exact same* original procedural icons. Purely
// visual; deterministic (no Math.random, no time, no scene state).
export function paintCoinIcon(g, x, y, s = 1) {
  const sc = (v) => v * s;
  // P8 coin polish: subtle glow -> dark outer rim -> gold body -> bright
  // center -> inner marking -> small highlight. Purely visual, deterministic,
  // Phaser Graphics only; reward logic untouched.
  g.fillStyle(0xffd700, 0.22);                     // subtle glow halo
  g.fillCircle(x, y, sc(16));
  g.fillStyle(0x8b5a00, 1);                        // dark gold outer rim
  g.fillCircle(x, y, sc(12));
  g.fillStyle(0xffd700, 1);                        // main gold body
  g.fillCircle(x, y, sc(10));
  g.fillStyle(0xffe680, 1);                        // bright center
  g.fillCircle(x, y, sc(6.5));
  g.lineStyle(sc(1.5), 0xb8860b, 0.9);             // inner marking: face ring
  g.strokeCircle(x, y, sc(4));
  g.fillStyle(0xb8860b, 1);                        // inner marking: center punch
  g.fillCircle(x, y, sc(1.8));
  g.fillStyle(0xffffff, 0.85);                     // small top-left highlight
  g.fillCircle(x - sc(4.5), y - sc(4.5), sc(2.2));
}

export function paintDiamondIcon(g, x, y, s = 1) {
  const sc = (v) => v * s;
  const top = { x: x, y: y - sc(14) };
  const bottom = { x: x, y: y + sc(12) };
  const right = { x: x + sc(12), y: y };
  const shared = { x: x, y: y };                    // facet hub
  const left = { x: x - sc(12), y: y };
  g.fillStyle(0x63e2f5, 1);
  g.fillTriangle(top.x, top.y, right.x, right.y, bottom.x, bottom.y);
  g.fillTriangle(top.x, top.y, left.x, left.y, bottom.x, bottom.y);
  g.fillStyle(0xaef3ff, 1);            // lit facet (top-left)
  g.fillTriangle(top.x, top.y, left.x, left.y, shared.x, shared.y);
  g.fillStyle(0x2f9ec4, 1);            // shadow facet (bottom-right)
  g.fillTriangle(bottom.x, bottom.y, right.x, right.y, shared.x, shared.y);
  g.lineStyle(sc(1.5), 0x1a7d9e, 1);
  g.strokeTriangle(top.x, top.y, right.x, right.y, bottom.x, bottom.y);
  g.strokeTriangle(top.x, top.y, left.x, left.y, bottom.x, bottom.y);
}

export function paintFuelCanIcon(g, x, y, s = 1) {
  const sc = (v) => v * s;
  const w = sc(16);
  const h = sc(22);
  g.fillStyle(0xd62728, 1);
  g.fillRect(x - w / 2, y - h + sc(6), w, h);
  g.fillStyle(0x8a1f20, 1);            // cap
  g.fillRect(x - sc(3), y - h, sc(6), sc(6));
  g.lineStyle(sc(2), 0x8a1f20, 1);     // handle
  g.beginPath();
  g.arc(x, y - h + sc(9), sc(5), Math.PI, Math.PI * 2);
  g.strokePath();
  // P8 fuel-can polish: thicker, darker outline for a strong silhouette that
  // stays readable against bright/dark region backgrounds; plus a soft bottom
  // shade for depth. Shape, reward and collision logic untouched.
  g.lineStyle(sc(2.5), 0x55090a, 1);   // bold outline
  g.strokeRect(x - w / 2, y - h + sc(6), w, h);
  g.fillStyle(0x000000, 0.18);         // bottom shade (depth)
  g.fillRect(x - w / 2 + sc(1.5), y - sc(4), w - sc(3), sc(3));
  g.fillStyle(0xff7f7f, 0.9);          // highlight
  g.fillRect(x - w / 2 + sc(2), y - h + sc(9), sc(3), sc(8));
  g.fillStyle(0xc9c9c9, 1);            // fuel band
  g.fillRect(x - w / 2 + sc(3), y - sc(8), w - sc(6), sc(3));
}

export class Collectibles {
  constructor(scene, terrain, collectibleConfig = null) {
    this.scene = scene;
    this.terrain = terrain;
    this.items = [];
    this.graphics = scene.add.graphics();

    // P0 Step 3: resolved stage collectible chances (from StagePlan). Falls back
    // to the current defaults (0.7 / 0.2 / 0.1) so behavior is unchanged when no
    // config is supplied. These are independent probabilities; generate() derives
    // the cumulative thresholds used for the single per-spawn random draw.
    const cfg = (collectibleConfig && typeof collectibleConfig === 'object') ? collectibleConfig : {};
    const fin = (v, fallback) => (typeof v === 'number' && Number.isFinite(v)) ? v : fallback;
    this.chances = {
      coinChance: fin(cfg.coinChance, 0.7),
      fuelChance: fin(cfg.fuelChance, 0.2),
      diamondChance: fin(cfg.diamondChance, 0.1)
    };

    // Min world distance between SAME-TYPE collectibles (prevents visually
    // stacked/clustered fuel cans and immediate same-kind repeats). World px,
    // tuned to the ~100px terrain-segment scale. Spacing-only, no logic change.
    // Min world distance between SAME-TYPE collectibles (prevents visually
    // stacked/clustered fuel cans and immediate same-kind repeats). World px,
    // tuned to the ~100px terrain-segment scale. Spacing-only, no logic change.
    // P8 note: every value here must be <= 300 (see pickType fallback: its
    // largest-gap guarantee is 3 consecutive spawn spacings >= 100px each),
    // so the spacing rule holds BY CONSTRUCTION for all three types.
    this.MIN_SPACING = {
      coin: 90,
      fuel: 220,
      diamond: 300
    };
    // Last world X each type was placed (for the same-type gap rule).
    this.lastXByType = { coin: -1e9, fuel: -1e9, diamond: -1e9 };

    // Collectible types
    this.types = {
      coin: { emoji: '🪙', value: 1, color: 0xffd700 },
      diamond: { emoji: '💎', value: 1, color: 0xb9f2ff },
      fuel: { emoji: '⛽', value: 25, color: 0xe63946 }
    };
  }

  // Spawn collectibles along the terrain.
  // P7B: windowed generation for long-run stages. initialize() clears the
  // item list and sets the cursor; generateAhead(cameraX, maxDistance) spawns
  // items only inside [camera - 500, camera + 3000] using the SAME spacing
  // (100 + rand*200) and the SAME type roll as before. Spawns beyond
  // maxDistance are never created, matching terrain generation. Calling
  // generateAhead() with no prior initialize() (legacy callers) behaves
  // exactly like the old generate(): one bounded pass, no re-init.
  // P7B-DEFERRED: the phase requirement (250-300m scheduler, clusters) is
  // intentionally NOT implemented here - this phase only integrates spawning
  // with the bounded terrain window.
  initialize() {
    this.items = [];
    this.nextSpawnX = 500;
  }

  generateAhead(cameraX, maxDistance) {
    if (typeof this.nextSpawnX !== 'number') {
      // Legacy one-shot call: clear, set cursor, run one bounded window.
      this.initialize();
    }
    const viewLeft = cameraX - 500;
    const viewRight = cameraX + 3000;

    const coinThresh = Math.max(0, Math.min(1, this.chances.coinChance));
    const fuelThresh = Math.max(coinThresh, Math.min(1, Math.round((this.chances.coinChance + this.chances.fuelChance) * 1e9) / 1e9));

    while (this.nextSpawnX < viewRight) {
      const spacing = 100 + Math.random() * 200;
      const x = this.nextSpawnX;
      this.nextSpawnX += spacing;

      if (x < viewLeft) continue; // already behind the camera
      if (typeof maxDistance === 'number' && Number.isFinite(maxDistance) && x >= maxDistance) continue;

      const type = this.pickType(x, coinThresh, fuelThresh);
      this.lastXByType[type] = x;

      const terrainY = this.terrain.getTerrainYAt(x);
      const y = terrainY - 30 - Math.random() * 50;

      this.items.push({
        x: x,
        y: y,
        type: type,
        collected: false,
        bobOffset: Math.random() * Math.PI * 2
      });
    }
  }

  // Pick a type that respects the same-type minimum spacing: keep the existing
  // probabilistic weighting, but avoid spawning a type immediately next to a
  // nearby item of the same kind (fuel cans must never cluster). Bounded: at
  // most MIN_SPACING_TRIES rolls, then a deterministic fallback to the longest
  // spaced type so generation always terminates and stays bounded.
  pickType(x, coinThresh, fuelThresh) {
    const MIN_SPACING_TRIES = 4;
    const rollType = () => {
      const r = Math.random();
      if (r < coinThresh) return 'coin';
      if (r < fuelThresh) return 'fuel';
      return 'diamond';
    };
    for (let i = 0; i < MIN_SPACING_TRIES; i++) {
      const t = rollType();
      if (x - this.lastXByType[t] >= this.MIN_SPACING[t]) return t;
    }
    // P8 spacing fix: the old fallback re-rolled, which could still return a
    // type that violates its own gap (the observed fuel-can clustering).
    // Deterministic spacing-safe fallback instead: the type with the LARGEST
    // gap since its last placement. Because consecutive spawn positions are
    // always >=100px apart, the largest gap is >=300px, which satisfies every
    // type's minimum (coin 90 / fuel 220 / diamond 300) - so fuel-to-fuel
    // spacing can never drop below 220 world px and clusters are impossible.
    return ['coin', 'fuel', 'diamond'].reduce((a, b) =>
      (x - this.lastXByType[b]) > (x - this.lastXByType[a]) ? b : a);
  }

  // Compatibility entry point (P0 Step 3 callers): one bounded window pass.
  // maxDistance caps spawning so a legacy call cannot allocate past the run.
  generate(targetDistance, maxDistance) {
    this.initialize();
    this.generateAhead(0, typeof maxDistance === 'number' ? maxDistance : targetDistance);
  }

  // Check collision with vehicle
  checkCollision(vehicle) {
    const collected = [];

    for (const item of this.items) {
      if (item.collected) continue;

      const dx = vehicle.x - item.x;
      const dy = vehicle.y - item.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 40) {
        item.collected = true;
        collected.push(item);
      }
    }

    return collected;
  }

  // Update collectibles (bobbing animation)
  update(time) {
    for (const item of this.items) {
      if (item.collected) continue;
      // Bob up and down
      item.currentY = item.y + Math.sin(time * 0.003 + item.bobOffset) * 5;
    }
  }

  // Render collectibles with original procedural icons (visual only).
  // Preserves the existing bob (item.currentY), glow halo, and viewport culling.
  render(cameraX) {
    this.graphics.clear();

    const viewLeft = cameraX - 100;
    const viewRight = cameraX + this.scene.scale.width + 100;

    for (const item of this.items) {
      if (item.collected) continue;
      if (item.x < viewLeft || item.x > viewRight) continue;

      const type = this.types[item.type];
      const y = item.currentY || item.y;

      // Soft glow halo
      this.graphics.fillStyle(type.color, 0.28);
      this.graphics.fillCircle(item.x, y, 20);

      if (item.type === 'coin') {
        this.drawCoin(item.x, y);
      } else if (item.type === 'diamond') {
        this.drawDiamond(item.x, y);
      } else {
        this.drawFuelCan(item.x, y);
      }
    }
  }

  // Icon painters delegate to the shared module painters (P7E-7):
  // collectibles and HUD icons stay visually identical from one code path.
  drawCoin(x, y) {
    paintCoinIcon(this.graphics, x, y, 1);
  }

  drawDiamond(x, y) {
    paintDiamondIcon(this.graphics, x, y, 1);
  }

  drawFuelCan(x, y) {
    paintFuelCanIcon(this.graphics, x, y, 1);
  }

  // Remove collected items and return rewards
  collectItems(items) {
    const rewards = { coins: 0, diamonds: 0, fuel: 0 };

    for (const item of items) {
      if (item.type === 'coin') rewards.coins += this.types.coin.value;
      else if (item.type === 'diamond') rewards.diamonds += this.types.diamond.value;
      else if (item.type === 'fuel') rewards.fuel += this.types.fuel.value;
    }

    return rewards;
  }

  // Cleanup items behind camera (P7B: also caps the cursor so re-entering
  // scrolled-back terrain cannot respawn behind items that were cleaned up -
  // the cursor never moves backwards, mirroring one-way terrain generation).
  cleanup(cameraX) {
    const removeBefore = cameraX - 500;
    this.items = this.items.filter(item => item.x > removeBefore);
    if (typeof this.nextSpawnX === 'number' && this.nextSpawnX < removeBefore) {
      this.nextSpawnX = removeBefore;
    }
  }

  // Destroy
  destroy() {
    this.graphics.destroy();
  }
}

export default Collectibles;
