// ============================================
// Nepali Racer - Environment & Section Renderer
// ============================================

export class EnvironmentRenderer {
  constructor(scene, terrain, stage) {
    this.scene = scene;
    this.terrain = terrain;
    this.stage = stage;
    this.isFastTrack = stage.id === 'ktm_nijgadh_fast_track' || stage.environment === 'fast_track';

    // Graphics layers for performant rendering
    this.bgGraphics = scene.add.graphics().setDepth(-20);
    this.mgGraphics = scene.add.graphics().setDepth(-10);
    this.structGraphics = scene.add.graphics().setDepth(2);
    this.fgGraphics = scene.add.graphics().setDepth(12);

    // Pre-calculate section boundaries for Kathmandu–Nijgadh Fast Track (3600m target)
    this.sections = [
      { name: 'ktm_gateway', start: 0, end: 350 },
      { name: 'expressway', start: 350, end: 750 },
      { name: 'hill_climb', start: 750, end: 1250 },
      { name: 'downhill', start: 1250, end: 1650 },
      { name: 'bridge', start: 1650, end: 2050 },
      { name: 'tunnel', start: 2050, end: 2500 },
      { name: 'valley_forest', start: 2500, end: 3000 },
      { name: 'terai', start: 3000, end: 3450 },
      { name: 'nijgadh_finish', start: 3450, end: 3800 }
    ];
  }

  // Called in GameScene update loop
  update(cameraX, cameraY) {
    this.renderParallaxBackground(cameraX, cameraY);
    this.renderSectionFeatures(cameraX);
  }

  renderParallaxBackground(cameraX, cameraY) {
    this.bgGraphics.clear();
    this.mgGraphics.clear();

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // 1. Far Himalayas (Parallax factor 0.1)
    const himalayaOffsetX = (cameraX * 0.1) % 400;
    this.bgGraphics.fillStyle(0xebf5fb, 0.4); // Snow peaks
    for (let x = -400; x < width + 400; x += 300) {
      const px = x - himalayaOffsetX;
      const py = height * 0.35;
      this.bgGraphics.fillTriangle(px - 150, py + 120, px, py - 90, px + 150, py + 120);
      // Snow caps
      this.bgGraphics.fillStyle(0xffffff, 0.7);
      this.bgGraphics.fillTriangle(px - 40, py - 20, px, py - 90, px + 40, py - 20);
      this.bgGraphics.fillStyle(0xebf5fb, 0.4);
    }

    // 2. Midground Green Foothills (Parallax factor 0.3)
    const hillOffsetX = (cameraX * 0.3) % 350;
    const isTerai = cameraX > 3000;
    const hillColor = isTerai ? 0x27ae60 : 0x1e8449;

    this.mgGraphics.fillStyle(hillColor, 0.6);
    for (let x = -350; x < width + 350; x += 250) {
      const px = x - hillOffsetX;
      const py = height * 0.5;
      const hillH = isTerai ? 40 : 80;
      this.mgGraphics.fillTriangle(px - 140, py + 150, px, py - hillH, px + 140, py + 150);
    }
  }

  renderSectionFeatures(cameraX) {
    this.structGraphics.clear();
    this.fgGraphics.clear();

    const viewLeft = cameraX - 200;
    const viewRight = cameraX + this.scene.scale.width + 300;

    // Draw section landmarks and structures
    this.drawKathmanduGateway(viewLeft, viewRight);
    this.drawExpresswayGuardrails(viewLeft, viewRight);
    this.drawBridgeSection(viewLeft, viewRight);
    this.drawTunnelSection(viewLeft, viewRight);
    this.drawForestAndValley(viewLeft, viewRight);
    this.drawTeraiFields(viewLeft, viewRight);
    this.drawNijgadhFinish(viewLeft, viewRight);
  }

  // Section 1: Kathmandu Gateway & Milestone (0m - 350m)
  drawKathmanduGateway(viewLeft, viewRight) {
    const archX = 250;
    if (archX >= viewLeft && archX <= viewRight) {
      const groundY = this.terrain.getTerrainYAt(archX);
      
      // Welcome Arch Columns
      this.structGraphics.fillStyle(0xb2babb, 1);
      this.structGraphics.fillRect(archX - 60, groundY - 140, 18, 140);
      this.structGraphics.fillRect(archX + 60, groundY - 140, 18, 140);
      
      // Arch Top Beam (Nepali Pagoda / Expressway Style)
      this.structGraphics.fillStyle(0xc0392b, 1);
      this.structGraphics.fillRect(archX - 75, groundY - 160, 168, 22);
      this.structGraphics.fillStyle(0xf1c40f, 1);
      this.structGraphics.fillRect(archX - 70, groundY - 170, 158, 10);
      
      // Milestone
      const msX = 120;
      const msY = this.terrain.getTerrainYAt(msX);
      this.structGraphics.fillStyle(0xf4f6f7, 1);
      this.structGraphics.fillRoundedRect(msX - 10, msY - 25, 20, 25, 4);
      this.structGraphics.fillStyle(0x27ae60, 1);
      this.structGraphics.fillRoundedRect(msX - 10, msY - 25, 20, 10, 4);
    }
  }

