// ============================================
// Nepali Racer - Kathmandu-Nijgadh Fast Track Environment Renderer
// Visual Overhaul for Authentic 2D Expressway Experience
// ============================================

// Linear interpolation between two 0xRRGGBB colors (used by P0-3 blending)
function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export class EnvironmentRenderer {
  constructor(scene, terrain, stage) {
    this.scene = scene;
    this.terrain = terrain;
    this.stage = stage;
    this.isFastTrack = stage.id === 'ktm_nijgadh_fast_track' || stage.environment === 'fast_track';

    // Layered Graphics for smooth depth & parallax rendering
    this.skyGraphics = scene.add.graphics().setDepth(-40);
    this.farHimalayaGraphics = scene.add.graphics().setDepth(-30);
    this.midHillGraphics = scene.add.graphics().setDepth(-20);
    this.nearTreeGraphics = scene.add.graphics().setDepth(-10);
    // P1: road-marking repaint layer. Depth 0 = same depth as the terrain
    // Graphics, but created AFTER it, so it draws on top of the terrain's
    // yellow centerline. Because EnvironmentRenderer is constructed BEFORE
    // the Vehicle in GameScene.create(), this layer still renders BEHIND the
    // player car and never covers the vehicle. Purely visual.
    this.overRoadGraphics = scene.add.graphics().setDepth(0);
    this.structGraphics = scene.add.graphics().setDepth(2);
    this.fgGraphics = scene.add.graphics().setDepth(12);

    // Dynamic Text Pool for Gantry Boards & Milestones (Depth 5)
    this.textPool = [];
    this.activeTexts = [];

    // ---- P0 Step 4: derive Fast Track section boundaries from the resolved
    // StagePlan (this.terrain.stagePlan) instead of duplicating them here. ----
    // bridge / tunnel / terai / finish map to section *roles*; each has a
    // fallback equal to the original constant so legacy/non-section stages
    // (and future section-less Fast Track stages) render unchanged.
    const sections = (this.terrain?.stagePlan?.terrain?.sections) ?? [];
    const sectionByRole = (role) => sections.find((section) => section.role === role);

    const bridgeSection = sectionByRole('bridge');
    this.bridgeStart = bridgeSection?.start ?? 900;
    this.bridgeEnd = bridgeSection?.end ?? 1150;

    const tunnelSection = sectionByRole('tunnel');
    this.tunnelStart = tunnelSection?.start ?? 1300;
    this.tunnelEnd = tunnelSection?.end ?? 1600;

    const teraiSection = sectionByRole('terai');
    this.teraiStart = teraiSection?.start ?? 2050;

    // Keep the existing finish visual placement (a lead-in before the stage end).
    const FINISH_LEAD = 50;
    const finishSection = sectionByRole('finish');
    this.finishX = finishSection ? finishSection.end - FINISH_LEAD : 2450;

    // Terai blend band is centered on the Terai section start (± 100) so the
    // KTM Fast Track keeps its 1950-2150 band while remaining derived.
    const TERAI_BLEND_OFFSET = 100;
    this.teraiBlendStart = this.teraiStart - TERAI_BLEND_OFFSET;
    this.teraiBlendEnd = this.teraiStart + TERAI_BLEND_OFFSET;

    // The following are DECORATIVE placement offsets, NOT copies of section
    // boundaries, so they intentionally stay as fixed landmark coordinates:
    //   hill-cut 350-850, Khokana gantry 200, Fast Track board 860,
    //   hill-cut signs 420/700, Makwanpur board 560.
    this.hillCutStart = 350;
    this.hillCutEnd = 850;
  }

  // Update loop called from GameScene
  update(cameraX, cameraY) {
    if (!this.isFastTrack) return;
    this.recycleTexts();
    this.renderParallaxLayers(cameraX, cameraY);
    this.renderRoadInfrastructure(cameraX);
  }

  recycleTexts() {
    for (const t of this.activeTexts) {
      t.setVisible(false);
      this.textPool.push(t);
    }
    this.activeTexts = [];
  }

  getText(x, y, text, style) {
    let tObj = this.textPool.pop();
    if (!tObj) {
      tObj = this.scene.add.text(x, y, text, style).setDepth(5).setOrigin(0.5);
    } else {
      tObj.setPosition(x, y);
      tObj.setText(text);
      tObj.setStyle(style);
      tObj.setVisible(true);
    }
    this.activeTexts.push(tObj);
    return tObj;
  }

  // 1. Multi-Layer Parallax Background
  renderParallaxLayers(cameraX, cameraY) {
    this.skyGraphics.clear();
    this.farHimalayaGraphics.clear();
    this.midHillGraphics.clear();
    this.nearTreeGraphics.clear();

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    // A. Sky Gradient Transition (Khokana foothill blue -> Mahabharat -> Terai golden horizon)
    // P0-3: smooth ~200px transition band centered on the Terai section start
    // (derived from the resolved StagePlan in the constructor).
    const TERAI_BLEND_START = this.teraiBlendStart;
    const TERAI_BLEND_END = this.teraiBlendEnd;
    const teraiT = Phaser.Math.Clamp(
      (cameraX - TERAI_BLEND_START) / (TERAI_BLEND_END - TERAI_BLEND_START), 0, 1
    );
    const hillW = 1 - teraiT; // 1 = full mountains, 0 = full Terai
    const skyTop = 0x5b9bd5;
    const earlyBottom = 0xa9cce3;
    const midBottom = 0xd4efdf;
    const teraiBottom = 0xfadbd8;
    const bottomFirst = lerpColor(earlyBottom, midBottom, Phaser.Math.Clamp(teraiT / 0.5, 0, 1));
    const bottomSecond = lerpColor(midBottom, teraiBottom, Phaser.Math.Clamp((teraiT - 0.5) / 0.5, 0, 1));
    const skyBottom = teraiT < 0.5 ? bottomFirst : bottomSecond;

    this.skyGraphics.fillStyle(skyTop, 1);
    this.skyGraphics.fillRect(0, 0, w, h * 0.6);
    this.skyGraphics.fillStyle(skyBottom, 1);
    this.skyGraphics.fillRect(0, h * 0.6, w, h * 0.4);
    this.skyGraphics.setScrollFactor(0);

    // B. Far Snow-Capped Himalayas (Parallax factor 0.04) - Organic Multi-Peak Ranges
    // P0-3: the whole massif fades out smoothly across the Terai transition band
    const himalayaOffset = (cameraX * 0.04) % 1200;
    this.farHimalayaGraphics.setScrollFactor(0, 0);
    const himalayaAlpha = hillW; // 1 in the hills, smoothly 0 in the Terai

    if (himalayaAlpha > 0.01) {
    for (let loop = -1; loop <= 1; loop++) {
      const baseX = loop * 1200 - himalayaOffset;
      
      // Main Himalayan Massif Base (softened + lowered: no more giant peaks)
      // A gentle layered rolling ridge, well below mid-screen, so it stays far
      // away and no longer dominates the gameplay.
      const hmCrestMax = h * 0.50;   // highest crest sits low on screen
      const hmBase = h * 0.68;       // ridge baseline (soft horizon)
      const ridgeCurve = (f) => hmBase - (hmBase - hmCrestMax) * (1 - f);
      this.farHimalayaGraphics.fillStyle(0xcfe3f0, 0.40 * himalayaAlpha);
      this.farHimalayaGraphics.beginPath();
      this.farHimalayaGraphics.moveTo(baseX - 140, h * 0.78);
      this.farHimalayaGraphics.lineTo(baseX - 40, ridgeCurve(0.80));
      this.farHimalayaGraphics.lineTo(baseX + 80, ridgeCurve(0.38));
      this.farHimalayaGraphics.lineTo(baseX + 180, ridgeCurve(0.72));
      this.farHimalayaGraphics.lineTo(baseX + 290, ridgeCurve(0.26));
      this.farHimalayaGraphics.lineTo(baseX + 380, ridgeCurve(0.76));
      this.farHimalayaGraphics.lineTo(baseX + 480, ridgeCurve(0.42));
      this.farHimalayaGraphics.lineTo(baseX + 580, ridgeCurve(0.80));
      this.farHimalayaGraphics.lineTo(baseX + 690, ridgeCurve(0.22));
      this.farHimalayaGraphics.lineTo(baseX + 790, ridgeCurve(0.70));
      this.farHimalayaGraphics.lineTo(baseX + 880, ridgeCurve(0.50));
      this.farHimalayaGraphics.lineTo(baseX + 980, ridgeCurve(0.78));
      this.farHimalayaGraphics.lineTo(baseX + 1080, ridgeCurve(0.58));
      this.farHimalayaGraphics.lineTo(baseX + 1240, h * 0.78);
      this.farHimalayaGraphics.closePath();
      this.farHimalayaGraphics.fillPath();

      // Small, subtle snow caps on only the highest crests (kept tiny + faint)
      this.farHimalayaGraphics.fillStyle(0xffffff, 0.75 * himalayaAlpha);
      this.farHimalayaGraphics.fillCircle(baseX + 692, ridgeCurve(0.22) - 5, 6);
      this.farHimalayaGraphics.fillCircle(baseX + 672, ridgeCurve(0.22) - 11, 4);
      this.farHimalayaGraphics.fillCircle(baseX + 292, ridgeCurve(0.26) - 5, 5);
      this.farHimalayaGraphics.fillCircle(baseX + 482, ridgeCurve(0.42) - 4, 4);
    }
    }

    // Subtle sky clouds + soft atmospheric haze above the distant range
    // (drawn on the far parallax layer so they sit behind hills/road).
    if (himalayaAlpha > 0.01) {
      // A few wide, faint cumulus wisps slow-drifting across the high sky
      const cloudOff = (cameraX * 0.02) % 900;
      this.farHimalayaGraphics.fillStyle(0xffffff, 0.14);
      for (let c = -1; c <= 1; c++) {
        const cx = c * 900 - cloudOff;
        this.farHimalayaGraphics.fillEllipse(cx, h * 0.14, 150, 12);
        this.farHimalayaGraphics.fillEllipse(cx + 110, h * 0.10, 110, 9);
      }
      // Soft haze veil just above the ridgeline softens the silhouette edge
      this.farHimalayaGraphics.fillStyle(0xcfe3f0, 0.10);
      this.farHimalayaGraphics.fillRect(0, h * 0.50, w, h * 0.18);
    }

    // C. Mahabharat Range / Mid Hills (Parallax factor 0.14) - Layered Green Ridges
    // P0-3: ridge heights and colors blend over the transition band:
    // Makwanpur hills sink, a low Chure/Bhabar ridge rolls in, Terai greens take over
    const midOffset = (cameraX * 0.14) % 900;
    const hillColor = lerpColor(0x1e8449, 0x27ae60, teraiT);
    const hillShadow = lerpColor(0x145a32, 0x1e8449, teraiT);

    // Ridge silhouette heights: firmly BELOW the distant Himalaya and reading
    // as rolling, stepped greenery (Makwanpur/Chure) rather than towering peaks.
    const backCrest = [
      Phaser.Math.Interpolation.Linear([h * 0.74, h * 0.80], teraiT),
      Phaser.Math.Interpolation.Linear([h * 0.78, h * 0.84], teraiT),
      Phaser.Math.Interpolation.Linear([h * 0.76, h * 0.82], teraiT),
      Phaser.Math.Interpolation.Linear([h * 0.80, h * 0.86], teraiT)
    ];
    const frontCrest = [
      Phaser.Math.Interpolation.Linear([h * 0.78, h * 0.82], teraiT),
      Phaser.Math.Interpolation.Linear([h * 0.82, h * 0.86], teraiT),
      Phaser.Math.Interpolation.Linear([h * 0.80, h * 0.84], teraiT),
      Phaser.Math.Interpolation.Linear([h * 0.84, h * 0.88], teraiT)
    ];
    const backBase = Phaser.Math.Interpolation.Linear([h * 0.90, h * 0.93], teraiT);
    const frontBase = Phaser.Math.Interpolation.Linear([h * 0.95, h * 0.97], teraiT);

    this.midHillGraphics.setScrollFactor(0, 0);
    for (let loop = -1; loop <= 1; loop++) {
      const baseX = loop * 900 - midOffset;

      // Layer 1 Back Hills (medium contrast, muted green - behind the road)
      this.midHillGraphics.fillStyle(hillShadow, 0.6);
      this.midHillGraphics.beginPath();
      this.midHillGraphics.moveTo(baseX - 60, backBase);
      this.midHillGraphics.lineTo(baseX + 160, backCrest[0]);
      this.midHillGraphics.lineTo(baseX + 320, backCrest[1]);
      this.midHillGraphics.lineTo(baseX + 480, backCrest[2]);
      this.midHillGraphics.lineTo(baseX + 640, backCrest[3]);
      this.midHillGraphics.lineTo(baseX + 820, backCrest[1]);
      this.midHillGraphics.lineTo(baseX + 990, backCrest[0]);
      this.midHillGraphics.lineTo(baseX + 1100, backBase);
      this.midHillGraphics.closePath();
      this.midHillGraphics.fillPath();

      // Layer 2 Front Hills (nearer, darker, stepped ridge)
      this.midHillGraphics.fillStyle(hillColor, 0.75);
      this.midHillGraphics.beginPath();
      this.midHillGraphics.moveTo(baseX + 60, frontBase);
      this.midHillGraphics.lineTo(baseX + 200, frontCrest[0]);
      this.midHillGraphics.lineTo(baseX + 360, frontCrest[1]);
      this.midHillGraphics.lineTo(baseX + 520, frontCrest[2]);
      this.midHillGraphics.lineTo(baseX + 700, frontCrest[3]);
      this.midHillGraphics.lineTo(baseX + 880, frontCrest[1]);
      this.midHillGraphics.lineTo(baseX + 1050, frontCrest[0]);
      this.midHillGraphics.closePath();
      this.midHillGraphics.fillPath();

      // Forest texture: small tree silhouettes scattered along the mid slopes
      this.midHillGraphics.fillStyle(0x1f452b, 0.7);
      for (let tx = baseX + 90; tx < baseX + 1060; tx += 46) {
        const rnd = Math.abs(Math.sin(tx * 12.9898));
        const ty = h * (0.82 + 0.06 * rnd);
        this.midHillGraphics.fillTriangle(tx - 4, ty, tx + 1, ty - 11, tx + 6, ty);
        this.midHillGraphics.fillCircle(tx + 1, ty - 8, 3.5);
      }
    }

    // Chure / Bhabar ridge: dusty low foothill band that rolls in ahead of the
    // flat Terai plains (the last uplift before the Gangetic plain)
    const chureAlpha = Phaser.Math.Clamp((teraiT - 0.15) / 0.5, 0, 1);
    if (chureAlpha > 0.02) {
      const chureOffset = (cameraX * 0.20) % 1100;
      this.midHillGraphics.fillStyle(0x8a7d57, 0.6 * chureAlpha);
      for (let loop = -1; loop <= 1; loop++) {
        const baseX = loop * 1100 - chureOffset;
        this.midHillGraphics.beginPath();
        this.midHillGraphics.moveTo(baseX, h * 0.84);
        this.midHillGraphics.lineTo(baseX + 160, h * 0.76);
        this.midHillGraphics.lineTo(baseX + 340, h * 0.80);
        this.midHillGraphics.lineTo(baseX + 560, h * 0.74);
        this.midHillGraphics.lineTo(baseX + 780, h * 0.79);
        this.midHillGraphics.lineTo(baseX + 980, h * 0.77);
        this.midHillGraphics.lineTo(baseX + 1150, h * 0.84);
        this.midHillGraphics.closePath();
        this.midHillGraphics.fillPath();
        // Faint forest speckle on the Chure crest
        this.midHillGraphics.fillStyle(0x4d6b3c, 0.5 * chureAlpha);
        for (let sx = baseX + 60; sx < baseX + 1100; sx += 90) {
          this.midHillGraphics.fillCircle(sx, h * 0.80, 4);
        }
      }
    }

    // Warm dust/vivid-haze wash that settles in over the Terai (behind the road,
    // in front of the hills) for a drier, dustier late-stage atmosphere.
    if (teraiT > 0.04) {
      this.midHillGraphics.fillStyle(0xd8b278, 0.12 * teraiT);
      this.midHillGraphics.fillRect(0, h * 0.60, w, h * 0.26);
    }

    // D. Near Scenery / Vegetation (Parallax factor 0.38)
    // P0-3: per-item blend. Each tree slot picks foothill pine vs sal forest
    // vs subtropical broadleaf by x-position with a deterministic crossfade
    const nearOffset = (cameraX * 0.38) % 500;
    this.nearTreeGraphics.setScrollFactor(0, 0);

    for (let x = -200; x < w + 300; x += 92) {
      const px = x - nearOffset;
      const py = h * 0.80;
      // Stable pseudo-random per screen slot: keeps each tree's silhouette
      // fixed while scrolling and seamless when the parallax offset wraps
      const slotRand = Math.abs(Math.sin(x * 12.9898) % 1);

      // World-space X of this slot: crossfade zone at cameraX 1950-2150
      const screenWorldX = cameraX + px;
      const blendT = Phaser.Math.Clamp((screenWorldX - TERAI_BLEND_START) / (TERAI_BLEND_END - TERAI_BLEND_START), 0, 1);

      if (cameraX >= this.bridgeStart && cameraX <= this.bridgeEnd) {
        // Deep River Valley haze circles below bridge level only (kept subtle)
        this.nearTreeGraphics.fillStyle(0x117864, 0.25);
        this.nearTreeGraphics.fillCircle(px, py + 20, 22);
      } else if (blendT >= 1) {
        // Full Terai: small subtropical palms, mustard fields
        const hgt = 18 + slotRand * 10;
        // Grounding base shadow so the palm sits on the field line (not floating)
        this.nearTreeGraphics.fillStyle(0x1a3d24, 0.45);
        this.nearTreeGraphics.fillEllipse(px, py + 4, 13, 4);
        this.nearTreeGraphics.fillStyle(0x145a32, 0.7);
        this.nearTreeGraphics.fillRect(px - 1.5, py - hgt, 3, hgt);
        this.nearTreeGraphics.fillStyle(0x1e8449, 0.7);
        this.nearTreeGraphics.fillCircle(px, py - hgt - 3, 8);
        this.nearTreeGraphics.fillCircle(px - 6, py - hgt + 1, 6);
        this.nearTreeGraphics.fillCircle(px + 6, py - hgt + 1, 6);
        // Mustard Yellow Field Accents
        this.nearTreeGraphics.fillStyle(0xf4d03f, 0.3);
        this.nearTreeGraphics.fillEllipse(px, py + 8, 44, 7);
      } else if (blendT > 0) {
        // Transition band: small sal/deciduous silhouettes
        this.nearTreeGraphics.fillStyle(0x1a3d24, 0.45);
        this.nearTreeGraphics.fillEllipse(px, py + 4, 13, 4);
        if (slotRand < 0.5) {
          this.nearTreeGraphics.fillStyle(0x1a3d24, 0.7);
          this.nearTreeGraphics.fillRect(px - 2, py - 22, 4, 22);
          this.nearTreeGraphics.fillStyle(0x236b40, 0.7);
          this.nearTreeGraphics.fillEllipse(px, py - 26, 16, 12);
        } else {
          this.nearTreeGraphics.fillStyle(0x1a3d24, 0.7);
          this.nearTreeGraphics.fillRect(px - 1.5, py - 26, 3, 26);
          this.nearTreeGraphics.fillStyle(0x236b40, 0.7);
          this.nearTreeGraphics.fillCircle(px, py - 28, 9);
        }
      } else {
        // Full hills: small foothill pines (occasionally sal, deterministic)
        this.nearTreeGraphics.fillStyle(0x1a3d24, 0.45);
        this.nearTreeGraphics.fillEllipse(px, py + 4, 13, 4);
        if (slotRand < 0.3) {
          this.nearTreeGraphics.fillStyle(0x16372a, 0.75);
          this.nearTreeGraphics.fillRect(px - 2, py - 20, 4, 20);
          this.nearTreeGraphics.fillStyle(0x1f5233, 0.7);
          this.nearTreeGraphics.fillEllipse(px, py - 24, 15, 11);
        } else {
          this.nearTreeGraphics.fillStyle(0x123f33, 0.7);
          this.nearTreeGraphics.fillTriangle(px - 8, py, px, py - 22, px + 8, py);
          this.nearTreeGraphics.fillStyle(0x0e352a, 0.7);
          this.nearTreeGraphics.fillTriangle(px - 5, py - 10, px, py - 30, px + 5, py - 10);
          this.nearTreeGraphics.fillStyle(0x5d4037, 0.8);
          this.nearTreeGraphics.fillRect(px - 1.5, py, 3, 8);
        }
      }
    }
  }

  // 2. Road Infrastructure & Landmark Sections
  renderRoadInfrastructure(cameraX) {
    this.overRoadGraphics.clear();
    this.structGraphics.clear();
    this.fgGraphics.clear();

    const viewLeft = cameraX - 300;
    const viewRight = cameraX + this.scene.scale.width + 400;

    this.drawExpresswaySurface(viewLeft, viewRight);
    this.drawKathmanduStart(viewLeft, viewRight);
    this.drawFastTrackIdentitySigns(viewLeft, viewRight);
    this.drawHighwayGuardrailsAndPosts(viewLeft, viewRight);
    this.drawHillCutAndRetainingWalls(viewLeft, viewRight);
    this.drawConcreteViaductBridge(viewLeft, viewRight);
    this.drawHighwayTunnel(viewLeft, viewRight);
    this.drawNijgadhFinish(viewLeft, viewRight);
  }

  // G. P1: 4-LANE EXPRESSWAY SURFACE IDENTITY (visual-only repaint)
  // Drawn on overRoadGraphics (depth 0, created after Terrain but before the
  // Vehicle) so it covers the terrain's legacy yellow centerline yet always
  // renders BEHIND the player car. No physics, no collision, no terrain change.
  drawExpresswaySurface(viewLeft, viewRight) {
    const segments = this.terrain.getSegments();
    if (!segments) return;

    const g = this.overRoadGraphics;
    const now = this.scene.time.now / 1000;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.endX < viewLeft || seg.startX > viewRight) continue;

      const x1 = seg.startX, y1 = seg.startY;
      const x2 = seg.endX, y2 = seg.endY;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const ux = Math.cos(Math.atan2(y2 - y1, x2 - x1));
      const uy = Math.sin(Math.atan2(y2 - y1, x2 - x1));
      const inTunnel = seg.startX >= this.tunnelStart && seg.endX <= this.tunnelEnd;

      // 1. Cover the legacy US-style double-yellow centerline with asphalt
      g.lineStyle(7, 0x1a252f, 1);
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.strokePath();

      // Helper for a screen-vertical offset line following the segment slope
      const slopeY = (y2 - y1) / (x2 - x1);
      const lineAt = (off, cx) => y1 + (cx - x1) * slopeY + off;

      // 2. Player carriageway: two same-direction lanes.
      // A wide slate "passing lane / verge" apron above the asphalt visually
      // widens the near carriageway into TWO lanes (dark asphalt driving lane +
      // lighter parallel passing lane) and also masks the legacy Terrain median
      // + top edge markings that were previously drawn at old offsets.
      g.fillStyle(0x2f4554, 1);
      g.beginPath();
      g.moveTo(x1, lineAt(-8, x1));
      g.lineTo(x2, lineAt(-8, x2));
      g.lineTo(x2, lineAt(-50, x2));
      g.lineTo(x1, lineAt(-50, x1));
      g.closePath();
      g.fillPath();
      // Subtle seam where the verge meets the asphalt
      g.lineStyle(1.4, 0x101820, 0.5);
      g.beginPath();
      g.moveTo(x1, lineAt(-9, x1));
      g.lineTo(x2, lineAt(-9, x2));
      g.strokePath();
      // Far edge of the passing lane (thin + faint -> perspective depth)
      g.lineStyle(1.8, 0x9aa7b0, 0.55);
      g.beginPath();
      g.moveTo(x1, lineAt(-49, x1));
      g.lineTo(x2, lineAt(-49, x2));
      g.strokePath();
      // Reflector studs along the passing-lane edge every 60m
      for (let sx = Math.ceil(x1 / 60) * 60; sx < x2; sx += 60) {
        if (sx < viewLeft || sx > viewRight) continue;
        g.fillStyle(0xfffde7, 0.7);
        g.fillCircle(sx, lineAt(-49, sx), 1.2);
      }

      // Prominent, continuous dashed white lane divider between the two player
      // lanes (consistent 18px dash / 12px gap spacing)
      g.lineStyle(3, 0xffffff, 0.93);
      for (let dx = x1; dx + 18 <= x2; dx += 30) {
        g.beginPath();
        g.moveTo(dx, lineAt(-12, dx));
        g.lineTo(dx + 18, lineAt(-12, dx + 18));
        g.strokePath();
      }

      // 3. Wider, more substantial stepped concrete Jersey median, raised
      // ABOVE the vehicle so it always reads as a physical divider between the
      // near player carriageway and the far opposing carriageway.
      g.lineStyle(10, 0x1f2d3d, 0.9);   // deep shadow under the base
      g.beginPath();
      g.moveTo(x1, lineAt(-53, x1));
      g.lineTo(x2, lineAt(-53, x2));
      g.strokePath();
      const medianSteps = [
        { off: -57, w: 9, c: 0xb2babb },    // base step
        { off: -62, w: 6, c: 0xd5dbdb },    // mid step
        { off: -66, w: 3.5, c: 0xecf0f1 }   // top cap
      ];
      for (const s of medianSteps) {
        g.lineStyle(s.w, s.c, 1);
        g.beginPath();
        g.moveTo(x1, lineAt(s.off, x1));
        g.lineTo(x2, lineAt(s.off, x2));
        g.strokePath();
      }
      // Alternating concrete panel seams across the barrier face
      for (let sx = Math.ceil(x1 / 60) * 60; sx < x2; sx += 60) {
        if (sx < viewLeft - 60 || sx > viewRight + 60) continue;
        const seamY = this.terrain.getTerrainYAt(sx);
        g.lineStyle(1, 0x7f8c8d, 0.8);
        g.beginPath();
        g.moveTo(sx, seamY - 57);
        g.lineTo(sx, seamY - 66);
        g.strokePath();
      }
      // Small amber reflectors on the median cap
      if (Math.floor(x1 / 120) % 2 === 0) {
        g.fillStyle(0xf4d03f, 0.95);
        g.fillCircle(midX, lineAt(-66, midX), 1.8);
      }

      // 4. Opposite carriageway: TWO visible opposing lanes, darker asphalt +
      // lower-contrast markings so it stays behind the player carriageway.
      g.fillStyle(0x141c24, 1);
      g.beginPath();
      g.moveTo(x1, lineAt(-69, x1));
      g.lineTo(x2, lineAt(-69, x2));
      g.lineTo(x2, lineAt(-90, x2));
      g.lineTo(x1, lineAt(-90, x1));
      g.closePath();
      g.fillPath();
      // Near + far edge lines (subtle, faint white)
      g.lineStyle(1.6, 0x8f9ca6, 0.5);
      g.beginPath();
      g.moveTo(x1, lineAt(-70, x1));
      g.lineTo(x2, lineAt(-70, x2));
      g.strokePath();
      g.lineStyle(1.4, 0x8f9ca6, 0.45);
      g.beginPath();
      g.moveTo(x1, lineAt(-89, x1));
      g.lineTo(x2, lineAt(-89, x2));
      g.strokePath();
      // Dashed divider between the two opposing lanes (phase-shifted from player)
      g.lineStyle(2, 0xffffff, 0.6);
      for (let dx = x1 + 14; dx + 14 <= x2; dx += 28) {
        g.beginPath();
        g.moveTo(dx, lineAt(-80, dx));
        g.lineTo(dx + 14, lineAt(-80, dx + 14));
        g.strokePath();
      }

      // 5. Player near-lane reflector studs along the asphalt (consistent
      // spacing linking with the dashed divider above)
      if (i % 2 === 0) {
        g.fillStyle(0xfffde7, 0.9);
        g.fillCircle(midX, lineAt(-5, midX), 1.5);
      } else {
        g.fillStyle(0xfffde7, 0.5);
        g.fillCircle(midX, lineAt(-5, midX), 1.2);
      }

      // Sparse directional lane arrow on the lower lane (every 400m)
      if (seg.startX >= 500 && seg.startX % 400 === 100) {
        g.lineStyle(2.5, 0xffffff, 0.9);
        g.beginPath();
        g.moveTo(midX - 9 * ux, midY - 9 * uy + 5);
        g.lineTo(midX + 5 * ux, midY + 5 * uy + 5);
        g.strokePath();
        g.fillStyle(0xffffff, 0.9);
        g.beginPath();
        g.moveTo(midX + 11 * ux, midY + 11 * uy + 5);
        g.lineTo(midX + 3 * ux, midY + 3 * uy + 1);
        g.lineTo(midX + 3 * ux, midY + 3 * uy + 9);
        g.closePath();
        g.fillPath();
      }

      // Pavement expansion seams (every 200m)
      if (seg.startX >= 600 && seg.startX % 200 === 0) {
        g.lineStyle(1.2, 0x0e161e, 0.5);
        g.beginPath();
        g.moveTo(seg.startX, seg.startY - 8);
        g.lineTo(seg.startX, seg.startY + 13);
        g.strokePath();
      }

      // Subtle tarmac repair patch (surface texture variety)
      if (i % 5 === 2 && !inTunnel) {
        g.lineStyle(14, 0x223140, 0.16);
        g.beginPath();
        g.moveTo(midX - 22 * ux, midY - 22 * uy);
        g.lineTo(midX + 22 * ux, midY + 22 * uy);
        g.strokePath();
      }
    }

    // 5. Sparse oncoming traffic silhouettes on the far carriageway
    // (pure background decoration, no physics, no interaction)
    const LOOP = 2100;
    for (let v = 0; v < 3; v++) {
      let vx = 260 + v * 700 - ((now * 48) % LOOP);
      while (vx < 60) vx += LOOP;
      if (vx < viewLeft - 40 || vx > viewRight + 40) continue;
      // Keep the tunnel interior and the hill-cut wall zone clean
      if (vx >= this.tunnelStart - 30 && vx <= this.tunnelEnd + 30) continue;
      if (vx >= this.hillCutStart - 40 && vx <= this.hillCutEnd + 40) continue;

      const vy = this.terrain.getTerrainYAt(vx) - 76;
      if (v % 2 === 0) {
        // Small distant truck silhouette (travelling toward Kathmandu)
        g.fillStyle(0x39434e, 0.92);
        g.fillRect(vx - 14, vy - 6, 7, 6);   // cab (front-left)
        g.fillRect(vx - 7, vy - 9, 20, 9);   // cargo box
        g.fillStyle(0x1a222b, 0.95);
        g.fillRect(vx - 10, vy, 4, 3);
        g.fillRect(vx + 6, vy, 4, 3);
        g.fillStyle(0xfff3c4, 0.95);
        g.fillCircle(vx - 14, vy - 3, 1.4);  // headlight
        g.fillStyle(0xc0392b, 0.8);
        g.fillRect(vx + 12.5, vy - 7, 1.5, 3); // taillight
      } else {
        // Small distant car silhouette
        g.fillStyle(0x414c58, 0.92);
        g.fillRect(vx - 10, vy - 6, 20, 6);
        g.fillRect(vx - 6, vy - 10, 11, 5);
        g.fillStyle(0x1a222b, 0.95);
        g.fillRect(vx - 7, vy, 4, 3);
        g.fillRect(vx + 4, vy, 4, 3);
        g.fillStyle(0xfff3c4, 0.95);
        g.fillCircle(vx - 10, vy - 3, 1.3);  // headlight
        g.fillStyle(0xc0392b, 0.8);
        g.fillRect(vx + 9, vy - 6, 1.5, 3);  // taillight
      }
    }
  }

  // G2. P1: FAST TRACK identity signage (roadside board before the viaduct)
  drawFastTrackIdentitySigns(viewLeft, viewRight) {
    const sbX = 860;
    if (sbX < viewLeft || sbX > viewRight) return;
    const sy = this.terrain.getTerrainYAt(sbX);

    // Twin steel sign posts
    this.structGraphics.fillStyle(0x566573, 1);
    this.structGraphics.fillRect(sbX - 32, sy - 62, 3, 62);
    this.structGraphics.fillRect(sbX + 29, sy - 62, 3, 62);

    // Green expressway board with white border
    this.structGraphics.fillStyle(0x1e8449, 1);
    this.structGraphics.fillRect(sbX - 58, sy - 98, 116, 38);
    this.structGraphics.lineStyle(2, 0xffffff, 1);
    this.structGraphics.strokeRect(sbX - 56, sy - 96, 112, 34);

    this.getText(sbX, sy - 88, 'FAST TRACK', {
      fontSize: '12px', fontStyle: 'bold', color: '#ffffff', fontFamily: 'monospace'
    });
    this.getText(sbX, sy - 71, 'KHOKANA \u2794 NIJGADH', {
      fontSize: '7px', fontStyle: 'bold', color: '#d5f5e3', fontFamily: 'monospace'
    });
  }

  // A. KHOKANA / KATHMANDU STARTING SECTION (0m - 250m)
  drawKathmanduStart(viewLeft, viewRight) {
    const startX = 200;
    if (startX >= viewLeft && startX <= viewRight) {
      const gy = this.terrain.getTerrainYAt(startX);

      // Lattice Steel Overhead Highway Gantry Structure
      // (posts extended to carry the P1 expressway identity header stack)
      this.structGraphics.fillStyle(0x566573, 1);
      this.structGraphics.fillRect(startX - 90, gy - 180, 8, 180);
      this.structGraphics.fillRect(startX + 90, gy - 180, 8, 180);
      this.structGraphics.fillRect(startX - 94, gy - 110, 196, 12);
      // Lattice Crosshatch Lines
      this.structGraphics.lineStyle(1.5, 0xbdc3c7, 0.8);
      for (let lx = startX - 90; lx <= startX + 80; lx += 20) {
        this.structGraphics.beginPath();
        this.structGraphics.moveTo(lx, gy - 110);
        this.structGraphics.lineTo(lx + 15, gy - 98);
        this.structGraphics.strokePath();
      }

      // Green Signboard ("KHOKANA ➔ NIJGADH")
      this.structGraphics.fillStyle(0x1e8449, 1);
      this.structGraphics.fillRect(startX - 95, gy - 142, 190, 30);
      this.structGraphics.lineStyle(2, 0xffffff, 1);
      this.structGraphics.strokeRect(startX - 93, gy - 140, 186, 26);

      // Crisp signboard text & subtitle
      this.getText(startX, gy - 128, 'KHOKANA ➔ NIJGADH', {
        fontSize: '13px', fontStyle: 'bold', color: '#ffffff', fontFamily: 'monospace'
      });

      // P1: Expressway identity header (blue motorway board above the
      // destination sign) + Nepal flag pennants on the gantry beam
      this.structGraphics.fillStyle(0x1a5276, 1);
      this.structGraphics.fillRect(startX - 108, gy - 178, 216, 26);
      this.structGraphics.lineStyle(2, 0xffffff, 1);
      this.structGraphics.strokeRect(startX - 106, gy - 176, 212, 22);
      this.getText(startX, gy - 165, 'KATHMANDU – NIJGADH FAST TRACK', {
        fontSize: '11px', fontStyle: 'bold', color: '#ffffff', fontFamily: 'monospace'
      });
      // Small Nepal-flag pennants on the main gantry posts
      this.structGraphics.fillStyle(0xcd2a3e, 1);
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(startX - 94, gy - 98);
      this.structGraphics.lineTo(startX - 78, gy - 93);
      this.structGraphics.lineTo(startX - 94, gy - 88);
      this.structGraphics.closePath();
      this.structGraphics.fillPath();
      this.structGraphics.fillStyle(0xcd2a3e, 1);
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(startX + 94, gy - 98);
      this.structGraphics.lineTo(startX + 78, gy - 93);
      this.structGraphics.lineTo(startX + 94, gy - 88);
      this.structGraphics.closePath();
      this.structGraphics.fillPath();

      // Milestone Post at Start
      const msX = 100;
      if (msX >= viewLeft && msX <= viewRight) {
        const msY = this.terrain.getTerrainYAt(msX);
        this.structGraphics.fillStyle(0xf4f6f7, 1);
        this.structGraphics.fillRoundedRect(msX - 10, msY - 26, 20, 26, 4);
        this.structGraphics.fillStyle(0x27ae60, 1);
        this.structGraphics.fillRoundedRect(msX - 10, msY - 26, 20, 9, 4);
        this.getText(msX, msY - 12, 'START', {
          fontSize: '8px', fontStyle: 'bold', color: '#2c3e50', fontFamily: 'monospace'
        });
      }
    }
  }

  // B. CONTINUOUS HIGHWAY GUARDRAILS, REFLECTOR POSTS & GAME KM MARKERS
  drawHighwayGuardrailsAndPosts(viewLeft, viewRight) {
    const segments = this.terrain.getSegments();
    if (!segments) return;

    // Continuous W-Beam Steel Guardrail (Height: 11px above road).
    // The rail is now drawn on EVERY segment so it reads as one unbroken line
    // (the previous i+=2 loop left a 100px gap between every other segment).
    this.structGraphics.lineStyle(3, 0xd5dbdb, 0.95);
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.startX < viewLeft || seg.endX > viewRight) continue;

      // Skip inside tunnel interior (the tunnel liner/portal replace the rail,
      // and the rail already terminates cleanly at each portal mouth).
      if (seg.startX >= this.tunnelStart && seg.endX <= this.tunnelEnd) continue;

      // P1: rail raised to the far boundary of the expressway (above the
      // opposite carriageway) so it no longer cuts across the Jersey median
      const y1 = seg.startY - 92;
      const y2 = seg.endY - 92;

      // Guardrail Beam
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(seg.startX, y1);
      this.structGraphics.lineTo(seg.endX, y2);
      this.structGraphics.strokePath();

      // Vertical Support Steel Post (one per segment => consistent ~100px spacing)
      this.structGraphics.lineStyle(1.8, 0x7f8c8d, 1);
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(seg.startX, y1);
      this.structGraphics.lineTo(seg.startX, y1 + 7);
      this.structGraphics.strokePath();
      this.structGraphics.lineStyle(3, 0xd5dbdb, 0.95);

      // Reflector / Delineator Post (dedicated, evenly every 3rd segment ~300px,
      // aligned to the rail so nothing floats above or below it)
      if (i % 3 === 0) {
        this.structGraphics.fillStyle(0xffffff, 1);
        this.structGraphics.fillRect(seg.startX - 1.5, y1 - 9, 3, 9);
        this.structGraphics.fillStyle(0xf4d03f, 1);
        this.structGraphics.fillRect(seg.startX - 1.5, y1 - 9, 3, 3);
      }
    }

    // In-game Progression Distance Milestones every 500m ("KM 0.5", "KM 1.0", "KM 1.5", "KM 2.0")
    for (let kmVal = 0.5; kmVal <= 2.0; kmVal += 0.5) {
      const mX = kmVal * 1000;
      if (mX >= viewLeft && mX <= viewRight) {
        const mY = this.terrain.getTerrainYAt(mX);
        this.structGraphics.fillStyle(0xf4f6f7, 1);
        this.structGraphics.fillRoundedRect(mX - 12, mY - 26, 24, 26, 4);
        this.structGraphics.fillStyle(0x1e8449, 1);
        this.structGraphics.fillRoundedRect(mX - 12, mY - 26, 24, 9, 4);
        this.getText(mX, mY - 10, `KM ${kmVal.toFixed(1)}`, {
          fontSize: '8px', fontStyle: 'bold', color: '#2c3e50', fontFamily: 'monospace'
        });
      }
    }
  }

  // C. P0-4: ENGINEERED HILL-CUT SECTION & CONCRETE/GABION RETAINING WALLS (350m - 850m)
  drawHillCutAndRetainingWalls(viewLeft, viewRight) {
    if (this.hillCutEnd < viewLeft || this.hillCutStart > viewRight) return;

    const segments = this.terrain.getSegments();
    if (!segments) return;

    for (const seg of segments) {
      if (seg.startX >= this.hillCutStart && seg.endX <= this.hillCutEnd) {
        if (seg.startX < viewLeft || seg.endX > viewRight) continue;

        const y1 = seg.startY;
        const y2 = seg.endY;

        // 1. Excavated Mountain Rock Face behind retaining wall (Layered Rock Strata)
        this.nearTreeGraphics.fillStyle(0x5d4037, 0.85);
        this.nearTreeGraphics.beginPath();
        this.nearTreeGraphics.moveTo(seg.startX, y1 - 44);
        this.nearTreeGraphics.lineTo(seg.endX, y2 - 44);
        this.nearTreeGraphics.lineTo(seg.endX, y2 - 125);
        this.nearTreeGraphics.lineTo(seg.startX, y1 - 125);
        this.nearTreeGraphics.closePath();
        this.nearTreeGraphics.fillPath();

        // Geological Rock Strata & Ledge Lines
        this.nearTreeGraphics.lineStyle(1.5, 0x7a6b5c, 0.7);
        this.nearTreeGraphics.beginPath();
        this.nearTreeGraphics.moveTo(seg.startX, y1 - 70);
        this.nearTreeGraphics.lineTo(seg.endX, y2 - 85);
        this.nearTreeGraphics.moveTo(seg.startX, y1 - 100);
        this.nearTreeGraphics.lineTo(seg.endX, y2 - 110);
        this.nearTreeGraphics.strokePath();

        // Shotcrete & Rockfall Protection Netting Crosshatch Wire Grid
        this.nearTreeGraphics.lineStyle(1, 0x95a5a6, 0.35);
        for (let gx = seg.startX; gx < seg.endX; gx += 20) {
          this.nearTreeGraphics.beginPath();
          this.nearTreeGraphics.moveTo(gx, y1 - 44);
          this.nearTreeGraphics.lineTo(gx + 20, y1 - 125);
          this.nearTreeGraphics.strokePath();
        }

        // 2. Stepped Concrete Gabion Retaining Wall Base (38px wall)
        this.structGraphics.fillStyle(0x95a5a6, 1);
        this.structGraphics.beginPath();
        this.structGraphics.moveTo(seg.startX, y1 - 10);
        this.structGraphics.lineTo(seg.endX, y2 - 10);
        this.structGraphics.lineTo(seg.endX, y2 - 46);
        this.structGraphics.lineTo(seg.startX, y1 - 46);
        this.structGraphics.closePath();
        this.structGraphics.fillPath();

        // Gabion Box Wire Mesh Grid & Mortar Joints
        this.structGraphics.lineStyle(1.2, 0x566573, 0.75);
        this.structGraphics.beginPath();
        this.structGraphics.moveTo(seg.startX, y1 - 28);
        this.structGraphics.lineTo(seg.endX, y2 - 28);
        this.structGraphics.strokePath();

        // Drainage Weep-Holes along wall base
        for (let wx = seg.startX + 25; wx < seg.endX; wx += 45) {
          this.structGraphics.fillStyle(0x2c3e50, 1);
          this.structGraphics.fillCircle(wx, y1 - 18, 2.5);
        }

        // Concrete Wall Top Cap
        this.structGraphics.fillStyle(0xbdc3c7, 1);
        this.structGraphics.fillRect(seg.startX, y1 - 48, seg.endX - seg.startX, 4);
      }
    }

    // Hill Cut Roadside Warning Sign 1 ("SLOW - HILL CUT")
    const signX1 = 420;
    if (signX1 >= viewLeft && signX1 <= viewRight) {
      const sy = this.terrain.getTerrainYAt(signX1);
      this.structGraphics.fillStyle(0x7f8c8d, 1);
      this.structGraphics.fillRect(signX1 - 2, sy - 45, 4, 45);
      this.structGraphics.fillStyle(0xf4d03f, 1);
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(signX1, sy - 68);
      this.structGraphics.lineTo(signX1 + 18, sy - 45);
      this.structGraphics.lineTo(signX1, sy - 22);
      this.structGraphics.lineTo(signX1 - 18, sy - 45);
      this.structGraphics.closePath();
      this.structGraphics.fillPath();
      this.getText(signX1, sy - 45, 'CUT', {
        fontSize: '9px', fontStyle: 'bold', color: '#1a252f', fontFamily: 'monospace'
      });
    }

    // Hill Cut Roadside Warning Sign 2 ("ROCKFALL ZONE")
    const signX2 = 700;
    if (signX2 >= viewLeft && signX2 <= viewRight) {
      const sy = this.terrain.getTerrainYAt(signX2);
      this.structGraphics.fillStyle(0x7f8c8d, 1);
      this.structGraphics.fillRect(signX2 - 2, sy - 45, 4, 45);
      this.structGraphics.fillStyle(0xf4d03f, 1);
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(signX2, sy - 68);
      this.structGraphics.lineTo(signX2 + 18, sy - 45);
      this.structGraphics.lineTo(signX2, sy - 22);
      this.structGraphics.lineTo(signX2 - 18, sy - 45);
      this.structGraphics.closePath();
      this.structGraphics.fillPath();
      this.getText(signX2, sy - 45, 'ROCK', {
        fontSize: '9px', fontStyle: 'bold', color: '#1a252f', fontFamily: 'monospace'
      });
    }

    // Makwanpur district identity board (one tasteful green expressway sign)
    const mpx = 560;
    if (mpx >= viewLeft && mpx <= viewRight) {
      const my = this.terrain.getTerrainYAt(mpx);
      // Sign post standing just off the roadway
      this.structGraphics.fillStyle(0x7f8c8d, 1);
      this.structGraphics.fillRect(mpx - 2, my - 58, 4, 58);
      // Green district board with white band
      this.structGraphics.fillStyle(0x27ae60, 1);
      this.structGraphics.fillRoundedRect(mpx - 34, my - 80, 68, 26, 3);
      this.structGraphics.fillStyle(0xf4f6f7, 1);
      this.structGraphics.fillRect(mpx - 34, my - 66, 68, 3);
      this.structGraphics.lineStyle(1.5, 0xffffff, 0.9);
      this.structGraphics.strokeRoundedRect(mpx - 32, my - 78, 64, 22, 3);
      this.getText(mpx, my - 72, 'MAKWANPUR', {
        fontSize: '9px', fontStyle: 'bold', color: '#ffffff', fontFamily: 'monospace'
      });
      this.getText(mpx, my - 60, 'FAST TRACK', {
        fontSize: '6px', fontStyle: 'bold', color: '#2c3e50', fontFamily: 'monospace'
      });
    }
  }

  // D. P0-1: CONCRETE BOX GIRDER MEGA-VIADUCT BRIDGE (900m - 1150m)
  // Visual-only deep valley: everything is kept inside the 720px viewport
  // (valley floor ~y=700). No camera or collision changes.
  drawConcreteViaductBridge(viewLeft, viewRight) {
    if (this.bridgeEnd < viewLeft || this.bridgeStart > viewRight) return;

    const segments = this.terrain.getSegments();
    if (!segments) return;

    const screenH = this.scene.scale.height; // 720
    const valleyFloorY = screenH - 25;       // ~y695: visible valley floor line
    const riverY = screenH - 15;             // ~y705: river band inside valley

    // 0. Distant mountain layers seen THROUGH the valley (behind the piers,
    //    in front of the far background, above the valley floor)
    // Far ridge pair (blue-grey, hazy)
    this.structGraphics.fillStyle(0x85a3c2, 0.45);
    this.structGraphics.beginPath();
    this.structGraphics.moveTo(Math.max(viewLeft, this.bridgeStart - 60), valleyFloorY - 190);
    this.structGraphics.lineTo(this.bridgeStart + 60, valleyFloorY - 90);
    this.structGraphics.lineTo(this.bridgeStart + 180, valleyFloorY - 160);
    this.structGraphics.lineTo(this.bridgeStart + 330, valleyFloorY - 70);
    this.structGraphics.lineTo(this.bridgeStart + 460, valleyFloorY - 150);
    this.structGraphics.lineTo(this.bridgeStart + 620, valleyFloorY - 80);
    this.structGraphics.lineTo(this.bridgeStart + 780, valleyFloorY - 170);
    this.structGraphics.lineTo(this.bridgeStart + 930, valleyFloorY - 85);
    this.structGraphics.lineTo(Math.min(viewRight, this.bridgeEnd + 60), valleyFloorY - 190);
    this.structGraphics.lineTo(Math.min(viewRight, this.bridgeEnd + 60), valleyFloorY);
    this.structGraphics.lineTo(Math.max(viewLeft, this.bridgeStart - 60), valleyFloorY);
    this.structGraphics.closePath();
    this.structGraphics.fillPath();

    // Near ridge pair (greener, less haze)
    this.structGraphics.fillStyle(0x5e7d8c, 0.55);
    this.structGraphics.beginPath();
    this.structGraphics.moveTo(Math.max(viewLeft, this.bridgeStart - 60), valleyFloorY - 120);
    this.structGraphics.lineTo(this.bridgeStart + 110, valleyFloorY - 55);
    this.structGraphics.lineTo(this.bridgeStart + 260, valleyFloorY - 105);
    this.structGraphics.lineTo(this.bridgeStart + 420, valleyFloorY - 45);
    this.structGraphics.lineTo(this.bridgeStart + 580, valleyFloorY - 110);
    this.structGraphics.lineTo(this.bridgeStart + 740, valleyFloorY - 50);
    this.structGraphics.lineTo(this.bridgeStart + 890, valleyFloorY - 95);
    this.structGraphics.lineTo(Math.min(viewRight, this.bridgeEnd + 60), valleyFloorY - 55);
    this.structGraphics.lineTo(Math.min(viewRight, this.bridgeEnd + 60), valleyFloorY);
    this.structGraphics.lineTo(Math.max(viewLeft, this.bridgeStart - 60), valleyFloorY);
    this.structGraphics.closePath();
    this.structGraphics.fillPath();

    // 1. Deep valley cross-section: dark valley walls sloping down to the river,
    //    only under the deck span so abutments still sit on solid ground.
    this.structGraphics.fillStyle(0x1e3a2a, 1);
    this.structGraphics.beginPath();
    this.structGraphics.moveTo(this.bridgeStart - 40, this.terrain.getTerrainYAt(this.bridgeStart - 40));
    this.structGraphics.lineTo(this.bridgeStart, this.terrain.getTerrainYAt(this.bridgeStart));
    // Stepped dark slope on the Khokana side
    this.structGraphics.lineTo(this.bridgeStart + 40, valleyFloorY - 95);
    this.structGraphics.lineTo(this.bridgeStart + 90, valleyFloorY);
    // Valley floor to the far abutment
    this.structGraphics.lineTo(this.bridgeEnd - 90, valleyFloorY);
    this.structGraphics.lineTo(this.bridgeEnd - 40, valleyFloorY - 95);
    this.structGraphics.lineTo(this.bridgeEnd, this.terrain.getTerrainYAt(this.bridgeEnd));
    this.structGraphics.lineTo(this.bridgeEnd + 40, this.terrain.getTerrainYAt(this.bridgeEnd + 40));
    this.structGraphics.lineTo(this.bridgeEnd + 40, screenH + 20);
    this.structGraphics.lineTo(this.bridgeStart - 40, screenH + 20);
    this.structGraphics.closePath();
    this.structGraphics.fillPath();

    // Green forested valley walls texture (stripes above the river line)
    this.structGraphics.lineStyle(2, 0x274e2e, 0.8);
    for (let wx = this.bridgeStart - 30; wx < this.bridgeEnd + 30; wx += 34) {
      const wallTop = this.terrain.getTerrainYAt(wx);
      const wallBottom = wx < this.bridgeStart + 90 || wx > this.bridgeEnd - 90 ? valleyFloorY - 30 : valleyFloorY - 55;
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(wx, Math.max(wallTop + 6, valleyFloorY - 150));
      this.structGraphics.lineTo(wx + 6, wallBottom);
      this.structGraphics.strokePath();
    }

    // 2. River / stream band along the visible valley floor
    this.structGraphics.fillStyle(0x2980b9, 1);
    this.structGraphics.fillRect(this.bridgeStart - 30, riverY, (this.bridgeEnd - this.bridgeStart) + 60, 12);
    this.structGraphics.fillStyle(0x7fb3d5, 0.7);
    this.structGraphics.fillRect(this.bridgeStart - 10, riverY + 3, (this.bridgeEnd - this.bridgeStart) + 20, 4);
    // Mid-channel sand bars
    this.structGraphics.fillStyle(0xd5c49a, 0.9);
    this.structGraphics.fillRect(this.bridgeStart + 130, riverY + 4, 34, 5);
    this.structGraphics.fillRect(this.bridgeStart + 460, riverY + 3, 26, 6);

    // 3. Trees far below bridge level, on the valley slopes
    for (let vx = this.bridgeStart + 20; vx < this.bridgeEnd - 20; vx += 46) {
      if (vx < viewLeft || vx > viewRight) continue;
      const vy = vx < (this.bridgeStart + this.bridgeEnd) / 2 ? valleyFloorY - 12 : valleyFloorY - 18;
      this.nearTreeGraphics.fillStyle(0x14532d, 0.95);
      this.nearTreeGraphics.fillTriangle(vx - 7, vy, vx, vy - 16, vx + 7, vy);
      this.nearTreeGraphics.fillStyle(0x166534, 0.9);
      this.nearTreeGraphics.fillTriangle(vx - 5, vy + 2, vx, vy - 9, vx + 5, vy + 2);
    }

    // 4. Evenly spaced hammerhead piers standing on the visible valley floor
    // 4 piers distributed symmetrically across the 250m span (every 50px)
    const pierCount = 4;
    const pierStep = (this.bridgeEnd - this.bridgeStart) / (pierCount + 1);
    for (let i = 1; i <= pierCount; i++) {
      const px = Math.round(this.bridgeStart + i * pierStep);
      if (px < viewLeft - 30 || px > viewRight + 30) continue;
      const py = this.terrain.getTerrainYAt(px); // deck surface Y at pier X

      // Pier shaft from deck underside down to the visible valley floor
      const shaftTop = py + 24;
      const shaftBottom = valleyFloorY + 4;
      this.structGraphics.fillStyle(0x7f8c8d, 1);
      this.structGraphics.fillRect(px - 11, shaftTop, 22, shaftBottom - shaftTop);
      // Left highlight + right shade for cylinder feel
      this.structGraphics.fillStyle(0xbdc3c7, 0.6);
      this.structGraphics.fillRect(px - 11, shaftTop, 4, shaftBottom - shaftTop);
      this.structGraphics.fillStyle(0x566573, 0.55);
      this.structGraphics.fillRect(px + 7, shaftTop, 4, shaftBottom - shaftTop);

      // Flared hammerhead pier cap (clearly visible, wider than the shaft)
      this.structGraphics.fillStyle(0x95a5a6, 1);
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(px - 23, shaftTop);
      this.structGraphics.lineTo(px + 23, shaftTop);
      this.structGraphics.lineTo(px + 13, shaftTop + 14);
      this.structGraphics.lineTo(px - 13, shaftTop + 14);
      this.structGraphics.closePath();
      this.structGraphics.fillPath();
      this.structGraphics.lineStyle(1.5, 0x566573, 0.8);
      this.structGraphics.strokePath();

      // Rubber bearings under the deck (on top of the cap, under the deck slab)
      this.structGraphics.fillStyle(0x1a252f, 1);
      this.structGraphics.fillRect(px - 13, py + 24, 9, 4);
      this.structGraphics.fillRect(px + 4, py + 24, 9, 4);

      // Pier footing on the valley floor
      this.structGraphics.fillStyle(0x616e7c, 1);
      this.structGraphics.fillRect(px - 16, valleyFloorY - 2, 32, 8);
    }

    // 5. Concrete Box-Girder Deck Slab beneath road surface (visual only)
    this.structGraphics.fillStyle(0x2c3e50, 1);
    for (const seg of segments) {
      if (seg.startX >= this.bridgeStart && seg.endX <= this.bridgeEnd) {
        if (seg.startX < viewLeft || seg.endX > viewRight) continue;

        const y1 = seg.startY;
        const y2 = seg.endY;

        this.structGraphics.beginPath();
        this.structGraphics.moveTo(seg.startX, y1);
        this.structGraphics.lineTo(seg.endX, y2);
        this.structGraphics.lineTo(seg.endX, y2 + 24);
        this.structGraphics.lineTo(seg.startX, y1 + 24);
        this.structGraphics.closePath();
        this.structGraphics.fillPath();

        // Parapet Concrete Barrier Wall
        this.structGraphics.fillStyle(0xbdc3c7, 0.95);
        this.structGraphics.fillRect(seg.startX, y1 - 18, seg.endX - seg.startX, 7);

        // Anti-Glare Vertical Fence Slats along Bridge Parapet
        this.structGraphics.lineStyle(1.5, 0x7f8c8d, 0.8);
        for (let fx = seg.startX; fx < seg.endX; fx += 15) {
          this.structGraphics.beginPath();
          this.structGraphics.moveTo(fx, y1 - 18);
          this.structGraphics.lineTo(fx, y1 - 25);
          this.structGraphics.strokePath();
        }
      }
    }

    // 6. Expansion joints across the deck (every other pier position)
    for (let i = 1; i <= pierCount; i += 2) {
      const jx = Math.round(this.bridgeStart + i * pierStep);
      if (jx < viewLeft || jx > viewRight) continue;
      const jy = this.terrain.getTerrainYAt(jx);
      this.structGraphics.fillStyle(0x0f1922, 1);
      this.structGraphics.fillRect(jx - 2, jy - 26, 4, 26);
    }

    // 7. "TRISHULI RIVER BRIDGE" identity board on the near parapet
    const boardX = this.bridgeStart + 40;
    if (boardX >= viewLeft && boardX <= viewRight) {
      const by = this.terrain.getTerrainYAt(boardX);
      this.structGraphics.fillStyle(0x1a5276, 1);
      this.structGraphics.fillRect(boardX - 52, by - 44, 104, 18);
      this.structGraphics.lineStyle(1.5, 0xd5dbdb, 0.9);
      this.structGraphics.strokeRect(boardX - 52, by - 44, 104, 18);
      this.getText(boardX, by - 35, 'TRISHULI RIVER VIADUCT', {
        fontSize: '9px', fontStyle: 'bold', color: '#eaf2f8', fontFamily: 'monospace'
      });
    }
  }

  // E. P0-2: MODERN HIGHWAY TWIN-TUBE TUNNEL (1300m - 1600m)
  // Readability rules: overlay alpha 0.5, bottom edge at terrainY - 40 so the
  // vehicle (depth 5) and road markings stay clearly visible. Gradients fade
  // the darkness in/out instead of hard rectangle transitions.
  drawHighwayTunnel(viewLeft, viewRight) {
    if (this.tunnelEnd < viewLeft || this.tunnelStart > viewRight) return;

    const OVERLAY_ALPHA = 0.5;
    const OVERLAY_BOTTOM = 40;   // overlay stops 40px above the road line
    const OVERLAY_TOP = 115;     // tunnel crown height above the road line
    const PORTAL_FADE = 110;     // px of gradient fade inside each portal

    // 1. Entrance Twin-Tube Concrete Portal Arch (1300m)
    if (this.tunnelStart >= viewLeft - 100 && this.tunnelStart <= viewRight) {
      const ey = this.terrain.getTerrainYAt(this.tunnelStart);

      // Secondary Tube Silhouette Portal (Adjacent Lane Background)
      this.structGraphics.fillStyle(0x7f8c8d, 0.85);
      this.structGraphics.fillRect(this.tunnelStart - 65, ey - 105, 38, 105);
      this.structGraphics.fillStyle(0x15202b, 0.9);
      this.structGraphics.fillCircle(this.tunnelStart - 46, ey - 50, 36);

      // Main Active Driving Tube Reinforced Concrete Arch
      this.structGraphics.fillStyle(0x95a5a6, 1);
      this.structGraphics.fillRect(this.tunnelStart - 25, ey - 125, 50, 125);
      // Dark Horseshoe Mouth
      this.structGraphics.fillStyle(0x1a252f, 1);
      this.structGraphics.fillCircle(this.tunnelStart, ey - 55, 48);

      // Portal Wingwalls (Connecting Concrete Face) - both sides
      this.structGraphics.fillStyle(0xbdc3c7, 1);
      this.structGraphics.fillRect(this.tunnelStart - 75, ey - 125, 12, 125);
      this.structGraphics.fillRect(this.tunnelStart + 25, ey - 108, 10, 108);

      // Illuminated Tunnel Header Signboard ("FAST TRACK TUNNEL")
      this.structGraphics.fillStyle(0x2c3e50, 1);
      this.structGraphics.fillRect(this.tunnelStart - 75, ey - 115, 150, 20);
      this.structGraphics.fillStyle(0xf4d03f, 1);
      this.structGraphics.fillRect(this.tunnelStart - 72, ey - 113, 144, 2);
      this.getText(this.tunnelStart, ey - 103, 'FAST TRACK TUNNEL', {
        fontSize: '10px', fontStyle: 'bold', color: '#f4d03f', fontFamily: 'monospace'
      });

      // Overhead Lane Control Signal Lamps (Green Arrow over active, Red X over secondary)
      this.structGraphics.fillStyle(0x27ae60, 1);
      this.structGraphics.fillCircle(this.tunnelStart, ey - 88, 4); // Green Arrow Active
      this.structGraphics.fillStyle(0xc0392b, 1);
      this.structGraphics.fillCircle(this.tunnelStart - 46, ey - 88, 4); // Red X Secondary
    }

    // 2. Tunnel Interior: ceiling overlay with SOFT portal fades, wall lining,
    //    jet fans and warm ceiling lights
    const segments = this.terrain.getSegments();
    if (segments) {
      for (const seg of segments) {
        if (seg.endX < this.tunnelStart || seg.startX > this.tunnelEnd) continue;

        const y1 = seg.startY;
        const y2 = seg.endY;

        // Per-segment average alpha with ~110px gradient fade at both portals
        const midX = (seg.startX + seg.endX) / 2;
        const distIn = midX - this.tunnelStart;                 // 0..300 from entrance
        const distOut = this.tunnelEnd - midX;                  // 0..300 to exit
        const fade = Math.min(
          Phaser.Math.Clamp(distIn / PORTAL_FADE, 0, 1),
          Phaser.Math.Clamp(distOut / PORTAL_FADE, 0, 1)
        );
        const alpha = OVERLAY_ALPHA * fade;
        if (alpha <= 0.01) continue;

        // Ceiling/roof overlay polygon (stops 40px above the road so the
        // vehicle body, wheels and all road markings stay fully visible)
        this.fgGraphics.fillStyle(0x15202b, alpha);
        this.fgGraphics.beginPath();
        this.fgGraphics.moveTo(seg.startX, y1 - OVERLAY_TOP);
        this.fgGraphics.lineTo(seg.endX, y2 - OVERLAY_TOP);
        this.fgGraphics.lineTo(seg.endX, y2 - OVERLAY_BOTTOM);
        this.fgGraphics.lineTo(seg.startX, y1 - OVERLAY_BOTTOM);
        this.fgGraphics.closePath();
        this.fgGraphics.fillPath();

        // Tunnel crown line + side wall lining strips (drawn only when dark
        // enough to be visible, i.e. inside the fade zone)
        if (fade > 0.25) {
          this.fgGraphics.lineStyle(2, 0x3a4a58, Math.min(0.9, fade * 1.2));
          this.fgGraphics.beginPath();
          this.fgGraphics.moveTo(seg.startX, y1 - OVERLAY_TOP);
          this.fgGraphics.lineTo(seg.endX, y2 - OVERLAY_TOP);
          this.fgGraphics.strokePath();

          // Reflective wall lining band (light strip along the tunnel wall)
          this.fgGraphics.lineStyle(2, 0xdadfe6, Math.min(0.35, fade * 0.7));
          this.fgGraphics.beginPath();
          this.fgGraphics.moveTo(seg.startX, y1 - OVERLAY_BOTTOM + 4);
          this.fgGraphics.lineTo(seg.endX, y2 - OVERLAY_BOTTOM + 4);
          this.fgGraphics.strokePath();

          // Segment panel joints (vertical wall lining seams)
          this.fgGraphics.lineStyle(1, 0x3a4a58, Math.min(0.4, fade));
          this.fgGraphics.beginPath();
          this.fgGraphics.moveTo(seg.startX, y1 - OVERLAY_TOP);
          this.fgGraphics.lineTo(seg.startX, y1 - OVERLAY_BOTTOM);
          this.fgGraphics.strokePath();
        }

        // Ceiling Ventilation Jet-Fan Cylinders every ~100m
        if (Math.floor(seg.startX / 100) % 2 === 0) {
          this.fgGraphics.fillStyle(0x7f8c8d, Math.min(1, fade * 2));
          this.fgGraphics.fillRect(seg.startX - 10, seg.startY - 112, 20, 8);
          this.fgGraphics.fillStyle(0x566573, Math.min(1, fade * 2));
          this.fgGraphics.fillCircle(seg.startX - 8, seg.startY - 108, 3);
        }

        // Continuous warm Ceiling Fixtures + Light Cones every ~100m
        if (Math.floor(seg.startX / 100) % 2 === 1) {
          this.fgGraphics.fillStyle(0xf4d03f, Math.min(1, fade * 2));
          this.fgGraphics.fillCircle(seg.startX, seg.startY - 108, 4);
          // Angled warm light cone down toward the road (kept above vehicle)
          this.fgGraphics.fillStyle(0xfef9e7, Math.min(0.22, 0.22 * fade));
          this.fgGraphics.beginPath();
          this.fgGraphics.moveTo(seg.startX - 4, seg.startY - 104);
          this.fgGraphics.lineTo(seg.startX + 4, seg.startY - 104);
          this.fgGraphics.lineTo(seg.startX + 26, seg.startY - OVERLAY_BOTTOM + 2);
          this.fgGraphics.lineTo(seg.startX - 26, seg.startY - OVERLAY_BOTTOM + 2);
          this.fgGraphics.closePath();
          this.fgGraphics.fillPath();
        }
      }

      // Green emergency exit light + niche every ~150m inside the tunnel
      for (let ex = this.tunnelStart + 75; ex < this.tunnelEnd; ex += 150) {
        if (ex < viewLeft || ex > viewRight) continue;
        const exY = this.terrain.getTerrainYAt(ex);
        const fade = Math.min(
          Phaser.Math.Clamp((ex - this.tunnelStart) / PORTAL_FADE, 0, 1),
          Phaser.Math.Clamp((this.tunnelEnd - ex) / PORTAL_FADE, 0, 1)
        );
        if (fade <= 0.2) continue;
        this.fgGraphics.fillStyle(0x145a32, Math.min(1, fade * 2));
        this.fgGraphics.fillRect(ex - 8, exY - 78, 16, 10);
        this.fgGraphics.fillStyle(0x2ecc71, Math.min(1, fade * 2));
        this.fgGraphics.fillCircle(ex, exY - 73, 3);
      }
    }

    // 3. Entrance approach gradient (gradual darkening before the portal,
    //    ~150px band ending right at the portal face)
    if (this.tunnelStart >= viewLeft - 200 && this.tunnelStart <= viewRight) {
      const ey = this.terrain.getTerrainYAt(this.tunnelStart);
      const bandW = 25;
      this.fgGraphics.fillStyle(0x0d1319, 0.06);
      for (let step = 0; step < 6; step++) {
        const bx = this.tunnelStart - (step + 1) * bandW;
        this.fgGraphics.fillRect(bx, ey - OVERLAY_TOP, bandW, OVERLAY_TOP - OVERLAY_BOTTOM + 10);
      }
      // Thin shade above the portal face
      this.fgGraphics.fillStyle(0x0d1319, 0.28);
      this.fgGraphics.fillRect(this.tunnelStart - bandW, ey - OVERLAY_TOP, bandW, OVERLAY_TOP - OVERLAY_BOTTOM + 10);
    }

    // 4. Exit Twin-Tube Horseshoe Portal Arch (1600m) - mirrored twin-tube
    //    structure with wing walls and a strong but controlled daylight wash
    if (this.tunnelEnd >= viewLeft && this.tunnelEnd <= viewRight + 100) {
      const exY = this.terrain.getTerrainYAt(this.tunnelEnd);

      // Secondary Tube Silhouette Portal (mirrored to the LEFT of main tube,
      // consistent with the entrance's second tube)
      this.structGraphics.fillStyle(0x7f8c8d, 0.85);
      this.structGraphics.fillRect(this.tunnelEnd + 27, exY - 105, 38, 105);
      this.structGraphics.fillStyle(0x2b3a47, 0.95);
      this.structGraphics.fillCircle(this.tunnelEnd + 46, exY - 50, 36);

      // Main Active Driving Tube Reinforced Concrete Arch
      this.structGraphics.fillStyle(0x95a5a6, 1);
      this.structGraphics.fillRect(this.tunnelEnd - 25, exY - 125, 50, 125);
      // Bright Daylight Opening (horseshoe, not a flat disc)
      this.structGraphics.fillStyle(0xeaecee, 1);
      this.structGraphics.fillCircle(this.tunnelEnd, exY - 55, 48);
      this.structGraphics.fillStyle(0xfdfefe, 0.85);
      this.structGraphics.fillCircle(this.tunnelEnd, exY - 55, 30);

      // Portal Wingwalls (both sides, mirrored to the entrance)
      this.structGraphics.fillStyle(0xbdc3c7, 1);
      this.structGraphics.fillRect(this.tunnelEnd + 63, exY - 125, 12, 125);
      this.structGraphics.fillRect(this.tunnelEnd - 35, exY - 108, 10, 108);

      // Illuminated Tunnel Header Signboard (exit side)
      this.structGraphics.fillStyle(0x2c3e50, 1);
      this.structGraphics.fillRect(this.tunnelEnd - 75, exY - 115, 150, 20);
      this.structGraphics.fillStyle(0xf4d03f, 1);
      this.structGraphics.fillRect(this.tunnelEnd - 72, exY - 113, 144, 2);
      this.getText(this.tunnelEnd, exY - 103, 'FAST TRACK TUNNEL', {
        fontSize: '10px', fontStyle: 'bold', color: '#f4d03f', fontFamily: 'monospace'
      });

      // Overhead Lane Control Signal Lamps (exit side, mirrored)
      this.structGraphics.fillStyle(0x27ae60, 1);
      this.structGraphics.fillCircle(this.tunnelEnd, exY - 88, 4);
      this.structGraphics.fillStyle(0xc0392b, 1);
      this.structGraphics.fillCircle(this.tunnelEnd + 46, exY - 88, 4);

      // Strong but controlled daylight wash spilling onto the road after exit
      this.fgGraphics.fillStyle(0xfdfefe, 0.12);
      this.fgGraphics.fillRect(this.tunnelEnd, exY - OVERLAY_TOP, 90, OVERLAY_TOP - OVERLAY_BOTTOM + 10);
      this.fgGraphics.fillStyle(0xfdfefe, 0.07);
      this.fgGraphics.fillRect(this.tunnelEnd + 90, exY - OVERLAY_TOP, 70, OVERLAY_TOP - OVERLAY_BOTTOM + 10);
    }
  }

  // F. NIJGADH / TERAI FINISH SECTION (2350m - 2500m)
  drawNijgadhFinish(viewLeft, viewRight) {
    if (this.finishX >= viewLeft && this.finishX <= viewRight) {
      const gy = this.terrain.getTerrainYAt(this.finishX);

      // Finish Overhead Highway Gantry Structure
      this.structGraphics.fillStyle(0x566573, 1);
      this.structGraphics.fillRect(this.finishX - 90, gy - 110, 8, 110);
      this.structGraphics.fillRect(this.finishX + 90, gy - 110, 8, 110);
      this.structGraphics.fillRect(this.finishX - 94, gy - 110, 196, 10);

      // Destination Signboard ("NIJGADH / BARA ➔ END")
      this.structGraphics.fillStyle(0x1e8449, 1);
      this.structGraphics.fillRect(this.finishX - 95, gy - 140, 190, 28);
      this.structGraphics.lineStyle(2, 0xffffff, 1);
      this.structGraphics.strokeRect(this.finishX - 93, gy - 138, 186, 24);

      this.getText(this.finishX, gy - 126, 'NIJGADH / BARA ➔ END', {
        fontSize: '13px', fontStyle: 'bold', color: '#ffffff', fontFamily: 'monospace'
      });

      // Milestone Post at Finish
      const msX = this.finishX - 35;
      this.structGraphics.fillStyle(0xf4f6f7, 1);
      this.structGraphics.fillRoundedRect(msX - 10, gy - 24, 20, 24, 4);
      this.structGraphics.fillStyle(0x27ae60, 1);
      this.structGraphics.fillRoundedRect(msX - 10, gy - 24, 20, 9, 4);
      this.getText(msX, gy - 10, 'FINISH', {
        fontSize: '8px', fontStyle: 'bold', color: '#2c3e50', fontFamily: 'monospace'
      });
    }
  }

  destroy() {
    this.skyGraphics.destroy();
    this.farHimalayaGraphics.destroy();
    this.midHillGraphics.destroy();
    this.nearTreeGraphics.destroy();
    this.overRoadGraphics.destroy();
    this.structGraphics.destroy();
    this.fgGraphics.destroy();
    for (const t of this.textPool) t.destroy();
    for (const t of this.activeTexts) t.destroy();
    this.textPool = [];
    this.activeTexts = [];
  }
}

export default EnvironmentRenderer;