  // Section 2 & General: Guardrails along expressway segments
  drawExpresswayGuardrails(viewLeft, viewRight) {
    const segments = this.terrain.getSegments();
    if (!segments) return;

    this.structGraphics.lineStyle(3, 0xd5dbdb, 0.9);
    for (let i = 0; i < segments.length; i += 2) {
      const seg = segments[i];
      if (seg.startX < viewLeft || seg.endX > viewRight) continue;

      // Skip guardrails inside tunnel section
      if (seg.startX >= 2050 && seg.endX <= 2500) continue;

      // Draw metallic guardrail line along roadside
      const y1 = seg.startY - 12;
      const y2 = seg.endY - 12;
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(seg.startX, y1);
      this.structGraphics.lineTo(seg.endX, y2);
      this.structGraphics.strokePath();

      // Guardrail posts
      this.structGraphics.lineStyle(2, 0x7f8c8d, 1);
      this.structGraphics.beginPath();
      this.structGraphics.moveTo(seg.startX, y1);
      this.structGraphics.lineTo(seg.startX, seg.startY);
      this.structGraphics.strokePath();
      this.structGraphics.lineStyle(3, 0xd5dbdb, 0.9);
    }
  }

  // Section 5: Expressway Suspension Bridge (1650m - 2050m)
  drawBridgeSection(viewLeft, viewRight) {
    const bridgeStart = 1650;
    const bridgeEnd = 2050;
    if (bridgeEnd < viewLeft || bridgeStart > viewRight) return;

    // Bridge Pylons & Suspension Steel Cables
    const pylonX1 = 1750;
    const pylonX2 = 1950;

    [pylonX1, pylonX2].forEach(px => {
      if (px >= viewLeft && px <= viewRight) {
        const py = this.terrain.getTerrainYAt(px);
        // Steel Pylon Tower
        this.structGraphics.fillStyle(0x34495e, 1);
        this.structGraphics.fillRect(px - 8, py - 180, 16, 180);
        this.structGraphics.fillStyle(0xe74c3c, 1);
        this.structGraphics.fillRect(px - 10, py - 190, 20, 12);

        // Cable Stay Lines
        this.structGraphics.lineStyle(2, 0xecf0f1, 0.8);
        for (let offset = -100; offset <= 100; offset += 35) {
          if (offset === 0) continue;
          const targetY = this.terrain.getTerrainYAt(px + offset);
          this.structGraphics.beginPath();
          this.structGraphics.moveTo(px, py - 180);
          this.structGraphics.lineTo(px + offset, targetY - 10);
          this.structGraphics.strokePath();
        }
      }
    });
  }

  // Section 6: Tunnel Entrance, Interior & Exit (2050m - 2500m)
  drawTunnelSection(viewLeft, viewRight) {
    const tunnelStart = 2050;
    const tunnelEnd = 2500;
    if (tunnelEnd < viewLeft || tunnelStart > viewRight) return;

    // 1. Entrance Portal Arch
    if (tunnelStart >= viewLeft && tunnelStart <= viewRight) {
      const ey = this.terrain.getTerrainYAt(tunnelStart);
      this.structGraphics.fillStyle(0x7f8c8d, 1);
      this.structGraphics.fillRect(tunnelStart - 25, ey - 140, 50, 140);
      this.structGraphics.fillStyle(0x2c3e50, 1);
      this.structGraphics.fillCircle(tunnelStart, ey - 70, 55);
    }

    // 2. Tunnel Ceiling Roof (Forefront overlay depth 12)
    const segments = this.terrain.getSegments();
    if (segments) {
      this.fgGraphics.fillStyle(0x1a252f, 0.85); // Dark tunnel interior atmosphere
      for (const seg of segments) {
        if (seg.startX >= tunnelStart && seg.endX <= tunnelEnd) {
          if (seg.startX < viewLeft || seg.endX > viewRight) continue;
          this.fgGraphics.beginPath();
          this.fgGraphics.moveTo(seg.startX, seg.startY - 130);
          this.fgGraphics.lineTo(seg.endX, seg.endY - 130);
          this.fgGraphics.lineTo(seg.endX, seg.endY - 20);
          this.fgGraphics.lineTo(seg.startX, seg.startY - 20);
          this.fgGraphics.closePath();
          this.fgGraphics.fillPath();

          // Overhead Sodium Lights
          if (Math.floor(seg.startX / 80) % 2 === 0) {
            this.fgGraphics.fillStyle(0xf1c40f, 1);
            this.fgGraphics.fillCircle(seg.startX, seg.startY - 125, 5);
            this.fgGraphics.fillStyle(0xfff9c4, 0.4);
            this.fgGraphics.fillCircle(seg.startX, seg.startY - 125, 15);
            this.fgGraphics.fillStyle(0x1a252f, 0.85);
          }
        }
      }
    }

    // 3. Exit Portal Arch
    if (tunnelEnd >= viewLeft && tunnelEnd <= viewRight) {
      const exY = this.terrain.getTerrainYAt(tunnelEnd);
      this.structGraphics.fillStyle(0x7f8c8d, 1);
      this.structGraphics.fillRect(tunnelEnd - 25, exY - 140, 50, 140);
      this.structGraphics.fillStyle(0xecf0f1, 0.9);
      this.structGraphics.fillCircle(tunnelEnd, exY - 70, 55);
    }
  }

  // Section 7: Valley & Forest Section (2500m - 3000m)
  drawForestAndValley(viewLeft, viewRight) {
    const forestStart = 2500;
    const forestEnd = 3000;
    if (forestEnd < viewLeft || forestStart > viewRight) return;

    for (let x = forestStart; x < forestEnd; x += 110) {
      if (x < viewLeft || x > viewRight) continue;
      const y = this.terrain.getTerrainYAt(x);
      
      // Pine / Sal Trees in background
      this.mgGraphics.fillStyle(0x7e5109, 1); // Trunk
      this.mgGraphics.fillRect(x - 4, y - 60, 8, 60);
      this.mgGraphics.fillStyle(0x1e8449, 1); // Foliage
      this.mgGraphics.fillTriangle(x - 25, y - 50, x, y - 110, x + 25, y - 50);
      this.mgGraphics.fillTriangle(x - 20, y - 75, x, y - 125, x + 20, y - 75);
    }
  }

  // Section 8: Terai Transition Fields (3000m - 3450m)
  drawTeraiFields(viewLeft, viewRight) {
    const teraiStart = 3000;
    const teraiEnd = 3450;
    if (teraiEnd < viewLeft || teraiStart > viewRight) return;

    for (let x = teraiStart; x < teraiEnd; x += 140) {
      if (x < viewLeft || x > viewRight) continue;
      const y = this.terrain.getTerrainYAt(x);
      
      // Yellow Mustard Flower Patches / Palm Trees
      this.mgGraphics.fillStyle(0xf1c40f, 0.7);
      this.mgGraphics.fillEllipse(x, y - 10, 45, 12);
      
      // Palm / Terai Trees
      this.mgGraphics.fillStyle(0xa0522d, 1);
      this.mgGraphics.fillRect(x + 50 - 3, y - 50, 6, 50);
      this.mgGraphics.fillStyle(0x27ae60, 1);
      this.mgGraphics.fillCircle(x + 50, y - 55, 18);
    }
  }

  // Section 9: Nijgadh Finish Arch & Celebration (3450m - 3800m)
  drawNijgadhFinish(viewLeft, viewRight) {
    const finishX = 3600;
    if (finishX >= viewLeft && finishX <= viewRight) {
      const groundY = this.terrain.getTerrainYAt(finishX);
      
      // Finish Arch Columns
      this.structGraphics.fillStyle(0x2980b9, 1);
      this.structGraphics.fillRect(finishX - 60, groundY - 150, 18, 150);
      this.structGraphics.fillRect(finishX + 60, groundY - 150, 18, 150);
      
      // Checkered / Banner Top
      this.structGraphics.fillStyle(0x27ae60, 1);
      this.structGraphics.fillRect(finishX - 75, groundY - 170, 168, 24);
      this.structGraphics.fillStyle(0xffffff, 1);
      this.structGraphics.fillRect(finishX - 70, groundY - 166, 158, 16);
      
      // Finish Text Box
      this.structGraphics.fillStyle(0xc0392b, 1);
      this.structGraphics.fillRect(finishX - 50, groundY - 162, 100, 10);
    }
  }

  destroy() {
    this.bgGraphics.destroy();
    this.mgGraphics.destroy();
    this.structGraphics.destroy();
    this.fgGraphics.destroy();
  }
}

export default EnvironmentRenderer;
